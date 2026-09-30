import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";

/**
 * What the News list says around the entries, which is everything the Site did not write itself.
 *
 * The entries' own words come from Core already translated for the page's language, so nothing here
 * repeats them. What is left is the frame: the state where a Site has published nothing yet, and the one
 * sentence to show when the read did not come back.
 */
const PHI_NEWS_LIST_LABEL_SET = definePhiLabelSet({
  key: "widget:news-list",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    empty_title: "No news yet",
    empty_text: definePhiMessageLabel("There is nothing published here at the moment."),
    unavailable: definePhiMessageLabel("The news could not be loaded just now."),
    read_more: "Read more",
  },
});

export async function getPhiNewsListLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_NEWS_LIST_LABEL_SET);
  return {
    emptyTitle: labels.empty_title,
    emptyText: labels.empty_text,
    unavailable: labels.unavailable,
    readMore: labels.read_more,
  };
}

export type PhiNewsListLabels = Awaited<ReturnType<typeof getPhiNewsListLabels>>;
