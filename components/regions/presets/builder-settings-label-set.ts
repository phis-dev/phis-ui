import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_BUILDER_SETTINGS_PAGE_LABEL_SET = definePhiLabelSet({
  key: "preset:builder-settings-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    page_title: "General",
    technical_title: "Technical",
    technical_description: "Runtime identity of this Builder area.",
    field_site_key: "Site key",
    field_area: "Area",
    field_base_module: "Base module",
    field_settings_path: "Settings path",
  },
});

export async function getPhiBuilderSettingsPageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_BUILDER_SETTINGS_PAGE_LABEL_SET);
  return {
    pageTitle: labels.page_title,
    sections: {
      technical: {
        title: labels.technical_title,
        description: labels.technical_description,
      },
    },
    fields: {
      siteKey: labels.field_site_key,
      area: labels.field_area,
      baseModule: labels.field_base_module,
      settingsPath: labels.field_settings_path,
    },
  };
}
