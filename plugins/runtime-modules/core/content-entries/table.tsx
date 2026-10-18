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
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../../../constants/core-data-provider-keys";
import {
  isPhiContentEntryKind,
  resolvePhiContentEntryEditorApiPaths,
  type PhiContentEntryKind,
} from "../../../../constants/content-entry-kinds";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../data-providers";

const RESPONSE_OPTIONS: ReadPhiTableProviderResponseOptions = { subject: "Entries" };

type EntriesApiResponse = {
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
function readStatusWord(status: unknown, submittedVersionId: unknown) {
  // Waiting for a Publisher says more than "draft" or "published": it is what somebody has to act on.
  if (submittedVersionId != null) return "submitted";
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

async function loadEntries(
  kind: PhiContentEntryKind,
  { query, signal }: PhiTableProviderQueryRequest,
): Promise<PhiTableProviderQueryResult> {
  const path = resolvePhiContentEntryEditorApiPaths(kind).entries;
  const result = await readPhiTableProviderResponse<EntriesApiResponse>(
    await fetch(`${path}?${buildQueryParams(query).toString()}`, createPhiTableProviderRequestInit(signal)),
    RESPONSE_OPTIONS,
  );

  const rows = readPhiTableRows(result?.entries)
    .map((row) => ({
      ...row,
      status: readStatusWord(row.status, row.submittedVersionId),
      // Whether the version the row shows is the one already put forward, which a second submit would repeat.
      submittedCurrent: row.submittedVersionId != null && row.submittedVersionId === row.versionId,
      // As the curation Form's selects hold them: a string, and empty for none, which is a choice there.
      authorUserId: row.authorUserId == null ? "" : String(row.authorUserId),
      categoryId: row.categoryId == null ? "" : String(row.categoryId),
    }));
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

/** The kind a request names, which is its resource key; one this release does not know is refused. */
function readResourceKind(resourceKey: string) {
  if (!isPhiContentEntryKind(resourceKey)) {
    throw new PhiTableProviderError("resource-not-found", `Unknown content entry kind "${resourceKey}".`);
  }
  return resourceKey;
}

/**
 * Every content kind's entries for a Table, one resource per kind, and the things an entry can have done to
 * it without a Form (`CONTENT_ENTRIES.md`).
 *
 * Withdrawing and deleting state nothing -- no words, no dates -- so they are actions here rather than
 * Forms. Saving and publishing do state something, and they are Forms elsewhere on the page.
 *
 * A refusal keeps its reason: Core answers `409` with a sentence when a published entry is to be deleted,
 * and that sentence is what the Table shows. Disabling the action in the row as well would be a second
 * answer to the same question, drawn from a row that may be a minute old.
 */
export function PhiContentEntriesTableProviderClient({ children }: { children: ReactNode }) {
  const recordsRef = useRef(new Map<string, Record<string, unknown>>());

  const query = useCallback(async (request: PhiTableProviderQueryRequest) => {
    const kind = readResourceKind(request.resourceKey);
    const data = await loadEntries(kind, request);
    for (const row of data.rows) {
      recordsRef.current.set(`${kind}:${String(row.contentId)}`, row);
    }
    return data;
  }, []);

  const readRecord = useCallback(async ({
    resourceKey,
    rowIdentity,
  }: {
    resourceKey: string;
    rowIdentity: string | number | null;
    signal: AbortSignal;
  }) => {
    if (rowIdentity == null) {
      throw new PhiTableProviderError("record-identity-required", "An entry identity is required.");
    }
    const record = recordsRef.current.get(`${readResourceKind(resourceKey)}:${String(rowIdentity)}`);
    if (!record) {
      throw new PhiTableProviderError(
        "record-not-loaded",
        "That entry is no longer in the current Table view. Reload the Table and try again.",
      );
    }
    return record;
  }, []);

  const mutate = useCallback(async (request: PhiTableProviderMutationRequest) => {
    if (request.kind !== "action") {
      throw new PhiTableProviderError("mutation-not-supported", "Entries are edited through the Form.");
    }
    const kind = readResourceKind(request.resourceKey);
    const paths = resolvePhiContentEntryEditorApiPaths(kind);
    if (request.actionKey === "refresh") {
      return { status: "accepted" as const, invalidation: "view" as const };
    }

    const contentId = Number(request.rowIdentity);
    if (!Number.isInteger(contentId) || contentId <= 0) {
      throw new PhiTableProviderError("invalid-row-identity", "That action needs an entry.");
    }
    if (request.actionKey === "submit") {
      /*
       * The version the row showed, named rather than implied: a submission covers what its Author saw,
       * and Core refuses one for a version somebody has written past since.
       */
      const versionId = Number(recordsRef.current.get(`${kind}:${String(contentId)}`)?.versionId);
      await readPhiTableProviderResponse<EntriesApiResponse>(
        await fetch(paths.submit, {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          headers: { accept: "application/json", "content-type": "application/json" },
          body: JSON.stringify({ contentId, versionId }),
          signal: request.signal,
        }),
        RESPONSE_OPTIONS,
      );
      return { status: "accepted" as const, invalidation: "view" as const };
    }
    const params = new URLSearchParams({ contentId: String(contentId) });
    const path = request.actionKey === "withdraw"
      ? paths.publish
      : request.actionKey === "delete"
        ? paths.entries
        : null;
    if (!path) {
      throw new PhiTableProviderError("action-not-supported", `Unsupported entry action "${request.actionKey}".`);
    }

    await readPhiTableProviderResponse<EntriesApiResponse>(
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
    key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntries,
    resources: PHI_CORE_RUNTIME_DATA_PROVIDER_DESCRIPTORS.find(
      (descriptor) => descriptor.key === PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntries,
    )?.resources ?? [],
    query,
    readRecord,
    mutate,
  }), [mutate, query, readRecord]);

  return <PhiTableProviderClient registration={registration}>{children}</PhiTableProviderClient>;
}
