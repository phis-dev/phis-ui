import "server-only";

import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import {
  PHI_LENGTH_WIDGET_DEFAULT_LABELS,
  type PhiLengthWidgetLabels,
} from "../label-types/length";

const PHI_LENGTH_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:length",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    title: PHI_LENGTH_WIDGET_DEFAULT_LABELS.title,
    description: PHI_LENGTH_WIDGET_DEFAULT_LABELS.description,
    placeholder: PHI_LENGTH_WIDGET_DEFAULT_LABELS.placeholder,
  },
});

export async function getPhiLengthWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiLengthWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_LENGTH_WIDGET_LABEL_SET);
  return {
    title: labels.title,
    description: labels.description,
    placeholder: labels.placeholder,
  };
}
