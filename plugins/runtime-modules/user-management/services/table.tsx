"use client";

import { PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import {
  PhiTableProviderError,
  type PhiTableProviderMutationRequest,
  type PhiTableProviderQueryRequest,
  type PhiTableProviderQueryResult,
  type PhiTableProviderRecordRequest,
  type PhiTableQuery,
} from "../../../../types/table-widget";
import { createPhiTableProviderClient } from "../../../../components/widgets/client/shared/phi-table-provider";
import { PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../../../../plugins/runtime-modules/user-management/data-providers";

const API_PATH = "/api/site/admin/users";

type ApiResponse = {
  rows?: unknown;
  user?: unknown;
  sessions?: unknown;
  total?: unknown;
  siteTotal?: unknown;
  enabled?: unknown;
  siteFlagTags?: unknown;
  error?: unknown;
};

function readStringFilter(query: PhiTableQuery, key: string) {
  const value = query.filters?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function readPositiveInteger(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value !== "string") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function readRows(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (row): row is Record<string, unknown> =>
          Boolean(row) && typeof row === "object" && !Array.isArray(row),
      )
    : [];
}

async function readApiResponse(response: Response) {
  const payload = await response.json().catch(() => null) as ApiResponse | null;
  if (!response.ok) {
    throw new PhiTableProviderError(
      "request-failed",
      typeof payload?.error === "string"
        ? payload.error
        : `User Management request failed with status ${response.status}.`,
    );
  }
  return payload;
}

async function loadUsers({
  query,
  signal,
}: PhiTableProviderQueryRequest): Promise<PhiTableProviderQueryResult> {
  const params = new URLSearchParams({
    page: String(query.page && query.page > 0 ? query.page : 1),
    pageSize: String(query.pageSize && query.pageSize > 0 ? query.pageSize : 20),
  });
  const search = query.search?.trim() ?? "";
  const accountType = readStringFilter(query, "accountType");
  const enabled = readStringFilter(query, "enabled");
  if (search) params.set("search", search);
  if (accountType) params.set("accountType", accountType);
  if (enabled) params.set("enabled", enabled);
  const primarySort = query.sorts?.[0];
  if (primarySort) {
    params.set("sortKey", primarySort.key);
    params.set("sortOrder", primarySort.direction === "descending" ? "descend" : "ascend");
  }

  const result = await readApiResponse(await fetch(`${API_PATH}?${params.toString()}`, {
    cache: "no-store",
    credentials: "include",
    headers: { accept: "application/json" },
    signal,
  }));
  const rows = readRows(result?.rows);
  if (typeof result?.siteTotal !== "number" || !Number.isFinite(result.siteTotal) || result.siteTotal < 0) {
    throw new PhiTableProviderError("invalid-response", "User Management site total is invalid.");
  }
  return {
    rows,
    total: typeof result?.total === "number" && Number.isFinite(result.total)
      ? result.total
      : rows.length,
    summary: {
      siteTotal: result.siteTotal,
    },
  };
}

async function loadUserSessions({
  query,
  signal,
}: PhiTableProviderQueryRequest): Promise<PhiTableProviderQueryResult> {
  const userId = readPositiveInteger(query.filters?.userId);
  if (!userId) {
    return { rows: [], total: 0 };
  }
  const params = new URLSearchParams({
    historyUserId: String(userId),
    limit: String(query.pageSize && query.pageSize > 0 ? query.pageSize : 25),
  });
  const result = await readApiResponse(await fetch(`${API_PATH}?${params.toString()}`, {
    cache: "no-store",
    credentials: "include",
    headers: { accept: "application/json" },
    signal,
  }));
  const now = Date.now();
  const rows = readRows(result?.sessions).map((row) => {
    const revokedAt = typeof row.revokedAt === "string" ? row.revokedAt : null;
    const expiresAt = typeof row.expiresAt === "string" ? row.expiresAt : null;
    return {
      ...row,
      status: revokedAt
        ? "revoked"
        : expiresAt && Date.parse(expiresAt) <= now
          ? "expired"
          : "active",
    };
  });
  return { rows, total: rows.length };
}

async function readUserRecord({ rowIdentity, signal }: PhiTableProviderRecordRequest) {
  const userId = readPositiveInteger(rowIdentity);
  if (!userId) {
    throw new PhiTableProviderError("invalid-query", "User record reading requires a positive user id.");
  }
  const params = new URLSearchParams({ userId: String(userId) });
  const result = await readApiResponse(await fetch(`${API_PATH}?${params.toString()}`, {
    cache: "no-store",
    credentials: "include",
    headers: { accept: "application/json" },
    signal,
  }));
  if (!result?.user || typeof result.user !== "object" || Array.isArray(result.user)) {
    throw new PhiTableProviderError("invalid-response", "User record response is invalid.");
  }
  const user = result.user as Record<string, unknown>;
  return {
    ...user,
    userId: String(userId),
    roles: Array.isArray(user.roleTags) ? user.roleTags : [],
    changePassword: false,
  };
}

async function queryUserManagementTable(request: PhiTableProviderQueryRequest) {
  if (request.resourceKey === "users") return loadUsers(request);
  if (request.resourceKey === "userSessions") return loadUserSessions(request);
  throw new PhiTableProviderError(
    "resource-not-found",
    `Unknown User Management resource "${request.resourceKey}".`,
  );
}

async function mutateUser(request: PhiTableProviderMutationRequest) {
  if (request.resourceKey !== "users") {
    throw new PhiTableProviderError("invalid-resource", "Invalid User Management resource action.");
  }
  const init: RequestInit = {
    cache: "no-store",
    credentials: "include",
    headers: { accept: "application/json" },
    signal: request.signal,
  };
  let url = API_PATH;
  if (request.kind === "field") {
    if (request.fieldKey !== "enabled" || typeof request.proposedValue !== "boolean") {
      throw new PhiTableProviderError("invalid-field-value", "Only the enabled field accepts boolean edits.");
    }
    url = `${API_PATH}?userId=${encodeURIComponent(String(request.rowIdentity))}`;
    init.method = "PATCH";
    init.headers = { ...init.headers, "content-type": "application/json" };
    init.body = JSON.stringify({ enabled: request.proposedValue });
  } else if (request.kind !== "action") {
    throw new PhiTableProviderError("mutation-not-supported", "User Management does not support this Table mutation.");
  } else if (request.actionKey === "create") {
    if (!request.actionValue || typeof request.actionValue !== "object" || Array.isArray(request.actionValue)) {
      throw new PhiTableProviderError("invalid-action-value", "Create action requires user values.");
    }
    init.method = "POST";
    init.headers = { ...init.headers, "content-type": "application/json" };
    init.body = JSON.stringify(request.actionValue);
  } else if (request.actionKey === "update") {
    if (!request.actionValue || typeof request.actionValue !== "object" || Array.isArray(request.actionValue)) {
      throw new PhiTableProviderError("invalid-action-value", "Update action requires user values.");
    }
    init.method = "PUT";
    init.headers = { ...init.headers, "content-type": "application/json" };
    init.body = JSON.stringify(request.actionValue);
  } else if (request.actionKey === "delete") {
    if (request.rowIdentity == null) {
      throw new PhiTableProviderError("invalid-action-value", "Delete action requires a user row.");
    }
    url = `${API_PATH}?userId=${encodeURIComponent(String(request.rowIdentity))}`;
    init.method = "DELETE";
  } else if (request.actionKey !== "refresh") {
    throw new PhiTableProviderError("action-not-supported", `Unsupported User Management action "${request.actionKey}".`);
  }

  let result: ApiResponse | null = null;
  if (request.kind !== "action" || request.actionKey !== "refresh") {
    result = await readApiResponse(await fetch(url, init));
  }
  if (request.kind === "field") {
    if (
      typeof result?.enabled !== "boolean" ||
      !Array.isArray(result.siteFlagTags) ||
      !result.siteFlagTags.every((value) => typeof value === "string")
    ) {
      throw new PhiTableProviderError(
        "invalid-response",
        "User enabled-state response is invalid.",
      );
    }
    return {
      status: "accepted" as const,
      invalidation: "none" as const,
      canonicalValue: result.enabled,
      rowPatch: { siteFlagTags: result.siteFlagTags },
    };
  }
  return { status: "accepted" as const, invalidation: "view" as const };
}

const resources = PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_DESCRIPTORS[0].resources ?? [];

export const PhiUserManagementTableProviderClient = createPhiTableProviderClient({
  key: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.table,
  resources,
  query: queryUserManagementTable,
  readRecord: readUserRecord,
  mutate: mutateUser,
});
