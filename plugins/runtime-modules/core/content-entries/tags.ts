"use client";

import {
  createPhiControlOptionsProviderClient,
  type PhiControlOptionsProviderContext,
} from "../../../../components/controls/phi-options-provider";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../../../constants/core-data-provider-keys";
import {
  isPhiContentEntryKind,
  resolvePhiContentEntryEditorApiPaths,
} from "../../../../constants/content-entry-kinds";
import { requestPhiJson } from "../../../../helpers/client-json-request";

/** The kind a tag field offers the tags of, as its `config.kind` names it; none is no offer. */
function readKind(context: Pick<PhiControlOptionsProviderContext, "sourceConfig">) {
  const kind = context.sourceConfig?.kind;
  return isPhiContentEntryKind(kind) ? kind : null;
}

/**
 * The tags one kind's entries already carry, which is the offer a tag field picks from.
 *
 * There is no vocabulary behind it: a tag is a string on an entry, so the offer is the set of them and a
 * tag nobody carries any more leaves it by itself. Answered by the same endpoint that lists the entries --
 * it is the same question -- with one row asked for, because only the facet is wanted here.
 *
 * Offered first, so a tag in use is picked rather than spelled again: two spellings would be two tags with
 * two translations to pay for, and the store lower-cases what it is given precisely so that this list stays
 * short. A new tag is typed into the same field.
 */
export const PhiContentEntryTagsOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntryTags,
  load: async (context) => {
    const kind = readKind(context);
    if (!kind) return { tags: [] };
    const reply = await requestPhiJson(`${resolvePhiContentEntryEditorApiPaths(kind).entries}?page=1&pageSize=1`);
    if (!reply.ok) throw new Error("Failed to load the tags in use.");
    return reply.payload;
  },
  resolveLoadKey: (context) => `content-entry-tags:${readKind(context) ?? ""}`,
  resolve: (context: PhiControlOptionsProviderContext) => {
    const tags = (context.asyncData as { tags?: unknown } | null)?.tags;
    return {
      options: (Array.isArray(tags) ? tags : []).flatMap((tag) =>
        typeof tag === "string" && tag.trim() ? [{ value: tag, label: tag }] : []),
    };
  },
});
