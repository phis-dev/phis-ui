"use client";

import { PhisThreadStatus } from "../../../../constants/threads";
import {
  PhiTableProviderError,
  type PhiTableProviderMutationRequest,
  type PhiTableProviderQueryRequest,
  type PhiTableProviderQueryResult,
} from "../../../../types/table-widget";
import { createPhiTableProviderClient } from "../../../../components/widgets/client/shared/phi-table-provider";
import { PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS } from "../../../../constants/thread-library-provider-keys";
import { PHI_THREADS_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../data-providers";
import { PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";

const API_PATH = "/api/site/threads";

const requestInit = (signal: AbortSignal | undefined): RequestInit => ({
  cache: "no-store",
  credentials: "include",
  headers: { accept: "application/json" },
  signal,
});

type ApiResponse = {
  rows?: unknown;
  total?: unknown;
  page?: unknown;
  pageSize?: unknown;
  error?: unknown;
  message?: unknown;
};

async function readApiResponse(response: Response) {
  const payload = await response.json().catch(() => null) as ApiResponse | null;
  if (!response.ok) {
    throw new PhiTableProviderError(
      "request-failed",
      typeof payload?.message === "string"
        ? payload.message
        : typeof payload?.error === "string"
          ? payload.error
          : `Conversation request failed with status ${response.status}.`,
    );
  }
  return payload;
}

function readIntegerFilter(query: PhiTableProviderQueryRequest["query"], key: string) {
  const value = query.filters?.[key];
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(parsed) ? parsed : null;
}

/**
 * The query as the Core route takes it.
 *
 * Three filters and a page, because that is the whole of what the route accepts. A sort the author
 * could choose in the Inspector would be a sort the answer ignores, so the resource says there is
 * nothing to sort by rather than offering a control that does nothing.
 */
function buildThreadQuery(query: PhiTableProviderQueryRequest["query"]) {
  const search = new URLSearchParams({
    page: String(query.page && query.page > 0 ? query.page : 1),
    pageSize: String(query.pageSize && query.pageSize > 0 ? query.pageSize : 25),
  });
  const kind = readIntegerFilter(query, "kind");
  const status = readIntegerFilter(query, "status");
  const unreadOnly = query.filters?.unreadOnly;
  if (kind != null) search.set("kind", String(kind));
  if (status != null) search.set("status", String(status));
  if (unreadOnly === true || unreadOnly === "1") search.set("unreadOnly", "1");
  return search;
}

/**
 * What a cell shows and what a condition reads, neither of which is a flag.
 *
 * `state` is the name a badge draws and `archived` the answer a row action asks for; the enum values
 * are strings because that is what an enum column and a condition compare against. The status itself
 * stays on the row, because the filter above is written against what the route takes.
 */
function readThreadRow(row: Record<string, unknown>) {
  const archived = row.status === PhisThreadStatus.Archived;
  return {
    ...row,
    kind: String(row.kind),
    status: String(row.status),
    archived,
    state: archived ? "archived" : row.unread === true ? "unread" : "open",
  };
}

function readRows(value: unknown) {
  return Array.isArray(value)
    ? value.filter((row): row is Record<string, unknown> =>
        Boolean(row) && typeof row === "object" && !Array.isArray(row))
    : [];
}

async function queryThreadTable({
  resourceKey,
  query,
  signal,
}: PhiTableProviderQueryRequest): Promise<PhiTableProviderQueryResult> {
  if (resourceKey !== "inbox") {
    throw new PhiTableProviderError("resource-not-found", `Unknown conversation resource "${resourceKey}".`);
  }
  const payload = await readApiResponse(
    await fetch(`${API_PATH}?${buildThreadQuery(query).toString()}`, requestInit(signal)),
  );
  const rows = readRows(payload?.rows).map(readThreadRow);
  return {
    rows,
    total: typeof payload?.total === "number" ? payload.total : rows.length,
    page: typeof payload?.page === "number" ? payload.page : undefined,
    pageSize: typeof payload?.pageSize === "number" ? payload.pageSize : undefined,
  };
}

function readThreadId(value: unknown) {
  const threadId = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isSafeInteger(threadId) || threadId <= 0) {
    throw new PhiTableProviderError("invalid-query", "A conversation action needs a conversation.");
  }
  return threadId;
}

/**
 * A status change, and then the listing again.
 *
 * The answer to a PATCH is the new status and nothing else, but what changed on screen is the row's
 * place in an order kept by last activity -- so the view is reloaded rather than the cell patched. A
 * row edited locally would be a second opinion about what the rows are, and the Provider owns that.
 */
async function mutateThreadTable(request: PhiTableProviderMutationRequest) {
  if (request.resourceKey !== "inbox") {
    throw new PhiTableProviderError("invalid-resource", `Unknown conversation resource "${request.resourceKey}".`);
  }
  if (request.kind !== "action") {
    throw new PhiTableProviderError(
      "mutation-not-supported",
      "A conversation is not edited in a cell; archiving and reopening are actions.",
    );
  }
  const status = request.actionKey === "archive"
    ? PhisThreadStatus.Archived
    : request.actionKey === "reopen"
      ? PhisThreadStatus.Open
      : null;
  if (status == null) {
    throw new PhiTableProviderError(
      "action-not-supported",
      `Unsupported conversation action "${request.actionKey}".`,
    );
  }
  const init = requestInit(request.signal);
  await readApiResponse(await fetch(`${API_PATH}/${readThreadId(request.rowIdentity)}`, {
    ...init,
    method: "PATCH",
    headers: { ...init.headers, "content-type": "application/json" },
    body: JSON.stringify({ status }),
  }));
  return { status: "accepted" as const, invalidation: "view" as const };
}

// Found by key rather than by position, the way the groups Module does it: a Module declares more than
// one Provider and the descriptor list is not an ordering anybody promised to keep.
const resources = PHI_THREADS_RUNTIME_DATA_PROVIDER_DESCRIPTORS
  .find((descriptor) => descriptor.key === PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS.inbox)?.resources ?? [];

export const PhiThreadTableProviderClient = createPhiTableProviderClient({
  key: PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS.table,
  resources,
  query: queryThreadTable,
  mutate: mutateThreadTable,
});
