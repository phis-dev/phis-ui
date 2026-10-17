"use client";

import {
  createPhiControlOptionsProviderClient,
  type PhiControlOptionsProviderContext,
} from "../../../../components/controls/phi-options-provider";
import { PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import { requestPhiJson } from "../../../../helpers/client-json-request";

/**
 * The tags this Site's entries already carry, which is the offer a tag field picks from.
 *
 * There is no vocabulary behind it: a tag is a string on an entry, so the offer is the set of them and a
 * tag nobody carries any more leaves it by itself. Answered by the same endpoint that lists the entries --
 * it is the same question -- with one row asked for, because only the facet is wanted here.
 *
 * Offered first, so a tag in use is picked rather than spelled again: two spellings would be two tags with
 * two translations to pay for, and the store lower-cases what it is given precisely so that this list stays
 * short. A new tag is typed into the same field.
 */
const NEWS_API_PATH = "/api/site/editor/entries/news?page=1&pageSize=1";

export const PhiNewsTagsOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS.tags,
  load: async () => {
    const reply = await requestPhiJson(NEWS_API_PATH);
    if (!reply.ok) throw new Error("Failed to load the tags in use.");
    return reply.payload;
  },
  resolveLoadKey: () => "news-tags",
  resolve: (context: PhiControlOptionsProviderContext) => {
    const tags = (context.asyncData as { tags?: unknown } | null)?.tags;
    return {
      options: (Array.isArray(tags) ? tags : []).flatMap((tag) =>
        typeof tag === "string" && tag.trim() ? [{ value: tag, label: tag }] : []),
    };
  },
});
