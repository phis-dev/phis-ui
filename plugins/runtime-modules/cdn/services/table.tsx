"use client";

import {
  PHIS_CDN_ADMIN_PAGE_SIZE_DEFAULT,
  PHIS_CDN_ADMIN_PAGE_SIZE_MAX,
  PhisCdnCheckObjectFlags,
  PhisCdnCheckReportFlags,
  type PhisCdnAdminFileV1,
  type PhisCdnAdminListV1,
  type PhisCdnAdminWithdrawResultV1,
  type PhisCdnAdoptRequestV1,
  type PhisCdnAdoptResultV1,
  type PhisCdnCheckReportV1,
} from "@phis/contracts/addon";
import { isPhiRecord } from "../../../../helpers/is-record";
import { readPhiJsonError, requestPhiJson, type PhiJsonReply } from "../../../../helpers/client-json-request";
import {
  PHI_CDN_RUNTIME_DATA_PROVIDER_KEYS,
  PHI_CDN_TABLE_RESOURCE_KEYS,
} from "../ids";
import {
  buildPhiTablePageParams,
  readPhiTableStringFilter,
} from "../../../../components/widgets/client/shared/phi-table-provider-request";
import { PHI_TABLE_PROVIDER_REFUSED_CODE } from "../../../../components/widgets/client/shared/phi-table-provider-refusal";
import {
  PhiTableProviderError,
  type PhiTableProviderMutationRequest,
  type PhiTableProviderMutationResult,
  type PhiTableProviderQueryRequest,
  type PhiTableProviderQueryResult,
  type PhiTableProviderRecordRequest,
} from "../../../../types/table-widget";
import { createPhiTableProviderClient } from "../../../../components/widgets/client/shared/phi-table-provider";
import { PHI_CDN_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../data-providers";
import { readPhiCdnPlatformTags } from "../platform";
import { formatPhiCdnBytes } from "../bytes";
import { PHI_CDN_TABLE_PARAM_KEYS } from "../table-params";

export const PHI_CDN_ADMIN_API_PATH = "/api/site/admin/cdn";

function readParamText(params: Record<string, unknown> | undefined, key: string, fallback: string) {
  const value = params?.[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readNoCdnText(params: Record<string, unknown> | undefined) {
  return readParamText(params, PHI_CDN_TABLE_PARAM_KEYS.noCdnText, "This Site has no CDN. The operator attaches one with phis cdn attach.");
}

/** A refusal as Core says it: `{ error: <code>, message }`; the sentence is the one the person reads. */
function readRefusal(reply: PhiJsonReply<unknown>, subject: string) {
  return new PhiTableProviderError(
    "request-failed",
    readPhiJsonError(reply.payload, `${subject} failed with status ${reply.status}.`, ["message", "error"]),
  );
}

function readErrorCode(reply: PhiJsonReply<unknown>) {
  return isPhiRecord(reply.payload) && typeof reply.payload.error === "string" ? reply.payload.error : null;
}

/** A key's three segments, each its own path segment as Core's routes take them. */
function buildFilePath(key: string) {
  const segments = key.split("/");
  if (segments.length !== 3 || segments.some((segment) => !segment)) {
    throw new PhiTableProviderError("invalid-action-value", `"${key}" is not a CDN key.`);
  }
  return `${PHI_CDN_ADMIN_API_PATH}/files/${segments.map(encodeURIComponent).join("/")}`;
}

/** One catalogue entry as the table and the record read it. */
export function toPhiCdnFileRow(file: PhisCdnAdminFileV1, locale: string): Record<string, unknown> {
  return {
    key: file.key,
    name: file.name,
    version: file.version,
    fileName: file.fileName,
    sizeBytes: file.sizeBytes,
    sizeLabel: formatPhiCdnBytes(file.sizeBytes, locale),
    storage: file.storage,
    platform: readPhiCdnPlatformTags(file.os, file.arch),
    sha256: file.sha256,
    contentType: file.contentType,
    publishedAt: file.publishedAt,
    url: file.url,
    state: file.state,
    origin: file.origin.kind === "addon" ? file.origin.addonId ?? "addon" : file.origin.kind,
    addonId: file.origin.addonId,
    actorUserId: file.origin.actorUserId,
    sourceUrl: file.origin.sourceUrl,
    withdrawDisabled: file.state !== "offered",
    deleteDisabled: file.state === "deleted",
  };
}

function isAdminFile(value: unknown): value is PhisCdnAdminFileV1 {
  return isPhiRecord(value) &&
    typeof value.key === "string" &&
    typeof value.name === "string" &&
    typeof value.version === "string" &&
    typeof value.fileName === "string" &&
    typeof value.sizeBytes === "number" &&
    typeof value.sha256 === "string" &&
    typeof value.url === "string" &&
    typeof value.state === "string" &&
    typeof value.os === "number" &&
    typeof value.arch === "number" &&
    isPhiRecord(value.origin) &&
    typeof value.origin.kind === "string";
}

function readList(value: unknown): PhisCdnAdminListV1 {
  if (
    !isPhiRecord(value) ||
    !Array.isArray(value.files) ||
    !value.files.every(isAdminFile) ||
    typeof value.total !== "number" ||
    (value.cdn !== null && !isPhiRecord(value.cdn))
  ) {
    throw new PhiTableProviderError("invalid-response", "The CDN list answer is not in the shape Core states.");
  }
  return value as unknown as PhisCdnAdminListV1;
}

/*
 * The rows this Provider answered last, by key: what a row action and the detail read are about. A row
 * action carries the row's key and nothing else, and the address to copy or the record to show is the
 * one the reader just saw.
 */
const lastRows = new Map<string, Record<string, unknown>>();

function buildListParams(query: PhiTableProviderQueryRequest["query"]) {
  const params = buildPhiTablePageParams(query, PHIS_CDN_ADMIN_PAGE_SIZE_DEFAULT);
  const pageSize = Number(params.get("pageSize"));
  if (pageSize > PHIS_CDN_ADMIN_PAGE_SIZE_MAX) params.set("pageSize", String(PHIS_CDN_ADMIN_PAGE_SIZE_MAX));
  const search = query.search?.trim() ?? "";
  const state = readPhiTableStringFilter(query, "state");
  const name = readPhiTableStringFilter(query, "name");
  if (search) params.set("q", search);
  if (state) params.set("state", state);
  if (name) params.set("name", name);
  const [sort] = query.sorts ?? [];
  if (sort && (sort.key === "publishedAt" || sort.key === "name")) {
    params.set("sort", sort.key);
    params.set("dir", sort.direction === "ascending" ? "asc" : "desc");
  }
  return params;
}

async function requestList(params: URLSearchParams, signal: AbortSignal) {
  const reply = await requestPhiJson(`${PHI_CDN_ADMIN_API_PATH}?${params.toString()}`, { signal });
  if (!reply.ok) throw readRefusal(reply, "The CDN list");
  return readList(reply.payload);
}

async function queryFiles({ query, params, locale, signal }: PhiTableProviderQueryRequest): Promise<PhiTableProviderQueryResult> {
  const list = await requestList(buildListParams(query), signal);
  // A Site without a CDN is no failure of the source: the Table says how one is attached, in its rows' place.
  if (list.cdn === null) {
    throw new PhiTableProviderError(PHI_TABLE_PROVIDER_REFUSED_CODE, readNoCdnText(params));
  }
  const rows = list.files.map((file) => toPhiCdnFileRow(file, locale));
  for (const row of rows) lastRows.set(String(row.key), row);
  return { rows, total: list.total };
}

/** What one check found, one row per finding. */
export function toPhiCdnCheckRows(report: PhisCdnCheckReportV1, locale: string): Record<string, unknown>[] {
  return [
    ...report.unrecorded.map((entry) => ({
      id: `unrecorded:${entry.key}`,
      key: entry.key,
      finding: "unrecorded",
      sizeLabel: formatPhiCdnBytes(entry.sizeBytes, locale),
      recordedLabel: null,
      reason: entry.reason,
      adoptable: (entry.flags & PhisCdnCheckObjectFlags.Adoptable) !== 0,
    })),
    ...report.missing.map((key) => ({
      id: `missing:${key}`,
      key,
      finding: "missing",
      sizeLabel: null,
      recordedLabel: null,
      reason: null,
      adoptable: false,
    })),
    ...report.sizeMismatch.map((entry) => ({
      id: `size-mismatch:${entry.key}`,
      key: entry.key,
      finding: "size-mismatch",
      sizeLabel: formatPhiCdnBytes(entry.stored, locale),
      recordedLabel: formatPhiCdnBytes(entry.recorded, locale),
      reason: null,
      adoptable: false,
    })),
  ];
}

function readCheckReport(value: unknown): PhisCdnCheckReportV1 {
  if (
    !isPhiRecord(value) ||
    typeof value.flags !== "number" ||
    typeof value.objects !== "number" ||
    typeof value.recorded !== "number" ||
    !Array.isArray(value.unrecorded) ||
    !Array.isArray(value.missing) ||
    !Array.isArray(value.sizeMismatch)
  ) {
    throw new PhiTableProviderError("invalid-response", "The CDN check answer is not in the shape Core states.");
  }
  return value as unknown as PhisCdnCheckReportV1;
}

async function queryCheck({ params, locale, signal }: PhiTableProviderQueryRequest): Promise<PhiTableProviderQueryResult> {
  const reply = await requestPhiJson(`${PHI_CDN_ADMIN_API_PATH}/check`, { method: "POST", signal });
  if (!reply.ok) {
    if (readErrorCode(reply) === "no_cdn") {
      throw new PhiTableProviderError(PHI_TABLE_PROVIDER_REFUSED_CODE, readNoCdnText(params));
    }
    throw readRefusal(reply, "The CDN check");
  }
  const report = readCheckReport(reply.payload);
  const rows = toPhiCdnCheckRows(report, locale);
  return {
    rows,
    total: rows.length,
    summary: {
      objects: report.objects,
      recorded: report.recorded,
      consistent: (report.flags & PhisCdnCheckReportFlags.Consistent) !== 0,
    },
  };
}

async function queryRows(request: PhiTableProviderQueryRequest) {
  if (request.resourceKey === PHI_CDN_TABLE_RESOURCE_KEYS.files) return await queryFiles(request);
  if (request.resourceKey === PHI_CDN_TABLE_RESOURCE_KEYS.check) return await queryCheck(request);
  throw new PhiTableProviderError("resource-not-found", `Unknown CDN resource "${request.resourceKey}".`);
}

async function readRecord({ resourceKey, rowIdentity, locale, signal }: PhiTableProviderRecordRequest) {
  if (resourceKey !== PHI_CDN_TABLE_RESOURCE_KEYS.files || typeof rowIdentity !== "string" || !rowIdentity) {
    throw new PhiTableProviderError("record-not-found", "A CDN file is read by its key.");
  }
  const shown = lastRows.get(rowIdentity);
  if (shown) return shown;
  // Not among the rows shown: the one file of that name, version and file name, whatever its state.
  const [name = "", version = "", fileName = ""] = rowIdentity.split("/");
  const list = await requestList(new URLSearchParams({ name, q: fileName, state: "all", pageSize: String(PHIS_CDN_ADMIN_PAGE_SIZE_MAX) }), signal);
  const file = list.files.find((entry) => entry.key === rowIdentity && entry.version === version);
  if (!file) {
    throw new PhiTableProviderError("record-not-found", `No CDN file "${rowIdentity}".`);
  }
  return toPhiCdnFileRow(file, locale);
}

function readMutatedFile(value: unknown) {
  const file = isPhiRecord(value) ? value.file : null;
  if (!isAdminFile(file)) {
    throw new PhiTableProviderError("invalid-response", "The CDN answer carries no file.");
  }
  return file;
}

async function copyAddress(key: string, params: Record<string, unknown> | undefined): Promise<PhiTableProviderMutationResult> {
  const url = lastRows.get(key)?.url;
  const copyFailed = readParamText(params, PHI_CDN_TABLE_PARAM_KEYS.copyFailedText, "The browser did not allow copying.");
  if (typeof url !== "string" || !url) {
    return { status: "rejected", invalidation: "none", errorCode: "copy-failed", message: copyFailed };
  }
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    return { status: "rejected", invalidation: "none", errorCode: "copy-failed", message: copyFailed };
  }
  return {
    status: "accepted",
    invalidation: "none",
    message: readParamText(params, PHI_CDN_TABLE_PARAM_KEYS.copiedText, "Address copied."),
  };
}

async function mutate(request: PhiTableProviderMutationRequest): Promise<PhiTableProviderMutationResult> {
  if (request.kind !== "action") {
    throw new PhiTableProviderError("mutation-not-supported", "The CDN table changes nothing in place.");
  }
  const key = typeof request.rowIdentity === "string" ? request.rowIdentity : "";
  if (!key) {
    throw new PhiTableProviderError("invalid-action-value", `"${request.actionKey}" acts on one file.`);
  }
  if (request.resourceKey === PHI_CDN_TABLE_RESOURCE_KEYS.check && request.actionKey === "adopt") {
    const body: PhisCdnAdoptRequestV1 = { keys: [key] };
    const reply = await requestPhiJson<PhisCdnAdoptResultV1>(`${PHI_CDN_ADMIN_API_PATH}/check/adopt`, {
      method: "POST",
      body,
      signal: request.signal,
    });
    if (!reply.ok) throw readRefusal(reply, "Adopting");
    const refused = reply.payload?.refused?.find((entry) => entry.key === key);
    if (refused) {
      return { status: "rejected", invalidation: "none", errorCode: "adopt-refused", message: refused.reason };
    }
    // The check is read again: what was found has changed.
    return { status: "accepted", invalidation: "view" };
  }
  if (request.resourceKey !== PHI_CDN_TABLE_RESOURCE_KEYS.files) {
    throw new PhiTableProviderError("action-not-supported", `Unsupported CDN action "${request.actionKey}".`);
  }
  if (request.actionKey === "copy-url") {
    return await copyAddress(key, request.params);
  }
  if (request.actionKey === "withdraw" || request.actionKey === "delete") {
    const reply = await requestPhiJson<PhisCdnAdminWithdrawResultV1>(
      request.actionKey === "withdraw" ? `${buildFilePath(key)}/withdraw` : buildFilePath(key),
      { method: request.actionKey === "withdraw" ? "POST" : "DELETE", signal: request.signal },
    );
    if (!reply.ok) throw readRefusal(reply, request.actionKey === "withdraw" ? "Withdrawing" : "Deleting");
    const file = readMutatedFile(reply.payload);
    lastRows.delete(file.key);
    // The state filter may no longer hold the row, so the view is read again rather than patched.
    return { status: "accepted", invalidation: "view" };
  }
  throw new PhiTableProviderError("action-not-supported", `Unsupported CDN action "${request.actionKey}".`);
}

// Its own descriptor by key, not by position: a Provider added to the list must not take its place.
const resources = PHI_CDN_RUNTIME_DATA_PROVIDER_DESCRIPTORS
  .find((descriptor) => descriptor.key === PHI_CDN_RUNTIME_DATA_PROVIDER_KEYS.table)?.resources ?? [];

export const PhiCdnTableProviderClient = createPhiTableProviderClient({
  key: PHI_CDN_RUNTIME_DATA_PROVIDER_KEYS.table,
  resources,
  query: queryRows,
  readRecord,
  mutate,
});

/** For tests: forget the rows answered so far. */
export function resetPhiCdnTableRowsForTests() {
  lastRows.clear();
}
