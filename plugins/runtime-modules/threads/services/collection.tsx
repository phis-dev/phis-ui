"use client";

import type {
  PhiCollectionProviderQuery,
  PhiCollectionProviderQueryRequest,
} from "../../../../types/collection-provider";
import { createPhiCollectionProviderClient } from "../../../../components/widgets/client/shared/phi-collection-provider";
import { PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS, PHI_THREAD_LIBRARY_ITEM_RENDERER_KEY }
  from "../../../../constants/thread-library-provider-keys";

function readIntegerFilter(query: PhiCollectionProviderQuery, key: string) {
  const value = query.filters?.[key];
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(parsed) ? parsed : null;
}

/**
 * The Collection query as the Core route takes it.
 *
 * Sorting is not passed on: the route answers by last activity and offers no other order. An author who
 * could choose one in the Inspector would be choosing something the answer ignores, so the Widget is
 * told there is nothing to sort by rather than being given a control that does nothing.
 */
function buildThreadQuery(query: PhiCollectionProviderQuery) {
  const search = new URLSearchParams({
    page: String(query.page && query.page > 0 ? query.page : 1),
    pageSize: String(query.pageSize && query.pageSize > 0 ? query.pageSize : 25),
  });
  const kind = readIntegerFilter(query, "kind");
  const status = readIntegerFilter(query, "status");
  const unreadOnly = query.filters?.unreadOnly;
  if (kind != null) search.set("kind", String(kind));
  if (status != null) search.set("status", String(status));
  if (unreadOnly === "1" || unreadOnly === true) search.set("unreadOnly", "1");
  return search;
}

async function queryThreadCollection(request: PhiCollectionProviderQueryRequest) {
  if (request.resourceKey !== "inbox") {
    throw new Error(`Unknown conversation collection "${request.resourceKey}".`);
  }
  try {
    const response = await fetch(`/api/site/threads?${buildThreadQuery(request.query).toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "include",
      signal: request.signal,
    });
    const payload = await response.json().catch(() => null) as {
      rows?: Record<string, unknown>[];
      total?: number;
      error?: string;
      message?: string;
    } | null;
    if (!response.ok || !payload?.rows) {
      throw new Error(
        payload?.message ?? payload?.error ?? `Conversation request failed with status ${response.status}.`,
      );
    }
    return {
      resourceKey: request.resourceKey,
      items: payload.rows.map((row) => ({ ...row })),
      total: typeof payload.total === "number" ? payload.total : payload.rows.length,
      loading: false,
      error: null,
    };
  } catch (error) {
    if (request.signal.aborted) throw error;
    return {
      resourceKey: request.resourceKey,
      items: [],
      total: 0,
      loading: false,
      error: error instanceof Error ? error.message : "Failed to load conversations.",
    };
  }
}

export const PhiThreadCollectionProviderClient = createPhiCollectionProviderClient({
  key: PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS.collection,
  query: queryThreadCollection,
  resources: [{ resourceKey: "inbox", itemRendererKey: PHI_THREAD_LIBRARY_ITEM_RENDERER_KEY }],
});
