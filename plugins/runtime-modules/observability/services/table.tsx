"use client";

import { isPhiRecord } from "../../../../helpers/is-record";
import { PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import {
  buildPhiTablePageParams,
  createPhiTableProviderRequestInit,
  readPhiTableRows,
  readPhiTableStringFilter,
} from "../../../../components/widgets/client/shared/phi-table-provider-request";
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
  const params = buildPhiTablePageParams(query);
  const service = readPhiTableStringFilter(query, "service");
  const levels = readStringArrayFilter(query, "level");
  const event = readPhiTableStringFilter(query, "event");
  const area = readPhiTableStringFilter(query, "area");
  const since = readPhiTableStringFilter(query, "since");
  const search = query.search?.trim() ?? "";
  if (service) params.set("service", service);
  if (levels.length > 0) params.set("level", levels.join(","));
  if (event.length >= 3) params.set("event", event);
  if (area) params.set("area", area);
  if (since) params.set("since", since);
  if (search.length >= 3) params.set("q", search);

  const response = await fetch(`/api/site/admin/logs?${params.toString()}`, createPhiTableProviderRequestInit(signal));
  const payload = await response.json().catch(() => null) as LogsResponse | null;
  if (!response.ok || !payload || !Array.isArray(payload.rows)) {
    throw new PhiTableProviderError(
      "query-failed",
      typeof payload?.error === "string" ? payload.error : `Logs request failed with status ${response.status}.`,
    );
  }
  const rows = readPhiTableRows(payload.rows);
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
  const response = await fetch(
    `/api/site/admin/logs/detail?${params.toString()}`,
    createPhiTableProviderRequestInit(signal),
  );
  const payload = await response.json().catch(() => null) as { record?: unknown; error?: unknown } | null;
  if (!response.ok || !isPhiRecord(payload?.record)) {
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
