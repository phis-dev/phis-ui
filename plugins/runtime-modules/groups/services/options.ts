"use client";

import {
  createPhiControlOptionsProviderClient,
  type PhiControlOptionsProviderContext,
} from "../../../../components/controls/phi-options-provider";
import { readPhiOptionsRevision } from "../../../../components/controls/phi-options-revision";
import { PHI_GROUPS_OPTIONS_REVISION } from "../services/options-revision";
import { PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";

/*
 * All three subscribe to the Module's revision and carry it in their load key. Subscribing alone would
 * only re-render them with what they loaded the first time; the key is what asks the route again.
 */
const revised = {
  subscribe: PHI_GROUPS_OPTIONS_REVISION.subscribe,
  getSnapshot: PHI_GROUPS_OPTIONS_REVISION.getSnapshot,
  getServerSnapshot: PHI_GROUPS_OPTIONS_REVISION.getServerSnapshot,
};

/**
 * Who and which group a membership can be written for.
 *
 * Both fetch rather than read a store: nothing on the page holds the Site's users, and a Controller
 * that loaded them would be doing something other than its job. The administration routes answer both,
 * so authority is settled where it always is -- an actor who may not read users gets no options.
 */
const CANDIDATES_PATH = "/api/site/groups/candidates";
// Same resource, different question: every group for the administration form, the actor's own for the
// App form, where naming a group they do not manage would only earn a refusal.
const GROUPS_PATH = "/api/site/groups?scope=site";
const MY_GROUPS_PATH = "/api/site/groups";

async function loadJson(path: string, failure: string) {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "include",
    headers: { accept: "application/json" },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(failure);
  return payload;
}

function readRows(value: unknown) {
  return Array.isArray((value as { rows?: unknown } | null)?.rows)
    ? ((value as { rows: unknown[] }).rows).filter(
        (row): row is Record<string, unknown> =>
          Boolean(row) && typeof row === "object" && !Array.isArray(row),
      )
    : [];
}

function readIdentity(row: Record<string, unknown>, key: string) {
  const value = row[key];
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/*
 * Candidates come from the group-manager route rather than the Site's user list, which is
 * Developer-only: a Manager has to be able to find a colleague without being an administrator. The
 * answer carries the name and the company, never the address -- and the company is what tells two
 * people of the same name apart.
 *
 * The search happens where the people are: what is typed goes into the request, so someone is findable
 * on a Site with more members than any one answer could carry. That the field is searchable, from how
 * many characters, and that the answer must not be filtered again is declared on the field itself --
 * `search` and `loadMode` on its options provider.
 *
 * The group comes from the field next to it, declared as a required dependency, so this is not asked
 * until one is chosen -- and the answer is about that group: whoever is already in it is listed but
 * not selectable, because adding them is not a thing that can happen twice.
 */
export const PhiGroupMemberCandidatesOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.memberCandidates,
  ...revised,
  load: (context) => loadJson(
    `${CANDIDATES_PATH}?limit=50`
      + `&groupId=${encodeURIComponent(String(context.dependencies.groupId ?? ""))}`
      + `${context.search ? `&q=${encodeURIComponent(context.search)}` : ""}`,
    "Failed to load the people you may add.",
  ),
  resolveLoadKey: (context) =>
    `group-member-candidates:${readPhiOptionsRevision(context)}:${context.search}`,
  resolve: (context: PhiControlOptionsProviderContext) => ({
    options: readRows(context.asyncData).flatMap((row) => {
      const value = readIdentity(row, "userId");
      if (!value) return [];
      const name = typeof row.displayName === "string" && row.displayName.trim()
        ? row.displayName.trim()
        : `#${value}`;
      const company = typeof row.companyName === "string" && row.companyName.trim()
        ? row.companyName.trim()
        : null;
      /*
       * Someone already in the group is shown but not selectable. This form adds a member; the level
       * someone already holds is changed in the cell it is read in, where that is what the control
       * means. Leaving them out entirely would be worse: a colleague you cannot find reads as an
       * error, while a name you can see but not pick says they are already there.
       */
      return [{
        value,
        label: company ? `${name} (${company})` : name,
        disabled: row.member === true,
      }];
    }),
  }),
});

/** The groups the actor is in, for a form that writes inside one of them. */
export const PhiMyGroupOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.myGroupOptions,
  ...revised,
  load: () => loadJson(MY_GROUPS_PATH, "Failed to load your groups."),
  resolveLoadKey: (context) => `my-groups:${readPhiOptionsRevision(context)}`,
  resolve: (context: PhiControlOptionsProviderContext) => ({
    options: readRows(context.asyncData).flatMap((row) => {
      const value = readIdentity(row, "id");
      // Only the groups this actor manages: naming another one would only earn a refusal.
      if (!value || row.manages !== true) return [];
      const name = typeof row.name === "string" && row.name.trim() ? row.name.trim() : `#${value}`;
      return [{ value, label: name }];
    }),
  }),
});

export const PhiGroupOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.groupOptions,
  ...revised,
  load: () => loadJson(GROUPS_PATH, "Failed to load the Site's groups."),
  resolveLoadKey: (context) => `site-groups:${readPhiOptionsRevision(context)}`,
  resolve: (context: PhiControlOptionsProviderContext) => ({
    options: readRows(context.asyncData).flatMap((row) => {
      const value = readIdentity(row, "id");
      if (!value) return [];
      const name = typeof row.name === "string" && row.name.trim() ? row.name.trim() : null;
      return [{ value, label: name ?? `#${value}` }];
    }),
  }),
});
