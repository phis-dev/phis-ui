import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_ADMIN_LOCALES_PAGE_LABEL_SET = definePhiLabelSet({
  key: "preset:admin-locales-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    page_title: "Locales",
    page_description: "Manage site languages and site-specific translations.",
    content_label: "Locales content",
    widget_label: "Locale management",
  },
});

export async function getPhiAdminLocalesPageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_ADMIN_LOCALES_PAGE_LABEL_SET);
  return {
    pageTitle: labels.page_title,
    pageDescription: labels.page_description,
    contentLabel: labels.content_label,
    widgetLabel: labels.widget_label,
  };
}
