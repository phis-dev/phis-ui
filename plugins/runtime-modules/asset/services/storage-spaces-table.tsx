"use client";

import { isPhiRecord } from "../../../../helpers/is-record";
import {
  PhiTableProviderError,
  type PhiTableProviderMutationRequest,
  type PhiTableProviderQueryRequest,
  type PhiTableProviderQueryResult,
} from "../../../../types/table-widget";
import { createPhiTableProviderClient } from "../../../../components/widgets/client/shared/phi-table-provider";
import {
  readPhiTableProviderResponse,
  type ReadPhiTableProviderResponseOptions,
} from "../../../../components/widgets/client/shared/phi-table-provider-response";
import { phiBytesToStorageSize, phiStorageSizeToBytes } from "../../../../components/forms/storage-size";
import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import { PHI_ASSET_STORAGE_SPACES_RESOURCES } from "../data-providers";

/*
 * The existing User and Group Spaces with the Profile each writes to and its own quota, read and written
 * through `/api/site/admin/media/spaces`. Sizes travel in bytes and are shown in megabytes, as every
 * quota field of the Media settings states them; an emptied quota inherits the Site default again.
 */

const API_PATH = "/api/site/admin/media/spaces";
const RESPONSE_OPTIONS: ReadPhiTableProviderResponseOptions = { subject: "Media Space" };
const KIND_BY_RESOURCE: Record<string, "user" | "group"> = { userSpaces: "user", groupSpaces: "group" };

function toRow(entry: Record<string, unknown>) {
  return {
    id: entry.id,
    owner: entry.owner,
    email: entry.email ?? null,
    storageProfileId: entry.storageProfileId == null ? null : String(entry.storageProfileId),
    quotaMegabytes: phiBytesToStorageSize(entry.quotaBytes),
    effectiveQuotaMegabytes: phiBytesToStorageSize(entry.effectiveQuotaBytes),
    usedMegabytes: phiBytesToStorageSize(entry.usedBytes),
  };
}

function readKind(resourceKey: string) {
  const kind = KIND_BY_RESOURCE[resourceKey];
  if (!kind) throw new PhiTableProviderError("resource-not-found", `Unknown Media Space resource "${resourceKey}".`);
  return kind;
}

async function querySpaces({ resourceKey, query, signal }: PhiTableProviderQueryRequest): Promise<PhiTableProviderQueryResult> {
  const kind = readKind(resourceKey);
  const params = new URLSearchParams({
    kind,
    page: String(query.page && query.page > 0 ? query.page : 1),
    pageSize: String(query.pageSize && query.pageSize > 0 ? query.pageSize : 25),
  });
  const search = query.search?.trim();
  if (search) params.set("search", search);
  const result = await readPhiTableProviderResponse<{ spaces?: unknown; total?: unknown }>(
    await fetch(`${API_PATH}?${params.toString()}`, {
      cache: "no-store",
      credentials: "include",
      headers: { accept: "application/json" },
      signal,
    }),
    RESPONSE_OPTIONS,
  );
  const rows = (Array.isArray(result?.spaces) ? result.spaces : []).filter(isPhiRecord).map(toRow);
  return { rows, total: typeof result?.total === "number" ? result.total : rows.length };
}

async function mutateSpace(request: PhiTableProviderMutationRequest) {
  readKind(request.resourceKey);
  if (request.kind !== "field") {
    throw new PhiTableProviderError("mutation-not-supported", "Media Spaces take edits of their profile and quota only.");
  }
  const spaceId = "rowIdentity" in request ? Number(request.rowIdentity) : Number.NaN;
  if (!Number.isSafeInteger(spaceId) || spaceId <= 0) {
    throw new PhiTableProviderError("invalid-query", "A Media Space edit needs the Space.");
  }
  let body: Record<string, unknown>;
  if (request.fieldKey === "storageProfileId" && typeof request.proposedValue === "string") {
    body = { storageProfileId: request.proposedValue };
  } else if (request.fieldKey === "quotaMegabytes"
    && (request.proposedValue === null || typeof request.proposedValue === "number")) {
    body = { quotaBytes: phiStorageSizeToBytes(request.proposedValue as number | null) };
  } else {
    throw new PhiTableProviderError("invalid-field-value", "Only the profile and the quota can be edited.");
  }
  await readPhiTableProviderResponse(
    await fetch(`${API_PATH}/${spaceId}`, {
      method: "PATCH",
      cache: "no-store",
      credentials: "include",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: request.signal,
    }),
    RESPONSE_OPTIONS,
  );
  // The effective quota follows from the override and the Site default, which only the server combines.
  return { status: "accepted" as const, invalidation: "view" as const, canonicalValue: request.proposedValue };
}

export const PhiMediaStorageSpacesTableProviderClient = createPhiTableProviderClient({
  key: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaStorageSpaces,
  resources: PHI_ASSET_STORAGE_SPACES_RESOURCES,
  query: querySpaces,
  mutate: mutateSpace,
});
