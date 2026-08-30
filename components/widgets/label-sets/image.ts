import "server-only";

import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import {
  PHI_IMAGE_WIDGET_DEFAULT_LABELS,
  type PhiImageWidgetLabels,
} from "../label-types/image";

const PHI_IMAGE_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:image",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    empty_title: PHI_IMAGE_WIDGET_DEFAULT_LABELS.emptyTitle,
    empty_description: PHI_IMAGE_WIDGET_DEFAULT_LABELS.emptyDescription,
  },
});

export async function getPhiImageWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiImageWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_IMAGE_WIDGET_LABEL_SET);
  return {
    emptyTitle: labels.empty_title,
    emptyDescription: labels.empty_description,
  };
}
