import type { PhiRuntimeDataProviderKey } from "../../../../types/runtime-data-provider";
import { readPhiDotPath } from "../../../../helpers/dot-path";
import {
  PhiTableProviderError,
  type PhiTableProviderMutationRequest,
  type PhiTableProviderRecordRequest,
  type PhiTableProviderMutationResult,
  type PhiTableProviderQueryRequest,
  type PhiTableProviderResourceDescriptor,
  type PhiTableSortDirection,
} from "../../../../types/table-widget";
import type { PhiTableProviderRegistration } from "./phi-table-provider";

export type PhiStaticTableResource = {
  descriptor: PhiTableProviderResourceDescriptor;
  rows: readonly Record<string, unknown>[];
};

/*
 * One ordering for a column whatever its cells hold: two numbers compare as numbers, anything else as
 * text with digit runs read as numbers, so `9` sits before `10` whether it arrived as a number or a
 * string. An empty cell is not the empty string -- it has no place in the order, so it goes after
 * every value in both directions rather than first in one of them.
 */
function compareSortValues(left: unknown, right: unknown, direction: PhiTableSortDirection) {
  const leftEmpty = left == null || left === "";
  const rightEmpty = right == null || right === "";
  if (leftEmpty || rightEmpty) return leftEmpty === rightEmpty ? 0 : leftEmpty ? 1 : -1;
  const comparison = typeof left === "number" && typeof right === "number"
    ? left - right
    : String(left).localeCompare(String(right), undefined, { numeric: true });
  return direction === "descending" ? -comparison : comparison;
}

function matchesFilter(value: unknown, filter: unknown) {
  if (filter == null || filter === "" || (Array.isArray(filter) && filter.length === 0)) return true;
  return Array.isArray(filter)
    ? filter.map(String).includes(String(value ?? ""))
    : String(value ?? "") === String(filter);
}

function preserveMatchingAncestry(
  rows: readonly Record<string, unknown>[],
  matches: Set<string>,
  resource: PhiTableProviderResourceDescriptor,
) {
  const parentPath = resource.hierarchy?.parentRowIdentityPath;
  if (!parentPath) return matches;
  const byIdentity = new Map(rows.flatMap((row) => {
    const identity = readPhiDotPath(row, resource.rowIdentityPath);
    return typeof identity === "string" || typeof identity === "number"
      ? [[String(identity), row] as const]
      : [];
  }));
  const result = new Set(matches);
  for (const identity of matches) {
    let current = byIdentity.get(identity);
    const visited = new Set<string>();
    while (current) {
      const parent = readPhiDotPath(current, parentPath);
      if (typeof parent !== "string" && typeof parent !== "number") break;
      const parentIdentity = String(parent);
      if (visited.has(parentIdentity)) break;
      visited.add(parentIdentity);
      result.add(parentIdentity);
      current = byIdentity.get(parentIdentity);
    }
  }
  return result;
}

function orderHierarchyRows(
  rows: readonly Record<string, unknown>[],
  resource: PhiTableProviderResourceDescriptor,
) {
  const parentPath = resource.hierarchy?.parentRowIdentityPath;
  if (!parentPath) return [...rows];
  const identities = new Set(rows.flatMap((row) => {
    const identity = readPhiDotPath(row, resource.rowIdentityPath);
    return typeof identity === "string" || typeof identity === "number" ? [String(identity)] : [];
  }));
  const children = new Map<string, Record<string, unknown>[]>();
  const roots: Record<string, unknown>[] = [];
  for (const row of rows) {
    const parent = readPhiDotPath(row, parentPath);
    const parentIdentity = typeof parent === "string" || typeof parent === "number" ? String(parent) : null;
    if (!parentIdentity || !identities.has(parentIdentity)) {
      roots.push(row);
      continue;
    }
    const siblings = children.get(parentIdentity) ?? [];
    siblings.push(row);
    children.set(parentIdentity, siblings);
  }
  const ordered: Record<string, unknown>[] = [];
  const visited = new Set<string>();
  const append = (row: Record<string, unknown>) => {
    const identity = readPhiDotPath(row, resource.rowIdentityPath);
    const key = typeof identity === "string" || typeof identity === "number" ? String(identity) : null;
    if (!key || visited.has(key)) return;
    visited.add(key);
    ordered.push(row);
    for (const child of children.get(key) ?? []) append(child);
  };
  for (const root of roots) append(root);
  for (const row of rows) append(row);
  return ordered;
}

/**
 * One row by its identity.
 *
 * **The rows are already here, so the only thing this ever lacked was the method.** A Provider declaring
 * `recordRead` without a `readRecord` is a capability that answers nothing, and until the record Widget
 * asked for it no static resource had a reason to notice -- which is why the contract says a Site can
 * read a record without a server and, for the static path, it could not.
 */
export function readPhiStaticTableRecord(
  resource: PhiStaticTableResource,
  request: PhiTableProviderRecordRequest,
) {
  const identity = request.rowIdentity;
  if (identity == null) {
    throw new PhiTableProviderError(
      "row-not-found",
      `Static Table resource "${request.resourceKey}" was asked for a record without a row identity.`,
    );
  }
  const row = resource.rows.find((candidate) =>
    String(readPhiDotPath(candidate, resource.descriptor.rowIdentityPath) ?? "") === String(identity));
  if (!row) {
    throw new PhiTableProviderError(
      "row-not-found",
      `Static Table resource "${request.resourceKey}" has no row "${identity}".`,
    );
  }
  return { ...row };
}

export function queryPhiStaticTableResource(
  resource: PhiStaticTableResource,
  request: PhiTableProviderQueryRequest,
) {
  let rows = [...resource.rows];
  const search = request.query.search?.trim().toLocaleLowerCase();
  const matchingIdentities = new Set<string>();
  for (const row of rows) {
    const matchesSearch = !search || Object.values(row).some((value) =>
      String(value ?? "").toLocaleLowerCase().includes(search));
    const matchesFilters = Object.entries(request.query.filters ?? {}).every(([key, filter]) =>
      matchesFilter(readPhiDotPath(row, key), filter));
    if (matchesSearch && matchesFilters) {
      const identity = readPhiDotPath(row, resource.descriptor.rowIdentityPath);
      if (typeof identity === "string" || typeof identity === "number") {
        matchingIdentities.add(String(identity));
      }
    }
  }
  const visibleIdentities = preserveMatchingAncestry(rows, matchingIdentities, resource.descriptor);
  rows = rows.filter((row) => {
    const identity = readPhiDotPath(row, resource.descriptor.rowIdentityPath);
    return (typeof identity === "string" || typeof identity === "number") &&
      visibleIdentities.has(String(identity));
  });
  if (request.query.sorts?.length) {
    rows.sort((left, right) => {
      for (const sort of request.query.sorts ?? []) {
        const comparison = compareSortValues(
          readPhiDotPath(left, sort.key),
          readPhiDotPath(right, sort.key),
          sort.direction,
        );
        if (comparison !== 0) return comparison;
      }
      return 0;
    });
  }
  rows = orderHierarchyRows(rows, resource.descriptor);
  const total = rows.length;
  const pageSize = request.query.pageSize && request.query.pageSize > 0
    ? request.query.pageSize
    : total || 1;
  const requestedPage = request.query.page && request.query.page > 0 ? request.query.page : 1;
  // A page past the end -- the rows shrank under a filter, or one was deleted -- answers with the last
  // page, and says so, rather than an empty page the pager cannot explain.
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / pageSize)));
  return {
    rows: rows.slice((page - 1) * pageSize, page * pageSize),
    total,
    page,
    pageSize,
  };
}

export function createPhiStaticTableProviderRegistration({
  key,
  resources,
}: {
  key: PhiRuntimeDataProviderKey;
  resources: readonly PhiStaticTableResource[];
}): PhiTableProviderRegistration {
  return {
    key,
    resources: resources.map((resource) => resource.descriptor),
    query: async (request) => {
      const resource = resources.find((candidate) =>
        candidate.descriptor.resourceKey === request.resourceKey);
      if (!resource) {
        throw new PhiTableProviderError(
          "resource-not-found",
          `Unknown static Table resource "${request.resourceKey}".`,
        );
      }
      return queryPhiStaticTableResource(resource, request);
    },
    readRecord: async (request) => {
      const resource = resources.find((candidate) =>
        candidate.descriptor.resourceKey === request.resourceKey);
      if (!resource) {
        throw new PhiTableProviderError(
          "resource-not-found",
          `Unknown static Table resource "${request.resourceKey}".`,
        );
      }
      return readPhiStaticTableRecord(resource, request);
    },
  };
}

export type PhiVersionedStaticTableResourceSnapshot = {
  revisionId: string | number;
  version: number;
  status: "draft" | "published" | "archived";
  rows: readonly Record<string, unknown>[];
};

export type PhiVersionedStaticTableResourceStore = {
  read(input: {
    resourceKey: string;
    status: "draft" | "published";
    params?: Record<string, unknown>;
    signal: AbortSignal;
  }): Promise<PhiVersionedStaticTableResourceSnapshot>;
  mutateDraft(input: {
    resource: PhiTableProviderResourceDescriptor;
    snapshot: PhiVersionedStaticTableResourceSnapshot;
    request: PhiTableProviderMutationRequest;
  }): Promise<PhiTableProviderMutationResult>;
};

export function createPhiVersionedStaticTableProviderRegistration({
  key,
  resources,
  mode,
  store,
}: {
  key: PhiRuntimeDataProviderKey;
  resources: readonly PhiTableProviderResourceDescriptor[];
  mode: "live" | "authoring";
  store: PhiVersionedStaticTableResourceStore;
}): PhiTableProviderRegistration {
  const findResource = (resourceKey: string) => {
    const resource = resources.find((candidate) => candidate.resourceKey === resourceKey);
    if (!resource) {
      throw new PhiTableProviderError(
        "resource-not-found",
        `Unknown versioned static Table resource "${resourceKey}".`,
      );
    }
    return resource;
  };

  return {
    key,
    resources,
    query: async (request) => {
      const descriptor = findResource(request.resourceKey);
      const snapshot = await store.read({
        resourceKey: request.resourceKey,
        status: mode === "authoring" ? "draft" : "published",
        params: request.params,
        signal: request.signal,
      });
      return queryPhiStaticTableResource({ descriptor, rows: snapshot.rows }, request);
    },
    readRecord: async (request) => {
      const descriptor = findResource(request.resourceKey);
      const snapshot = await store.read({
        resourceKey: request.resourceKey,
        status: mode === "authoring" ? "draft" : "published",
        params: request.params,
        signal: request.signal,
      });
      return readPhiStaticTableRecord({ descriptor, rows: snapshot.rows }, request);
    },
    ...(mode === "authoring"
      ? {
          mutate: async (request: PhiTableProviderMutationRequest) => {
            const resource = findResource(request.resourceKey);
            const snapshot = await store.read({
              resourceKey: request.resourceKey,
              status: "draft",
              params: request.params,
              signal: request.signal,
            });
            if (snapshot.status !== "draft") {
              throw new PhiTableProviderError(
                "draft-required",
                `Static Table resource "${request.resourceKey}" did not resolve a Working Draft.`,
              );
            }
            return store.mutateDraft({ resource, snapshot, request });
          },
        }
      : {}),
  };
}
