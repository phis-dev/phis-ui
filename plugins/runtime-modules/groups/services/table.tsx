"use client";

import { PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import { normalizePhiGroupMembershipFlags } from "../../../../constants/site-groups";
import {
  PhiTableProviderError,
  type PhiTableProviderMutationRequest,
  type PhiTableProviderQueryRequest,
  type PhiTableProviderQueryResult,
} from "../../../../types/table-widget";
import { createPhiTableProviderClient } from "../../../../components/widgets/client/shared/phi-table-provider";
import { PHI_GROUPS_OPTIONS_REVISION } from "../services/options-revision";
import { PHI_GROUPS_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../../../../plugins/runtime-modules/groups/data-providers";

/*
 * The Site-session administration surface. `groups:v1` is the capability a Module speaks to; this is
 * the door a browser session reaches, and both end in the same typed control-plane functions.
 */
/*
 * One address for the resource; the scope says which question is being asked. `?scope=site` is every
 * group on the Site and needs Developer or Admin; the bare route is the groups this actor is in.
 */
const API_PATH = "/api/site/groups";
// Administration is the one surface that asks for retired groups: the key stays taken, so the place
// that reports a name collision has to be able to show what is holding the name.
const SITE_SCOPE_PATH = `${API_PATH}?scope=site&includeRetired=1`;
const CORE_PROVIDER_ID = "@phis/phi-server/core";

type ApiResponse = {
  rows?: unknown;
  members?: unknown;
  total?: unknown;
  error?: unknown;
  message?: unknown;
};

function readRows(value: unknown) {
  return Array.isArray(value)
    ? value.filter((row): row is Record<string, unknown> =>
        Boolean(row) && typeof row === "object" && !Array.isArray(row))
    : [];
}

function readPositiveInteger(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value !== "string") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function readApiResponse(response: Response) {
  const payload = await response.json().catch(() => null) as ApiResponse | null;
  if (!response.ok) {
    throw new PhiTableProviderError(
      "request-failed",
      typeof payload?.message === "string"
        ? payload.message
        : typeof payload?.error === "string"
          ? payload.error
          : `Groups request failed with status ${response.status}.`,
    );
  }
  return payload;
}

const requestInit = (signal: AbortSignal | undefined): RequestInit => ({
  cache: "no-store",
  credentials: "include",
  headers: { accept: "application/json" },
  signal,
});

async function loadRowsFrom(
  path: string,
  signal: AbortSignal | undefined,
  mapRow: (row: Record<string, unknown>) => Record<string, unknown> = (row) => row,
) {
  const result = await readApiResponse(await fetch(path, requestInit(signal)));
  const rows = readRows(result?.rows).map(mapRow);
  return { rows, total: typeof result?.total === "number" ? result.total : rows.length };
}

/**
 * The level is an enum in the table, and an enum value is a string. The state is the same story: the
 * answer carries a flag, and a column renders a name.
 */
const withStringLevel = (row: Record<string, unknown>) => ({
  ...row,
  membershipFlags: String(row.membershipFlags),
  state: row.retired === true ? "retired" : "active",
});

async function loadGroupMembers({
  query,
  signal,
}: PhiTableProviderQueryRequest): Promise<PhiTableProviderQueryResult> {
  const groupId = readPositiveInteger(query.filters?.groupId);
  // No group selected is an empty list, not an error: the table simply has nothing to show yet.
  if (!groupId) return { rows: [], total: 0 };
  const result = await readApiResponse(
    await fetch(`${API_PATH}?groupId=${groupId}`, requestInit(signal)),
  );
  // What this actor may do in this group, as the control plane sees it -- the interface never works it
  // out from a level of its own.
  const manages = Boolean((result as { group?: { manages?: unknown } } | null)?.group?.manages);
  const rows = readRows(result?.members).map((row) => ({
    ...row,
    groupId,
    // The row identity carries both halves, because a membership is a pair and a mutation request
    // brings nothing else with it -- a field edit has no query and an action has no row.
    membershipKey: `${groupId}:${row.userId}`,
    // The level is an enum in the table, and an enum value is a string.
    membershipFlags: String(row.membershipFlags),
    // Only a Core-owned membership is editable here; a provider contributes its own and owns it.
    local: row.sourceProviderId === CORE_PROVIDER_ID,
    manageable: manages && row.sourceProviderId === CORE_PROVIDER_ID,
  }));
  return { rows, total: rows.length };
}

async function queryGroupsTable(request: PhiTableProviderQueryRequest) {
  if (request.resourceKey === "groups") return loadRowsFrom(SITE_SCOPE_PATH, request.signal, withStringLevel);
  if (request.resourceKey === "myGroups") return loadRowsFrom(API_PATH, request.signal, withStringLevel);
  if (request.resourceKey === "groupMembers") return loadGroupMembers(request);
  throw new PhiTableProviderError(
    "resource-not-found",
    `Unknown Groups resource "${request.resourceKey}".`,
  );
}

/*
 * Every write here also moves the Module's options revision, so the Forms on the same Page stop
 * offering what was true when they first loaded. A reload of a list that did not actually change costs
 * one request; a missing one is what this removes -- and no caller has to work out which lists a
 * particular write touched.
 */
async function mutateGroups(request: PhiTableProviderMutationRequest) {
  const init: RequestInit = requestInit(request.signal);

  if (request.resourceKey === "groups" && request.kind === "action") {
    if (request.actionKey === "refresh") {
      return { status: "accepted" as const, invalidation: "view" as const };
    }
    if (request.actionKey === "create") {
      if (!request.actionValue || typeof request.actionValue !== "object" || Array.isArray(request.actionValue)) {
        throw new PhiTableProviderError("invalid-action-value", "Create action requires a key and a name.");
      }
      await readApiResponse(await fetch(API_PATH, {
        ...init,
        method: "POST",
        headers: { ...init.headers, "content-type": "application/json" },
        body: JSON.stringify(request.actionValue),
      }));
      PHI_GROUPS_OPTIONS_REVISION.bump();
      return { status: "accepted" as const, invalidation: "view" as const };
    }
    // The row actions fall through: both group resources share one implementation below.
  }

  if (request.resourceKey === "groups" || request.resourceKey === "myGroups") {
    /*
     * Retiring is a command rather than an edited value: it ends a group's service, moves every
     * member's authorization revision, and the row it acts on disappears from most lists afterwards.
     * The view is reloaded rather than patched in place for exactly that reason.
     */
    if (request.kind === "action") {
      if (request.actionKey !== "retire" && request.actionKey !== "reactivate") {
        throw new PhiTableProviderError(
          "action-not-supported",
          `Unsupported Groups action "${request.actionKey}".`,
        );
      }
      const groupId = readPositiveInteger(request.rowIdentity);
      if (!groupId) {
        throw new PhiTableProviderError("invalid-query", "Retiring a group needs the group.");
      }
      await readApiResponse(await fetch(`${API_PATH}?groupId=${groupId}`, {
        ...init,
        method: "PATCH",
        headers: { ...init.headers, "content-type": "application/json" },
        body: JSON.stringify({ retired: request.actionKey === "retire" }),
      }));
      PHI_GROUPS_OPTIONS_REVISION.bump();
      return { status: "accepted" as const, invalidation: "view" as const };
    }
    /*
     * The only editable thing about a group row is what its member list shows. It is a display
     * decision, so it goes to the group rather than to a membership -- and the row says whether this
     * actor may make it.
     */
    if (request.kind !== "field" || request.fieldKey !== "showMemberCompany") {
      throw new PhiTableProviderError(
        "mutation-not-supported",
        "Only the company display is editable here; retirement is an action.",
      );
    }
    await readApiResponse(await fetch(`${API_PATH}?groupId=${readPositiveInteger(request.rowIdentity)}`, {
      ...init,
      method: "PATCH",
      headers: { ...init.headers, "content-type": "application/json" },
      body: JSON.stringify({ showMemberCompany: request.proposedValue === true }),
    }));
    return {
      status: "accepted" as const,
      invalidation: "none" as const,
      canonicalValue: request.proposedValue === true,
    };
  }

  if (request.resourceKey !== "groupMembers") {
    throw new PhiTableProviderError("invalid-resource", "Invalid Groups resource action.");
  }

  const identity = request.kind === "field" || request.kind === "action"
    ? String(request.rowIdentity ?? "")
    : "";
  const [rawGroupId, rawUserId] = identity.split(":", 2);
  const groupId = readPositiveInteger(rawGroupId);
  const userId = readPositiveInteger(rawUserId);
  if (!groupId || !userId) {
    throw new PhiTableProviderError("invalid-query", "A membership change needs a group and a member.");
  }
  const url = `${API_PATH}?groupId=${groupId}&userId=${userId}`;

  if (request.kind === "field") {
    if (request.fieldKey !== "membershipFlags") {
      throw new PhiTableProviderError("invalid-field-value", "Only the membership level is editable here.");
    }
    const level = normalizePhiGroupMembershipFlags(Number(request.proposedValue));
    if (level == null) {
      throw new PhiTableProviderError("invalid-field-value", "Unknown membership level.");
    }
    await readApiResponse(await fetch(url, {
      ...init,
      method: "PUT",
      headers: { ...init.headers, "content-type": "application/json" },
      body: JSON.stringify({ membershipFlags: level }),
    }));
    // The level decides which groups this actor manages, and that is what one of the lists offers.
    PHI_GROUPS_OPTIONS_REVISION.bump();
    return { status: "accepted" as const, invalidation: "none" as const, canonicalValue: String(level) };
  }

  if (request.kind === "action" && request.actionKey === "delete") {
    await readApiResponse(await fetch(url, { ...init, method: "DELETE" }));
    PHI_GROUPS_OPTIONS_REVISION.bump();
    return { status: "accepted" as const, invalidation: "view" as const };
  }
  throw new PhiTableProviderError("mutation-not-supported", "Groups does not support this Table mutation.");
}

// Found by key rather than by position: the Module declares options providers alongside this one.
const resources = PHI_GROUPS_RUNTIME_DATA_PROVIDER_DESCRIPTORS
  .find((descriptor) => descriptor.key === PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.table)?.resources ?? [];

export const PhiGroupsTableProviderClient = createPhiTableProviderClient({
  key: PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.table,
  resources,
  query: queryGroupsTable,
  mutate: mutateGroups,
});
