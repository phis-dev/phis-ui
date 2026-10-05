"use client";

import { isPhiRecord } from "../../../../helpers/is-record";
import { PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import {
  createPhiTableProviderRequestInit,
  readPhiPositiveInteger,
  readPhiTableRows,
} from "../../../../components/widgets/client/shared/phi-table-provider-request";
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
import {
  readPhiTableProviderResponse,
  type ReadPhiTableProviderResponseOptions,
} from "../../../../components/widgets/client/shared/phi-table-provider-response";

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
const CORE_PROVIDER_ID = "@phis/server/core";

type ApiResponse = {
  rows?: unknown;
  members?: unknown;
  total?: unknown;
  error?: unknown;
  message?: unknown;
};

const RESPONSE_OPTIONS: ReadPhiTableProviderResponseOptions = {
  subject: "Groups",
  errorKeys: ["message", "error"],
};

async function loadRowsFrom(
  path: string,
  signal: AbortSignal | undefined,
  mapRow: (row: Record<string, unknown>) => Record<string, unknown> = (row) => row,
) {
  const result = await readPhiTableProviderResponse<ApiResponse>(
    await fetch(path, createPhiTableProviderRequestInit(signal)),
    RESPONSE_OPTIONS,
  );
  const rows = readPhiTableRows(result?.rows).map(mapRow);
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
  const groupId = readPhiPositiveInteger(query.filters?.groupId);
  // No group selected is an empty list, not an error: the table simply has nothing to show yet.
  if (!groupId) return { rows: [], total: 0 };
  const result = await readPhiTableProviderResponse<ApiResponse>(
    await fetch(`${API_PATH}?groupId=${groupId}`, createPhiTableProviderRequestInit(signal)),
    RESPONSE_OPTIONS,
  );
  // What this actor may do in this group, as the control plane sees it -- the interface never works it
  // out from a level of its own.
  const manages = Boolean((result as { group?: { manages?: unknown } } | null)?.group?.manages);
  const rows = readPhiTableRows(result?.members).map((row) => ({
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
  const init: RequestInit = createPhiTableProviderRequestInit(request.signal);

  if (request.resourceKey === "groups" && request.kind === "action") {
    if (request.actionKey === "refresh") {
      return { status: "accepted" as const, invalidation: "view" as const };
    }
    if (request.actionKey === "create") {
      if (!isPhiRecord(request.actionValue)) {
        throw new PhiTableProviderError("invalid-action-value", "Create action requires a key and a name.");
      }
      await readPhiTableProviderResponse<ApiResponse>(
        await fetch(API_PATH, {
          ...init,
          method: "POST",
          headers: { ...init.headers, "content-type": "application/json" },
          body: JSON.stringify(request.actionValue),
        }),
        RESPONSE_OPTIONS,
      );
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
      const groupId = readPhiPositiveInteger(request.rowIdentity);
      if (!groupId) {
        throw new PhiTableProviderError("invalid-query", "Retiring a group needs the group.");
      }
      await readPhiTableProviderResponse<ApiResponse>(
        await fetch(`${API_PATH}?groupId=${groupId}`, {
          ...init,
          method: "PATCH",
          headers: { ...init.headers, "content-type": "application/json" },
          body: JSON.stringify({ retired: request.actionKey === "retire" }),
        }),
        RESPONSE_OPTIONS,
      );
      PHI_GROUPS_OPTIONS_REVISION.bump();
      return { status: "accepted" as const, invalidation: "view" as const };
    }
    /*
     * What is editable about a group row is its flags: what the member list discloses, and what the
     * group does with conversations. All three go to the group rather than to a membership, and the row
     * says whether this actor may make the change.
     *
     * The names are the body's, one per call, because Core takes exactly one change at a time -- and
     * `crossGroupThreads` implies `threads` there rather than here, so a second surface cannot come to
     * a different conclusion about it. That is also why the two thread flags invalidate the view:
     * turning one on may have turned the other on, and the cell would otherwise keep showing what the
     * caller proposed instead of what Core wrote.
     */
    const EDITABLE_GROUP_FLAGS = ["showMemberCompany", "threads", "crossGroupThreads"] as const;
    // The kind first: only a field mutation has a `fieldKey` to look up at all.
    const fieldKey = request.kind === "field"
      ? EDITABLE_GROUP_FLAGS.find((key) => key === request.fieldKey)
      : undefined;
    if (request.kind !== "field" || !fieldKey) {
      throw new PhiTableProviderError(
        "mutation-not-supported",
        "Only the group flags are editable here; retirement is an action.",
      );
    }
    await readPhiTableProviderResponse<ApiResponse>(
      await fetch(`${API_PATH}?groupId=${readPhiPositiveInteger(request.rowIdentity)}`, {
        ...init,
        method: "PATCH",
        headers: { ...init.headers, "content-type": "application/json" },
        body: JSON.stringify({ [fieldKey]: request.proposedValue === true }),
      }),
      RESPONSE_OPTIONS,
    );
    if (fieldKey === "showMemberCompany") {
      return {
        status: "accepted" as const,
        invalidation: "none" as const,
        canonicalValue: request.proposedValue === true,
      };
    }
    PHI_GROUPS_OPTIONS_REVISION.bump();
    return { status: "accepted" as const, invalidation: "view" as const };
  }

  if (request.resourceKey !== "groupMembers") {
    throw new PhiTableProviderError("invalid-resource", "Invalid Groups resource action.");
  }

  const identity = request.kind === "field" || request.kind === "action"
    ? String(request.rowIdentity ?? "")
    : "";
  const [rawGroupId, rawUserId] = identity.split(":", 2);
  const groupId = readPhiPositiveInteger(rawGroupId);
  const userId = readPhiPositiveInteger(rawUserId);
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
    await readPhiTableProviderResponse<ApiResponse>(
      await fetch(url, {
        ...init,
        method: "PUT",
        headers: { ...init.headers, "content-type": "application/json" },
        body: JSON.stringify({ membershipFlags: level }),
      }),
      RESPONSE_OPTIONS,
    );
    // The level decides which groups this actor manages, and that is what one of the lists offers.
    PHI_GROUPS_OPTIONS_REVISION.bump();
    return { status: "accepted" as const, invalidation: "none" as const, canonicalValue: String(level) };
  }

  if (request.kind === "action" && request.actionKey === "delete") {
    await readPhiTableProviderResponse<ApiResponse>(
      await fetch(url, { ...init, method: "DELETE" }),
      RESPONSE_OPTIONS,
    );
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
