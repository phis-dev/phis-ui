import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import type { PhiTreeWidgetLabels } from "../label-types/tree";

const PHI_TREE_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:tree",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: { search: "Search", reset: "Reset", reload: "Reload", empty: "No nodes found." },
});

export async function getPhiTreeWidgetLabels(options: PhiGlobalTranslatorOptions): Promise<PhiTreeWidgetLabels> {
  return getPhiLabelSet(options, PHI_TREE_WIDGET_LABEL_SET);
}
