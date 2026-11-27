"use client";

import { PhisBillingNumberSeriesFlag, type PhisBillingNumberSeries } from "@phis/contracts/billing";
import { isPhiRecord } from "../../../../helpers/is-record";
import { readPhiJsonError, requestPhiJson, type PhiJsonReply } from "../../../../helpers/client-json-request";
import { createPhiTableProviderClient } from "../../../../components/widgets/client/shared/phi-table-provider";
import {
  PhiTableProviderError,
  type PhiTableProviderMutationRequest,
  type PhiTableProviderMutationResult,
  type PhiTableProviderQueryRequest,
  type PhiTableProviderQueryResult,
  type PhiTableProviderRecordRequest,
} from "../../../../types/table-widget";
import { PHI_BILLING_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../data-providers";
import { PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS, PHI_BILLING_SERIES_RESOURCE_KEY } from "../ids";

export const PHI_BILLING_SERIES_API_PATH = "/api/site/accounting/billing-series";

function readRefusal(reply: PhiJsonReply<unknown>, subject: string) {
  return new PhiTableProviderError(
    "request-failed",
    readPhiJsonError(reply.payload, `${subject} failed with status ${reply.status}.`, ["error", "message"]),
  );
}

function isSeries(value: unknown): value is PhisBillingNumberSeries {
  return isPhiRecord(value) &&
    typeof value.id === "string" &&
    typeof value.key === "string" &&
    typeof value.label === "string" &&
    typeof value.template === "string" &&
    (value.reset === "none" || value.reset === "yearly") &&
    Array.isArray(value.kinds) &&
    Array.isArray(value.sources) &&
    typeof value.next === "string" &&
    typeof value.flags === "number";
}

/**
 * One series as the Table, its record and its Forms read it: Core's fields, its bits as the yes/no a
 * condition reads and as one state, and `replaces` -- its id under the name the replacing Form submits.
 */
export function toPhiBillingSeriesRow(series: PhisBillingNumberSeries): Record<string, unknown> {
  const closed = (series.flags & PhisBillingNumberSeriesFlag.Closed) !== 0;
  const used = (series.flags & PhisBillingNumberSeriesFlag.Used) !== 0;
  return {
    id: series.id,
    replaces: series.id,
    key: series.key,
    label: series.label,
    template: series.template,
    reset: series.reset,
    next: series.next,
    kinds: [...series.kinds],
    sources: [...series.sources],
    state: closed ? "closed" : used ? "used" : "open",
    used,
    closed,
    createdAt: series.createdAt,
    closedAt: series.closedAt,
  };
}

/** Every series of the Site, newest first, and the Add-ons a series may name (`issuers`). */
export async function loadPhiBillingSeries(signal?: AbortSignal) {
  const reply = await requestPhiJson(PHI_BILLING_SERIES_API_PATH, { ...(signal ? { signal } : {}) });
  if (!reply.ok) throw readRefusal(reply, "The number series");
  const payload = reply.payload;
  if (!isPhiRecord(payload) || !Array.isArray(payload.series) || !payload.series.every(isSeries) || !Array.isArray(payload.issuers)) {
    throw new PhiTableProviderError("invalid-response", "The number series answer is not in the shape Core states.");
  }
  return {
    series: payload.series as PhisBillingNumberSeries[],
    issuers: payload.issuers.filter((issuer): issuer is string => typeof issuer === "string"),
  };
}

function requireResource(resourceKey: string) {
  if (resourceKey !== PHI_BILLING_SERIES_RESOURCE_KEY) {
    throw new PhiTableProviderError("resource-not-found", `Unknown number series resource "${resourceKey}".`);
  }
}

async function querySeries({ resourceKey, signal }: PhiTableProviderQueryRequest): Promise<PhiTableProviderQueryResult> {
  requireResource(resourceKey);
  const { series } = await loadPhiBillingSeries(signal);
  const rows = series.map(toPhiBillingSeriesRow);
  return { rows, total: rows.length };
}

/** One series for its Forms, read again so a Form opens on what Core holds now. */
async function readSeriesRecord({ resourceKey, rowIdentity, signal }: PhiTableProviderRecordRequest) {
  requireResource(resourceKey);
  const { series } = await loadPhiBillingSeries(signal);
  const found = series.find((entry) => entry.id === rowIdentity);
  if (!found) throw new PhiTableProviderError("record-not-found", `No number series ${String(rowIdentity)}.`);
  return toPhiBillingSeriesRow(found);
}

async function mutateSeries(request: PhiTableProviderMutationRequest): Promise<PhiTableProviderMutationResult> {
  requireResource(request.resourceKey);
  if (request.kind !== "action" || request.actionKey !== "close") {
    throw new PhiTableProviderError("mutation-not-supported", "A number series is changed through its Forms and closed here.");
  }
  const id = typeof request.rowIdentity === "string" ? request.rowIdentity : "";
  if (!id) throw new PhiTableProviderError("invalid-action-value", "Close acts on one series.");
  const reply = await requestPhiJson(`${PHI_BILLING_SERIES_API_PATH}/${encodeURIComponent(id)}/close`, {
    method: "POST",
    signal: request.signal,
  });
  if (!reply.ok) throw readRefusal(reply, "Closing the series");
  return { status: "accepted", invalidation: "view" };
}

// Its own descriptor by key, not by position: a Provider added to the list must not take its place.
const resources = PHI_BILLING_RUNTIME_DATA_PROVIDER_DESCRIPTORS
  .find((descriptor) => descriptor.key === PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS.series)?.resources ?? [];

export const PhiBillingSeriesTableProviderClient = createPhiTableProviderClient({
  key: PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS.series,
  resources,
  query: querySeries,
  readRecord: readSeriesRecord,
  mutate: mutateSeries,
});
