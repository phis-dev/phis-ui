import "server-only";

import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import {
  PHI_DIMENSION_WIDGET_DEFAULT_LABELS,
  type PhiDimensionWidgetLabels,
} from "../label-types/dimension";

const PHI_DIMENSION_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:dimension",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    title: PHI_DIMENSION_WIDGET_DEFAULT_LABELS.title,
    description: PHI_DIMENSION_WIDGET_DEFAULT_LABELS.description,
    width_placeholder: PHI_DIMENSION_WIDGET_DEFAULT_LABELS.widthPlaceholder,
    height_placeholder: PHI_DIMENSION_WIDGET_DEFAULT_LABELS.heightPlaceholder,
  },
});

export async function getPhiDimensionWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiDimensionWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_DIMENSION_WIDGET_LABEL_SET);
  return {
    title: labels.title,
    description: labels.description,
    widthPlaceholder: labels.width_placeholder,
    heightPlaceholder: labels.height_placeholder,
  };
}
