import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_COLLECTION_VIEW_WIDGET_DEFAULT_LABELS,
  type PhiCollectionViewWidgetLabels,
} from "../label-types/collection-view";

const PHI_COLLECTION_VIEW_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:collection-view",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    reorder_handle: PHI_COLLECTION_VIEW_WIDGET_DEFAULT_LABELS.reorderHandle,
    reorder_failed: definePhiMessageLabel(PHI_COLLECTION_VIEW_WIDGET_DEFAULT_LABELS.reorderFailed),
  },
});

export async function getPhiCollectionViewWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiCollectionViewWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_COLLECTION_VIEW_WIDGET_LABEL_SET);
  return { reorderHandle: labels.reorder_handle, reorderFailed: labels.reorder_failed };
}
