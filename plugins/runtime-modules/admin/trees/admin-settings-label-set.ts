import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../../gateway/tr";
import { definePhiRuntimeModuleLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../../gateway/label-set";
import { PHI_ADMIN_RUNTIME_MODULE_IDENTITY } from "../ids";

const PHI_ADMIN_SETTINGS_PAGE_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_ADMIN_RUNTIME_MODULE_IDENTITY, {
  key: "preset:admin-settings-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    page_title: "General",
    page_description: definePhiMessageLabel("Manage site identity and contact details for this site."),
  },
});

export async function getPhiAdminSettingsPageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_ADMIN_SETTINGS_PAGE_LABEL_SET);
  return {
    pageTitle: labels.page_title,
    pageDescription: labels.page_description,
  };
}
