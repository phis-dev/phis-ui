"use client";

import {
  createPhiControlOptionsProviderClient,
  type PhiControlOptionsProviderContext,
} from "../../../../components/controls/phi-options-provider";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../../../constants/core-data-provider-keys";
import { requestPhiJson } from "../../../../helpers/client-json-request";
import { isPhiRecord } from "../../../../helpers/is-record";

/** Core's member picker route (phis-server `GET /api/site/members`). */
export const PHI_SITE_MEMBERS_PATH = "/api/site/members";

/** The one page a picker asks for: as many as the route answers at once. */
export const PHI_SITE_MEMBERS_PAGE_SIZE = 50;

/** The request for what is typed: the first page of the members whose name or address matches. */
export function resolvePhiSiteMembersRequestPath(search: string) {
  const params = new URLSearchParams({ pageSize: String(PHI_SITE_MEMBERS_PAGE_SIZE) });
  const query = search.trim();
  if (query) params.set("q", query);
  return `${PHI_SITE_MEMBERS_PATH}?${params}`;
}

/**
 * The options in an answer: the user id as text -- what a select holds -- and the name the person is
 * shown under, which Core answers as `#<id>` where they have none. A row that is not a member's (no
 * positive whole id, no name) is no option; an answer that is not `{ items }` holds none.
 */
export function readPhiSiteMembersOptions(payload: unknown) {
  const items = isPhiRecord(payload) && Array.isArray(payload.items) ? payload.items : [];
  return items.flatMap((item) => {
    if (!isPhiRecord(item)) return [];
    const { userId, displayName } = item;
    if (typeof userId !== "number" || !Number.isSafeInteger(userId) || userId <= 0) return [];
    if (typeof displayName !== "string" || !displayName.trim()) return [];
    return [{ value: String(userId), label: displayName.trim() }];
  });
}

/**
 * The Site's members as a select's options, for any Module's Form that names a person by user id.
 *
 * The search happens where the people are: what is typed goes into the request, and the route answers
 * the first page of the matches, so a person is findable on a Site with more members than one answer
 * carries. A field using it declares `loadMode: "server"` and `search: { enabled: true, minChars }` on its
 * options provider, as the Groups Module's member field does. Core decides who may ask -- the holders of
 * the Site access `accounting` or `support` -- and a refusal is a failed load, not an empty Site.
 */
export const PhiSiteMembersOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.siteMembers,
  load: async (context) => {
    const reply = await requestPhiJson(resolvePhiSiteMembersRequestPath(context.search));
    if (!reply.ok) throw new Error("Failed to load the Site's members.");
    return reply.payload;
  },
  resolveLoadKey: (context) => `core-site-members:${context.search.trim()}`,
  resolve: (context: PhiControlOptionsProviderContext) => ({ options: readPhiSiteMembersOptions(context.asyncData) }),
});
