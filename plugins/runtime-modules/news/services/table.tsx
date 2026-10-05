"use client";

import { useCallback, useMemo, useRef, type ReactNode } from "react";
import {
  buildPhiTablePageParams,
  createPhiTableProviderRequestInit,
  readPhiTableRows,
  readPhiTableStringFilter,
} from "../../../../components/widgets/client/shared/phi-table-provider-request";
import { readNumber } from "../../../../components/widgets/config/parser-primitives";

import {
  PhiTableProviderError,
  type PhiTableProviderMutationRequest,
  type PhiTableProviderQueryRequest,
  type PhiTableProviderQueryResult,
  type PhiTableQuery,
} from "../../../../types/table-widget";
import {
  PhiTableProviderClient,
  type PhiTableProviderRegistration,
} from "../../../../components/widgets/client/shared/phi-table-provider";
import {
  readPhiTableProviderResponse,
  type ReadPhiTableProviderResponseOptions,
} from "../../../../components/widgets/client/shared/phi-table-provider-response";
import { PHI_NEWS_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../data-providers";
import { PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS, PHI_NEWS_TABLE_RESOURCE_KEY } from "../ids";

/** The editor's own endpoints, behind the content-editing guard and the publishing one. */
const NEWS_API_PATH = "/api/site/editor/news";
const NEWS_PUBLISH_API_PATH = "/api/site/editor/news/publish";

const RESPONSE_OPTIONS: ReadPhiTableProviderResponseOptions = { subject: "News" };

type NewsApiResponse = {
  entries?: unknown;
  total?: unknown;
  page?: unknown;
  pageSize?: unknown;
  tags?: unknown;
};

/**
 * The store's status as the Table speaks it.
 *
 * `0` and `1` are `DB.md`'s vocabulary and stay in the store; a Table draws a badge, which needs a word,
 * and the status filter already sends one. Anything the release does not know keeps its number rather than
 * being read as a draft -- a status nobody recognises must not look like the least published one.
 */
function readStatusWord(status: unknown) {
  if (status === 0) return "draft";
  if (status === 1) return "published";
  return String(status ?? "");
}

function buildQueryParams(query: PhiTableQuery) {
  const params = buildPhiTablePageParams(query);
  const search = query.search?.trim() ?? "";
  if (search) params.set("search", search);
  const status = readPhiTableStringFilter(query, "status");
  // "all" is the Table's way of saying no filter, and the endpoint reads anything it does not know as none.
  if (status && status !== "all") params.set("status", status);
  return params;
}

async function loadEntries({
  query,
  signal,
}: PhiTableProviderQueryRequest): Promise<PhiTableProviderQueryResult> {
  const result = await readPhiTableProviderResponse<NewsApiResponse>(
    await fetch(`${NEWS_API_PATH}?${buildQueryParams(query).toString()}`, createPhiTableProviderRequestInit(signal)),
    RESPONSE_OPTIONS,
  );

  const rows = readPhiTableRows(result?.entries)
    .map((row) => ({ ...row, status: readStatusWord(row.status) }));
  return {
    rows,
    total: readNumber(result?.total) ?? rows.length,
    page: readNumber(result?.page) ?? 1,
    pageSize: readNumber(result?.pageSize) ?? (rows.length || 25),
    /*
     * The tags the Site already uses, answered beside the page. It is a facet rather than a second request
     * because it is the same question: what is in these entries.
     */
    facets: { tags: Array.isArray(result?.tags) ? result.tags : [] },
  };
}

/**
 * The Site's News entries for a Table, and the two things an entry can have done to it without a Form.
 *
 * Withdrawing and deleting state nothing -- no words, no dates -- so they are actions here rather than
 * Forms. Saving and publishing do state something, and they are Forms elsewhere on the page.
 *
 * A refusal keeps its reason: Core answers `409` with a sentence when a published entry is to be deleted,
 * and that sentence is what the Table shows. Disabling the action in the row as well would be a second
 * answer to the same question, drawn from a row that may be a minute old.
 */
export function PhiNewsTableProviderClient({ children }: { children: ReactNode }) {
  const recordsRef = useRef(new Map<string, Record<string, unknown>>());

  const query = useCallback(async (request: PhiTableProviderQueryRequest) => {
    if (request.resourceKey !== PHI_NEWS_TABLE_RESOURCE_KEY) {
      throw new PhiTableProviderError("resource-not-found", `Unknown News resource "${request.resourceKey}".`);
    }
    const data = await loadEntries(request);
    for (const row of data.rows) {
      recordsRef.current.set(String(row.contentId), row);
    }
    return data;
  }, []);

  const readRecord = useCallback(async ({
    rowIdentity,
  }: {
    resourceKey: string;
    rowIdentity: string | number | null;
    signal: AbortSignal;
  }) => {
    if (rowIdentity == null) {
      throw new PhiTableProviderError("record-identity-required", "A news entry identity is required.");
    }
    const record = recordsRef.current.get(String(rowIdentity));
    if (!record) {
      throw new PhiTableProviderError(
        "record-not-loaded",
        "That news entry is no longer in the current Table view. Reload the Table and try again.",
      );
    }
    return record;
  }, []);

  const mutate = useCallback(async (request: PhiTableProviderMutationRequest) => {
    if (request.kind !== "action") {
      throw new PhiTableProviderError("mutation-not-supported", "News rows are edited through the Form.");
    }
    if (request.actionKey === "refresh") {
      return { status: "accepted" as const, invalidation: "view" as const };
    }

    const contentId = Number(request.rowIdentity);
    if (!Number.isInteger(contentId) || contentId <= 0) {
      throw new PhiTableProviderError("invalid-row-identity", "That action needs a news entry.");
    }
    const params = new URLSearchParams({ contentId: String(contentId) });
    const path = request.actionKey === "withdraw"
      ? NEWS_PUBLISH_API_PATH
      : request.actionKey === "delete"
        ? NEWS_API_PATH
        : null;
    if (!path) {
      throw new PhiTableProviderError("action-not-supported", `Unsupported News action "${request.actionKey}".`);
    }

    await readPhiTableProviderResponse<NewsApiResponse>(
      await fetch(`${path}?${params.toString()}`, {
        method: "DELETE",
        cache: "no-store",
        credentials: "include",
        headers: { accept: "application/json" },
        signal: request.signal,
      }),
      RESPONSE_OPTIONS,
    );

    /*
     * `resource` rather than `view`: withdrawing changes the status and the dates, deleting removes the row,
     * and both change what the tag facet answers. Re-reading the page is cheaper than reasoning about which
     * parts of it are still true.
     */
    return { status: "accepted" as const, invalidation: "resource" as const };
  }, []);

  const registration = useMemo<PhiTableProviderRegistration>(() => ({
    key: PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS.table,
    resources: PHI_NEWS_RUNTIME_DATA_PROVIDER_DESCRIPTORS.find(
      (descriptor) => descriptor.key === PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS.table,
    )?.resources ?? [],
    query,
    readRecord,
    mutate,
  }), [mutate, query, readRecord]);

  return <PhiTableProviderClient registration={registration}>{children}</PhiTableProviderClient>;
}
