import type { PhiRuntimeDataProviderKey } from "../../../../types/runtime-data-provider";
import {
  PhiTableProviderError,
  type PhiTableProviderMutationRequest,
  type PhiTableProviderMutationResult,
  type PhiTableProviderQueryRequest,
  type PhiTableProviderResourceDescriptor,
} from "../../../../types/table-widget";
import type { PhiTableProviderRegistration } from "./phi-table-provider";

export type PhiStaticTableResource = {
  descriptor: PhiTableProviderResourceDescriptor;
  rows: readonly Record<string, unknown>[];
};

function readValue(row: Record<string, unknown>, path: string) {
  return path.split(".").filter(Boolean).reduce<unknown>((current, segment) =>
    current && typeof current === "object" && !Array.isArray(current)
      ? (current as Record<string, unknown>)[segment]
      : undefined, row);
}

function compareValues(left: unknown, right: unknown) {
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left ?? "").localeCompare(String(right ?? ""));
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
    const identity = readValue(row, resource.rowIdentityPath);
    return typeof identity === "string" || typeof identity === "number"
      ? [[String(identity), row] as const]
      : [];
  }));
  const result = new Set(matches);
  for (const identity of matches) {
    let current = byIdentity.get(identity);
    const visited = new Set<string>();
    while (current) {
      const parent = readValue(current, parentPath);
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
    const identity = readValue(row, resource.rowIdentityPath);
    return typeof identity === "string" || typeof identity === "number" ? [String(identity)] : [];
  }));
  const children = new Map<string, Record<string, unknown>[]>();
  const roots: Record<string, unknown>[] = [];
  for (const row of rows) {
    const parent = readValue(row, parentPath);
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
    const identity = readValue(row, resource.rowIdentityPath);
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
      matchesFilter(readValue(row, key), filter));
    if (matchesSearch && matchesFilters) {
      const identity = readValue(row, resource.descriptor.rowIdentityPath);
      if (typeof identity === "string" || typeof identity === "number") {
        matchingIdentities.add(String(identity));
      }
    }
  }
  const visibleIdentities = preserveMatchingAncestry(rows, matchingIdentities, resource.descriptor);
  rows = rows.filter((row) => {
    const identity = readValue(row, resource.descriptor.rowIdentityPath);
    return (typeof identity === "string" || typeof identity === "number") &&
      visibleIdentities.has(String(identity));
  });
  if (request.query.sorts?.length) {
    rows.sort((left, right) => {
      for (const sort of request.query.sorts ?? []) {
        const comparison = compareValues(readValue(left, sort.key), readValue(right, sort.key));
        if (comparison !== 0) return sort.direction === "descending" ? -comparison : comparison;
      }
      return 0;
    });
  }
  rows = orderHierarchyRows(rows, resource.descriptor);
  const total = rows.length;
  const pageSize = request.query.pageSize && request.query.pageSize > 0
    ? request.query.pageSize
    : total || 1;
  const page = request.query.page && request.query.page > 0 ? request.query.page : 1;
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
