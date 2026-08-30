import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_EDITOR_TRANSLATIONS_PAGE_LABEL_SET = definePhiLabelSet({
  key: "preset:editor-translations-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    page_title: "Translations",
    page_description: "Review and edit site-specific translations for the current site.",
    content_label: "Translations content",
    widget_label: "Translation workspace",
  },
});

export async function getPhiEditorTranslationsPageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_EDITOR_TRANSLATIONS_PAGE_LABEL_SET);
  return {
    pageTitle: labels.page_title,
    pageDescription: labels.page_description,
    contentLabel: labels.content_label,
    widgetLabel: labels.widget_label,
  };
}
