import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_EDITOR_AREA_LABEL_SET = definePhiLabelSet({
  key: "preset:editor-area",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    dashboard: "Dashboard",
    text: "Edit text",
    translations: "Translations",
    profile: "Profile",
  },
});

export async function getPhiEditorAreaLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_EDITOR_AREA_LABEL_SET);
  return {
    dashboard: labels.dashboard,
    text: labels.text,
    translations: labels.translations,
    profile: labels.profile,
  };
}
