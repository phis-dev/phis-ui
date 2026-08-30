import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_ADMIN_SETTINGS_PAGE_LABEL_SET = definePhiLabelSet({
  key: "preset:admin-settings-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    page_title: "General",
    page_description: "Manage site identity and contact details for this site.",
  },
});

export async function getPhiAdminSettingsPageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_ADMIN_SETTINGS_PAGE_LABEL_SET);
  return {
    pageTitle: labels.page_title,
    pageDescription: labels.page_description,
  };
}
