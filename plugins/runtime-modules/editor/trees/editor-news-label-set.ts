import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../../gateway/label-set";

/**
 * What the News page in the Editor says about itself.
 *
 * The page's own frame only. What the Table says -- its columns, its filters, its refusals -- is the
 * Widget's label set, because those words belong to the Table wherever a Site places it and not to this
 * one Page.
 */
const PHI_EDITOR_NEWS_PAGE_LABEL_SET = definePhiLabelSet({
  key: "preset:editor-news-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    page_title: "News",
    page_description: definePhiMessageLabel(
      "The Site's news entries. What a visitor reads is whatever is published and has not expired.",
    ),
    content_label: "news",
    widget_label: "news entries",
  },
});

export async function getPhiEditorNewsPageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_EDITOR_NEWS_PAGE_LABEL_SET);
  return {
    pageTitle: labels.page_title,
    pageDescription: labels.page_description,
    contentLabel: labels.content_label,
    widgetLabel: labels.widget_label,
  };
}
