"use client";

import { isPhiRecord } from "../../../../helpers/is-record";
import {
  buildPhiTablePageParams,
  createPhiTableProviderRequestInit,
  readPhiTableRows,
  readPhiTableStringFilter,
} from "../../../../components/widgets/client/shared/phi-table-provider-request";
import {
  readPhiTableProviderResponse,
  type ReadPhiTableProviderResponseOptions,
} from "../../../../components/widgets/client/shared/phi-table-provider-response";
import {
  createPhiTableProviderClient,
  type PhiTableProviderRegistration,
} from "../../../../components/widgets/client/shared/phi-table-provider";
import {
  PhiTableProviderError,
  type PhiTableProviderMutationRequest,
  type PhiTableProviderQueryRequest,
  type PhiTableProviderRecordRequest,
  type PhiTableQuery,
} from "../../../../types/table-widget";
import { PHI_ACCOUNTING_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../data-providers";
import { PHI_ACCOUNTING_PRODUCTS_DATA_PROVIDER_KEY, PHI_ACCOUNTING_PRODUCTS_RESOURCE_KEY } from "../ids";

const API_PATH = "/api/site/products";
const RESPONSE_OPTIONS: ReadPhiTableProviderResponseOptions = { subject: "Products" };
// What a list shows before the reader picks another size; the Page names the same number.
const DEFAULT_PAGE_SIZE = 25;
// The route's largest page, which a record read asks for to find its one product among the matches.
const RECORD_SEARCH_PAGE_SIZE = 100;
const COMMANDS = new Set(["release", "lock", "unlock"]);

/*
 * The version of each product as the terms dialog last read it (`readProductRecord`), which is what a
 * release names: the operator releases the terms they compared, and Core refuses (409) a product that has
 * moved on since -- the publisher changed its terms again while the dialog stood open. The Table's own
 * list does not write it: the dialog's record is the one the release runs from.
 */
const versionsShown = new Map<string, number>();

type Terms = {
  sale?: unknown;
  referralUrl?: unknown;
  free?: unknown;
  accountRequired?: unknown;
  parts?: unknown;
};

type DirectoryResponse = { rows?: unknown; total?: unknown };

const readParts = (value: unknown) =>
  Array.isArray(value) ? value.filter((part): part is string => typeof part === "string") : [];

function termValues(prefix: "inForce" | "pending", terms: Terms | null) {
  return {
    [`${prefix}Sale`]: terms ? terms.sale ?? null : null,
    [`${prefix}ReferralUrl`]: terms ? terms.referralUrl ?? null : null,
    [`${prefix}Free`]: terms ? terms.free === true : null,
    [`${prefix}AccountRequired`]: terms ? terms.accountRequired === true : null,
    [`${prefix}Parts`]: terms ? readParts(terms.parts) : null,
  };
}

/**
 * A directory row as the Table speaks it: Core's fields, and what the Page reads off them -- the state as
 * a lock mark, the parts as a count, whether a release waits, and the terms in force beside the terms
 * waiting. A publisher's product never released has nothing in force; its terms are what waits. The
 * Site's own product (no publisher) is always released and never waits.
 */
export function toPhiAccountingProductRow(product: Record<string, unknown>) {
  const pending = isPhiRecord(product.pendingTerms) ? product.pendingTerms as Terms : null;
  const released = product.released === true;
  const parts = readParts(product.parts);
  return {
    ...product,
    parts,
    partCount: parts.length,
    locked: product.state === "locked",
    awaitingRelease: !released || pending !== null,
    ...termValues("inForce", released ? product : null),
    ...termValues("pending", released ? pending : product),
  };
}

function readStateFilter(query: PhiTableQuery) {
  const value = query.filters?.state;
  const states = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return states.filter((state): state is string => typeof state === "string" && Boolean(state.trim()));
}

function readTotal(result: DirectoryResponse | null) {
  if (typeof result?.total !== "number" || !Number.isFinite(result.total) || result.total < 0) {
    throw new PhiTableProviderError("invalid-response", "Products total is invalid.");
  }
  return result.total;
}

async function readDirectory(params: URLSearchParams, signal: AbortSignal | undefined) {
  return readPhiTableProviderResponse<DirectoryResponse>(
    await fetch(`${API_PATH}?${params.toString()}`, createPhiTableProviderRequestInit(signal)),
    RESPONSE_OPTIONS,
  );
}

function requireResource(resourceKey: string) {
  if (resourceKey !== PHI_ACCOUNTING_PRODUCTS_RESOURCE_KEY) {
    throw new PhiTableProviderError("resource-not-found", `Unknown Accounting resource "${resourceKey}".`);
  }
}

async function queryProducts({ resourceKey, query, signal }: PhiTableProviderQueryRequest) {
  requireResource(resourceKey);
  const params = buildPhiTablePageParams(query, DEFAULT_PAGE_SIZE);
  const search = query.search?.trim() ?? "";
  if (search) params.set("q", search);
  const supplier = readPhiTableStringFilter(query, "supplier");
  if (supplier) params.set("supplier", supplier);
  const states = readStateFilter(query);
  if (states.length > 0) params.set("state", states.join(","));
  // The switch asks for those waiting; off, it asks for nothing rather than for those not waiting.
  if (query.filters?.pendingTerms === true) params.set("pendingTerms", "true");
  const result = await readDirectory(params, signal);
  return { rows: readPhiTableRows(result?.rows).map(toPhiAccountingProductRow), total: readTotal(result) };
}

/**
 * One product, read again for the record that sets its terms side by side. Core lists, it has no read of
 * one product here, so the id is searched for -- it is part of what the search reads -- and the one
 * product with exactly that id is taken from the matches.
 */
async function readProductRecord({ resourceKey, rowIdentity, signal }: PhiTableProviderRecordRequest) {
  requireResource(resourceKey);
  if (typeof rowIdentity !== "string" || !rowIdentity) {
    throw new PhiTableProviderError("record-not-found", "A product id is required.");
  }
  const params = new URLSearchParams({ q: rowIdentity, page: "1", pageSize: String(RECORD_SEARCH_PAGE_SIZE) });
  const result = await readDirectory(params, signal);
  const product = readPhiTableRows(result?.rows).find((row) => row.id === rowIdentity);
  if (!product) {
    versionsShown.delete(rowIdentity);
    throw new PhiTableProviderError("record-not-found", `The Site has no product ${rowIdentity}.`);
  }
  if (typeof product.version !== "number" || !Number.isSafeInteger(product.version) || product.version < 1) {
    throw new PhiTableProviderError("invalid-response", `Product ${rowIdentity} has no version.`);
  }
  versionsShown.set(rowIdentity, product.version);
  return toPhiAccountingProductRow(product);
}

/** The path of one operator command; the id is one segment, so its `@`, `/` and `:` are encoded. */
export function buildPhiAccountingProductCommandPath(productId: string, command: string) {
  return `${API_PATH}/${encodeURIComponent(productId)}/${command}`;
}

/*
 * The operator's three acts. Each can move the row out of what the filters show -- a lock out of the
 * active ones, a release out of those waiting -- so the view is read again rather than patched. A release
 * sends the version of the record the terms dialog shows (`versionsShown`); with none read there is
 * nothing the operator compared, and it is refused here rather than sent without one.
 */
async function mutateProducts(request: PhiTableProviderMutationRequest) {
  requireResource(request.resourceKey);
  if (request.kind !== "action" || !COMMANDS.has(request.actionKey)) {
    throw new PhiTableProviderError("mutation-not-supported", "Products are released, locked or unlocked here, never edited.");
  }
  if (typeof request.rowIdentity !== "string" || !request.rowIdentity) {
    throw new PhiTableProviderError("invalid-query", "A product id is required.");
  }
  const init = createPhiTableProviderRequestInit(request.signal);
  let body: string | undefined;
  if (request.actionKey === "release") {
    const expectedVersion = versionsShown.get(request.rowIdentity);
    if (expectedVersion === undefined) {
      throw new PhiTableProviderError("invalid-query", `The terms of ${request.rowIdentity} were not read; open them before releasing.`);
    }
    body = JSON.stringify({ expectedVersion });
  }
  await readPhiTableProviderResponse<unknown>(
    await fetch(buildPhiAccountingProductCommandPath(request.rowIdentity, request.actionKey), {
      ...init,
      method: "POST",
      ...(body === undefined ? {} : { body, headers: { ...init.headers, "content-type": "application/json" } }),
    }),
    RESPONSE_OPTIONS,
  );
  return { status: "accepted" as const, invalidation: "view" as const };
}

// Its own descriptor by key, not by position: a Provider added to the list must not take its place.
const resources = PHI_ACCOUNTING_RUNTIME_DATA_PROVIDER_DESCRIPTORS
  .find((descriptor) => descriptor.key === PHI_ACCOUNTING_PRODUCTS_DATA_PROVIDER_KEY)?.resources ?? [];

/** The registration itself, apart from the component, so the requests it makes can be read in a test. */
export const PHI_ACCOUNTING_PRODUCTS_TABLE_PROVIDER_REGISTRATION = {
  key: PHI_ACCOUNTING_PRODUCTS_DATA_PROVIDER_KEY,
  resources,
  query: queryProducts,
  readRecord: readProductRecord,
  mutate: mutateProducts,
} satisfies PhiTableProviderRegistration;

export const PhiAccountingProductsTableProviderClient = createPhiTableProviderClient(
  PHI_ACCOUNTING_PRODUCTS_TABLE_PROVIDER_REGISTRATION,
);
