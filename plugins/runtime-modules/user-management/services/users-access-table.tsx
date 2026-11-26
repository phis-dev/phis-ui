"use client";

import { isPhiRecord } from "../../../../helpers/is-record";
import {
  buildPhiTablePageParams,
  createPhiTableProviderRequestInit,
  readPhiTableRows,
  readPhiTableStringFilter,
} from "../../../../components/widgets/client/shared/phi-table-provider-request";
import {
  readPhiTableProviderResponse,
  type ReadPhiTableProviderResponseOptions,
} from "../../../../components/widgets/client/shared/phi-table-provider-response";
import {
  createPhiTableProviderClient,
  type PhiTableProviderRegistration,
} from "../../../../components/widgets/client/shared/phi-table-provider";
import {
  PhiTableProviderError,
  type PhiTableProviderMutationRequest,
  type PhiTableProviderQueryRequest,
} from "../../../../types/table-widget";
import { PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../data-providers";
import {
  PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS,
  PHI_USER_MANAGEMENT_USERS_ACCESS_RESOURCE_KEYS as RESOURCES,
} from "../ids";

/** Core's Site Admin routes for `users:v1` access (phis-server `/api/site/admin/users-access`). */
export const PHI_USERS_ACCESS_PATH = "/api/site/admin/users-access";
const RESPONSE_OPTIONS: ReadPhiTableProviderResponseOptions = { subject: "People data access" };
// The Page names the same size; the route takes up to 100.
const LOG_PAGE_SIZE = 25;

function readFields(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

/** One Add-on as the Table reads it: Core's row, with the two marks its acts are offered by. */
export function toPhiUsersAccessAddonRow(row: Record<string, unknown>) {
  const awaiting = readFields(row.awaiting);
  const granted = readFields(row.granted);
  return {
    ...row,
    addonId: typeof row.addonId === "string" ? row.addonId : "",
    fields: readFields(row.fields),
    background: readFields(row.background),
    granted,
    effective: readFields(row.effective),
    awaiting,
    hasAwaiting: awaiting.length > 0,
    hasGrant: granted.length > 0,
  };
}

/** One entry of the access log as the Table reads it; Core answers no id, so the row's place is its key. */
export function toPhiUsersAccessLogRow(row: Record<string, unknown>, index: number, page: number) {
  const actor = isPhiRecord(row.actor) && typeof row.actor.displayName === "string" ? row.actor.displayName : "";
  return {
    ...row,
    key: `${page}:${index}:${typeof row.at === "string" ? row.at : ""}`,
    actor,
    fields: readFields(row.fields),
  };
}

/** What the grant of an Add-on asks for: everything its manifest asks in the background, as the Table last read it. */
const backgroundAsked = new Map<string, string[]>();

async function readAccess(signal: AbortSignal | undefined) {
  return readPhiTableProviderResponse<{ addons?: unknown }>(
    await fetch(PHI_USERS_ACCESS_PATH, createPhiTableProviderRequestInit(signal)),
    RESPONSE_OPTIONS,
  );
}

/** The log's request: newest first, a page at a time, narrowed by subject and Add-on. */
export function buildPhiUsersAccessLogParams(query: PhiTableProviderQueryRequest["query"]) {
  const params = buildPhiTablePageParams(query, LOG_PAGE_SIZE);
  const subject = readPhiTableStringFilter(query, "subject");
  if (subject) params.set("subject", subject);
  const addonId = readPhiTableStringFilter(query, "addonId");
  if (addonId) params.set("addonId", addonId);
  return params;
}

async function queryUsersAccess({ resourceKey, query, signal }: PhiTableProviderQueryRequest) {
  if (resourceKey === RESOURCES.addons) {
    const rows = readPhiTableRows((await readAccess(signal))?.addons).map(toPhiUsersAccessAddonRow);
    backgroundAsked.clear();
    for (const row of rows) {
      if (row.addonId) backgroundAsked.set(row.addonId, row.background);
    }
    return { rows, total: rows.length };
  }
  if (resourceKey === RESOURCES.log) {
    const params = buildPhiUsersAccessLogParams(query);
    const result = await readPhiTableProviderResponse<{ items?: unknown }>(
      await fetch(`${PHI_USERS_ACCESS_PATH}/log?${params}`, createPhiTableProviderRequestInit(signal)),
      RESPONSE_OPTIONS,
    );
    const page = Number(params.get("page")) || 1;
    return { rows: readPhiTableRows(result?.items).map((row, index) => toPhiUsersAccessLogRow(row, index, page)) };
  }
  throw new PhiTableProviderError("resource-not-found", `Unknown people data access resource "${resourceKey}".`);
}

/** The address of one Add-on's grant; the id is one segment, so its `@` and `/` are encoded. */
export function buildPhiUsersAccessGrantPath(addonId: string) {
  return `${PHI_USERS_ACCESS_PATH}/${encodeURIComponent(addonId)}`;
}

async function mutateUsersAccess(request: PhiTableProviderMutationRequest) {
  const init = createPhiTableProviderRequestInit(request.signal);
  const json = (body: unknown) => ({
    ...init,
    headers: { ...init.headers, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (request.resourceKey === RESOURCES.addons && request.kind === "action") {
    const addonId = typeof request.rowIdentity === "string" ? request.rowIdentity : "";
    if (!addonId) throw new PhiTableProviderError("invalid-query", "An Add-on id is required.");
    if (request.actionKey === "grant") {
      const fields = backgroundAsked.get(addonId) ?? [];
      if (fields.length === 0) throw new PhiTableProviderError("invalid-query", `${addonId} asks for nothing in the background.`);
      await readPhiTableProviderResponse<unknown>(
        await fetch(buildPhiUsersAccessGrantPath(addonId), { ...json({ fields }), method: "PUT" }),
        RESPONSE_OPTIONS,
      );
    } else if (request.actionKey === "revoke") {
      await readPhiTableProviderResponse<unknown>(
        await fetch(buildPhiUsersAccessGrantPath(addonId), { ...init, method: "DELETE" }),
        RESPONSE_OPTIONS,
      );
    } else {
      throw new PhiTableProviderError("action-not-supported", `Unsupported people data access action "${request.actionKey}".`);
    }
    return { status: "accepted" as const, invalidation: "view" as const };
  }
  throw new PhiTableProviderError("mutation-not-supported", "This people data access change is not offered.");
}

const resources = PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_DESCRIPTORS
  .find((descriptor) => descriptor.key === PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.usersAccess)?.resources ?? [];

export const PHI_USER_MANAGEMENT_USERS_ACCESS_TABLE_PROVIDER_REGISTRATION = {
  key: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.usersAccess,
  resources,
  query: queryUsersAccess,
  mutate: mutateUsersAccess,
} satisfies PhiTableProviderRegistration;

export const PhiUserManagementUsersAccessTableProviderClient = createPhiTableProviderClient(
  PHI_USER_MANAGEMENT_USERS_ACCESS_TABLE_PROVIDER_REGISTRATION,
);
