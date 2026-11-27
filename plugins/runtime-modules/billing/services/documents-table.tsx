"use client";

import {
  PhisBillingDocumentFlag,
  type PhisBillingDocument,
  type PhisBillingDocumentContent,
  type PhisBillingParty,
} from "@phis/contracts/billing";
import { formatPhisMoney } from "@phis/contracts/payments";
import { isPhiRecord } from "../../../../helpers/is-record";
import { readPhiJsonError, requestPhiJson, type PhiJsonReply } from "../../../../helpers/client-json-request";
import { readPhiTableStringFilter } from "../../../../components/widgets/client/shared/phi-table-provider-request";
import { createPhiTableProviderClient } from "../../../../components/widgets/client/shared/phi-table-provider";
import {
  PhiTableProviderError,
  type PhiTableProviderMutationRequest,
  type PhiTableProviderMutationResult,
  type PhiTableProviderQueryRequest,
  type PhiTableProviderQueryResult,
  type PhiTableProviderRecordRequest,
  type PhiTableQuery,
} from "../../../../types/table-widget";
import { PHI_BILLING_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../data-providers";
import {
  PHI_BILLING_DOCUMENT_PARAM_KEYS,
  PHI_BILLING_DOCUMENT_RESOURCE_KEYS,
  PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS,
} from "../ids";

const ACCOUNT_PATH = "/api/site/account/billing-documents";
const ACCOUNTING_PATH = "/api/site/accounting/billing-documents";
// What a list shows before the reader picks another size; Core answers at most 100.
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

type ListedDocument = Omit<PhisBillingDocument, "content"> & { content?: PhisBillingDocumentContent | null };

/*
 * The numbers of the documents this Provider answered, by id: a credit note or a reminder names its
 * invoice by id (`correctsId`), and the list answers no number for it. Where the invoice was among the
 * rows read, the row says which one it belongs to.
 */
const numbersById = new Map<string, string>();

function readRefusal(reply: PhiJsonReply<unknown>, subject: string) {
  return new PhiTableProviderError(
    "request-failed",
    readPhiJsonError(reply.payload, `${subject} failed with status ${reply.status}.`, ["error", "message"]),
  );
}

function isListedDocument(value: unknown): value is ListedDocument {
  return isPhiRecord(value) &&
    typeof value.id === "string" &&
    typeof value.kind === "string" &&
    typeof value.label === "string" &&
    typeof value.issuedAt === "string" &&
    typeof value.status === "string" &&
    typeof value.flags === "number" &&
    isPhiRecord(value.issuer) &&
    isPhiRecord(value.source) &&
    isPhiRecord(value.total);
}

function readListAnswer(value: unknown) {
  if (!isPhiRecord(value) || !Array.isArray(value.documents) || !value.documents.every(isListedDocument) ||
    (value.cursor !== null && typeof value.cursor !== "string")) {
    throw new PhiTableProviderError("invalid-response", "The billing documents answer is not in the shape Core states.");
  }
  return { documents: value.documents as ListedDocument[], cursor: value.cursor as string | null };
}

/** The bits of `flags` as one tag each, for the marks a row shows. */
function readMarks(flags: number) {
  return [
    ...((flags & PhisBillingDocumentFlag.Voided) !== 0 ? ["voided"] : []),
    ...((flags & PhisBillingDocumentFlag.Credited) !== 0 ? ["credited"] : []),
    ...((flags & PhisBillingDocumentFlag.Detached) !== 0 ? ["detached"] : []),
  ];
}

function readForInvoiceText(params: Record<string, unknown> | undefined) {
  const value = params?.[PHI_BILLING_DOCUMENT_PARAM_KEYS.forInvoiceText];
  return typeof value === "string" && value.includes("%1") ? value : "For invoice %1";
}

/** One document as a row of either list: Core's list fields and what the Page reads off them. */
export function toPhiBillingDocumentRow(document: ListedDocument, params?: Record<string, unknown>): Record<string, unknown> {
  const correctsNumber = document.correctsId ? numbersById.get(document.correctsId) ?? null : null;
  return {
    id: document.id,
    kind: document.kind,
    number: document.number,
    label: document.label,
    issuerName: document.issuer.name,
    issuerKind: document.issuer.kind,
    sourceAddonId: document.source.addonId,
    consumerAddonId: document.consumerAddonId,
    reference: document.reference,
    issuedAt: document.issuedAt,
    total: document.total,
    presentment: document.presentment,
    status: document.status,
    paymentState: document.paymentState?.state ?? null,
    marks: readMarks(document.flags),
    correctsNumber,
    correctsLabel: correctsNumber ? readForInvoiceText(params).replace("%1", correctsNumber) : null,
    retainUntil: document.retainUntil,
    available: document.status === "available",
  };
}

function readFilterList(query: PhiTableQuery, key: string) {
  const value = query.filters?.[key];
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return values.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()));
}

/*
 * A day of the period filter as the instant Core compares with: its start, in UTC, and for the end the
 * start of the day after, since Core's `to` is exclusive. A full instant passes as it is.
 */
function readPeriodBound(value: string, end: boolean) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return value;
  const day = new Date(`${value}T00:00:00.000Z`);
  if (end) day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString();
}

function buildListParams(request: PhiTableProviderQueryRequest) {
  const { query, resourceKey } = request;
  const params = new URLSearchParams({
    limit: String(Math.min(MAX_PAGE_SIZE, query.pageSize && query.pageSize > 0 ? query.pageSize : DEFAULT_PAGE_SIZE)),
  });
  if (query.cursor) params.set("cursor", query.cursor);
  const kinds = readFilterList(query, "kinds");
  if (kinds.length > 0) params.set("kinds", kinds.join(","));
  if (resourceKey === PHI_BILLING_DOCUMENT_RESOURCE_KEYS.own) {
    const year = readPhiTableStringFilter(query, "year");
    if (year) params.set("year", year);
    return params;
  }
  const search = query.search?.trim() ?? "";
  if (search) params.set("q", search);
  for (const key of ["userId", "issuerKind", "issuer", "source", "paymentState"] as const) {
    const value = query.filters?.[key];
    const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
    if (text) params.set(key, text);
  }
  const statuses = readFilterList(query, "status");
  if (statuses.length > 0) params.set("status", statuses.join(","));
  const from = readPhiTableStringFilter(query, "from");
  const to = readPhiTableStringFilter(query, "to");
  if (from) params.set("from", readPeriodBound(from, false));
  if (to) params.set("to", readPeriodBound(to, true));
  return params;
}

function pathOf(resourceKey: string) {
  if (resourceKey === PHI_BILLING_DOCUMENT_RESOURCE_KEYS.own) return ACCOUNT_PATH;
  if (resourceKey === PHI_BILLING_DOCUMENT_RESOURCE_KEYS.site) return ACCOUNTING_PATH;
  throw new PhiTableProviderError("resource-not-found", `Unknown billing documents resource "${resourceKey}".`);
}

async function queryDocuments(request: PhiTableProviderQueryRequest): Promise<PhiTableProviderQueryResult> {
  const path = pathOf(request.resourceKey);
  const reply = await requestPhiJson(`${path}?${buildListParams(request).toString()}`, { signal: request.signal });
  if (!reply.ok) throw readRefusal(reply, "The billing documents");
  const { documents, cursor } = readListAnswer(reply.payload);
  for (const document of documents) if (document.number) numbersById.set(document.id, document.number);
  return { rows: documents.map((document) => toPhiBillingDocumentRow(document, request.params)), nextCursor: cursor };
}

function formatParty(party: PhisBillingParty | null) {
  if (!party) return null;
  const place = [party.postalCode, party.city].filter(Boolean).join(" ");
  return [party.name, ...party.addressLines, [place, party.country].filter(Boolean).join(", "), party.taxId]
    .filter((line): line is string => typeof line === "string" && Boolean(line.trim()))
    .join(" · ");
}

/** A line as printed: quantity, unit, description and amount, in the reader's language. */
function formatLines(content: PhisBillingDocumentContent, locale: string) {
  return content.lines.map((line) => [
    [line.quantity, line.unit].filter(Boolean).join(" "),
    line.description,
    formatPhisMoney({ currency: content.currency, minor: line.lineMinor }, locale),
  ].filter(Boolean).join(" · ")).join("\n");
}

function formatFile(file: ListedDocument["file"], locale: string) {
  if (!file) return null;
  const kilobytes = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(file.byteSize / 1024);
  return `${file.contentType === "application/pdf" ? "PDF" : "HTML"}, ${kilobytes} KB`;
}

/**
 * One document for the staff record: the list row, and what only the detail answers -- the structured
 * content written out, the file, the series it was numbered from, the invoice it refers to, the credit notes
 * and reminders that refer to it, and why it was voided.
 */
export function toPhiBillingDocumentRecord(answer: {
  document: ListedDocument;
  corrections: readonly ListedDocument[];
  corrected: ListedDocument | null;
  series: { label: string; template: string } | null;
  voidReason: string | null;
}, locale: string, params?: Record<string, unknown>): Record<string, unknown> {
  const { document } = answer;
  const content = document.content ?? null;
  const correctsNumber = answer.corrected?.number ?? null;
  return {
    ...toPhiBillingDocumentRow(document, params),
    correctsNumber,
    correctsLabel: correctsNumber ? readForInvoiceText(params).replace("%1", correctsNumber) : null,
    fileLabel: formatFile(document.file, locale),
    seriesLabel: answer.series ? `${answer.series.label} (${answer.series.template})` : null,
    voidReason: answer.voidReason,
    correctionNumbers: answer.corrections.map((entry) => entry.number ?? entry.label),
    paymentId: document.payment?.paymentId ?? null,
    subscriptionId: document.subscription?.subscriptionId ?? null,
    seller: content ? formatParty(content.seller) : null,
    buyer: content ? formatParty(content.buyer) : null,
    lines: content ? formatLines(content, locale) : null,
    dueAt: content?.payment?.dueAt ?? null,
    notes: content?.notes ?? null,
    retryable: document.status === "failed" && document.source.kind === "provider",
  };
}

async function readDocumentRecord({ resourceKey, rowIdentity, locale, params, signal }: PhiTableProviderRecordRequest) {
  if (resourceKey !== PHI_BILLING_DOCUMENT_RESOURCE_KEYS.site || typeof rowIdentity !== "string" || !rowIdentity) {
    throw new PhiTableProviderError("record-not-found", "A billing document is read by its id, in Accounting.");
  }
  const reply = await requestPhiJson(`${ACCOUNTING_PATH}/${encodeURIComponent(rowIdentity)}`, { signal });
  if (reply.status === 404) throw new PhiTableProviderError("record-not-found", `No billing document ${rowIdentity}.`);
  if (!reply.ok) throw readRefusal(reply, "The billing document");
  const payload = reply.payload;
  if (!isPhiRecord(payload) || !isListedDocument(payload.document) || !Array.isArray(payload.corrections)) {
    throw new PhiTableProviderError("invalid-response", "The billing document answer is not in the shape Core states.");
  }
  return toPhiBillingDocumentRecord({
    document: payload.document,
    corrections: payload.corrections.filter(isListedDocument),
    corrected: isListedDocument(payload.corrected) ? payload.corrected : null,
    series: isPhiRecord(payload.series) && typeof payload.series.label === "string" && typeof payload.series.template === "string"
      ? { label: payload.series.label, template: payload.series.template }
      : null,
    voidReason: typeof payload.voidReason === "string" ? payload.voidReason : null,
  }, locale, params);
}

/**
 * Open and Download: Core signs an address for the one document, valid for minutes, and the browser goes
 * there -- a file to show in a tab of its own, or one to save, which leaves the Page where it is.
 */
async function openDocument(request: PhiTableProviderMutationRequest, id: string, disposition: "inline" | "attachment") {
  const reply = await requestPhiJson<{ url?: unknown }>(`${pathOf(request.resourceKey)}/${encodeURIComponent(id)}/open`, {
    method: "POST",
    body: { disposition },
    signal: request.signal,
  });
  if (!reply.ok) throw readRefusal(reply, disposition === "inline" ? "Opening the document" : "Downloading the document");
  const url = reply.payload?.url;
  if (typeof url !== "string" || !url) {
    throw new PhiTableProviderError("invalid-response", "Core answered no address for the document.");
  }
  if (disposition === "inline") window.open(url, "_blank", "noopener,noreferrer");
  else window.location.assign(url);
  return { status: "accepted", invalidation: "none" } satisfies PhiTableProviderMutationResult;
}

async function mutateDocuments(request: PhiTableProviderMutationRequest): Promise<PhiTableProviderMutationResult> {
  if (request.kind !== "action") {
    throw new PhiTableProviderError("mutation-not-supported", "Billing documents are never edited.");
  }
  const id = typeof request.rowIdentity === "string" ? request.rowIdentity : "";
  if (!id) throw new PhiTableProviderError("invalid-action-value", `"${request.actionKey}" acts on one document.`);
  if (request.actionKey === "open") return await openDocument(request, id, "inline");
  if (request.actionKey === "download") return await openDocument(request, id, "attachment");
  if (request.actionKey === "retry" && request.resourceKey === PHI_BILLING_DOCUMENT_RESOURCE_KEYS.site) {
    const reply = await requestPhiJson(`${ACCOUNTING_PATH}/${encodeURIComponent(id)}/retry`, { method: "POST", signal: request.signal });
    if (!reply.ok) throw readRefusal(reply, "Fetching the document again");
    // Its state is another now: the list is read again rather than patched.
    return { status: "accepted", invalidation: "view" };
  }
  throw new PhiTableProviderError("action-not-supported", `Unsupported billing documents action "${request.actionKey}".`);
}

// Its own descriptor by key, not by position: a Provider added to the list must not take its place.
const resources = PHI_BILLING_RUNTIME_DATA_PROVIDER_DESCRIPTORS
  .find((descriptor) => descriptor.key === PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS.documents)?.resources ?? [];

/** The registration itself, apart from the component, so the requests it makes can be read in a test. */
export const PHI_BILLING_DOCUMENTS_TABLE_PROVIDER_REGISTRATION = {
  key: PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS.documents,
  resources,
  query: queryDocuments,
  readRecord: readDocumentRecord,
  mutate: mutateDocuments,
};

export const PhiBillingDocumentsTableProviderClient = createPhiTableProviderClient(
  PHI_BILLING_DOCUMENTS_TABLE_PROVIDER_REGISTRATION,
);
