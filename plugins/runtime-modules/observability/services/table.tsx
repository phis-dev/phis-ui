"use client";

import { PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import {
  PhiTableProviderError,
  type PhiTableProviderRecordRequest,
  type PhiTableProviderQueryRequest,
  type PhiTableQuery,
} from "../../../../types/table-widget";
import { createPhiTableProviderClient } from "../../../../components/widgets/client/shared/phi-table-provider";
import { PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../../../../plugins/runtime-modules/observability/data-providers";

type LogsResponse = {
  rows?: unknown;
  total?: unknown;
  error?: unknown;
};

function readStringFilter(query: PhiTableQuery, key: string) {
  const value = query.filters?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function readStringArrayFilter(query: PhiTableQuery, key: string) {
  const value = query.filters?.[key];
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()))
    : typeof value === "string" && value.trim()
      ? [value.trim()]
      : [];
}

async function loadRows({
  resourceKey,
  query,
  signal,
}: PhiTableProviderQueryRequest) {
  if (resourceKey !== "logs") {
    throw new PhiTableProviderError("resource-not-found", `Unknown Observability resource "${resourceKey}".`);
  }
  const params = new URLSearchParams({
    page: String(query.page && query.page > 0 ? query.page : 1),
    pageSize: String(query.pageSize && query.pageSize > 0 ? query.pageSize : 25),
  });
  const service = readStringFilter(query, "service");
  const levels = readStringArrayFilter(query, "level");
  const event = readStringFilter(query, "event");
  const area = readStringFilter(query, "area");
  const since = readStringFilter(query, "since");
  const search = query.search?.trim() ?? "";
  if (service) params.set("service", service);
  if (levels.length > 0) params.set("level", levels.join(","));
  if (event.length >= 3) params.set("event", event);
  if (area) params.set("area", area);
  if (since) params.set("since", since);
  if (search.length >= 3) params.set("q", search);

  const response = await fetch(`/api/site/admin/logs?${params.toString()}`, {
      cache: "no-store",
      credentials: "include",
      signal,
  });
  const payload = await response.json().catch(() => null) as LogsResponse | null;
  if (!response.ok || !payload || !Array.isArray(payload.rows)) {
    throw new PhiTableProviderError(
      "query-failed",
      typeof payload?.error === "string" ? payload.error : `Logs request failed with status ${response.status}.`,
    );
  }
  const rows = payload.rows.filter((row): row is Record<string, unknown> =>
    Boolean(row) && typeof row === "object" && !Array.isArray(row));
  return {
    rows,
    total: typeof payload.total === "number" && Number.isFinite(payload.total) ? payload.total : rows.length,
  };
}

async function readRecord({
  resourceKey,
  rowIdentity,
  signal,
}: PhiTableProviderRecordRequest) {
  if (resourceKey !== "logs" || rowIdentity == null) {
    throw new PhiTableProviderError("record-not-found", "A valid Observability log identity is required.");
  }
  const params = new URLSearchParams({ id: String(rowIdentity) });
  const response = await fetch(`/api/site/admin/logs/detail?${params.toString()}`, {
    cache: "no-store",
    credentials: "include",
    signal,
  });
  const payload = await response.json().catch(() => null) as { record?: unknown; error?: unknown } | null;
  if (!response.ok || !payload?.record || typeof payload.record !== "object" || Array.isArray(payload.record)) {
    throw new PhiTableProviderError(
      "record-read-failed",
      typeof payload?.error === "string" ? payload.error : `Log detail request failed with status ${response.status}.`,
    );
  }
  return payload.record as Record<string, unknown>;
}

const resources = PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_DESCRIPTORS[0].resources ?? [];

export const PhiObservabilityTableProviderClient = createPhiTableProviderClient({
  key: PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_KEYS.table,
  resources,
  query: loadRows,
  readRecord,
});
