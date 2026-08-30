import "server-only";

import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import {
  PHI_SEARCH_WIDGET_DEFAULT_LABELS,
  type PhiSearchWidgetLabels,
} from "../label-types/search";

const PHI_SEARCH_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:search",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    title: PHI_SEARCH_WIDGET_DEFAULT_LABELS.title,
    placeholder: PHI_SEARCH_WIDGET_DEFAULT_LABELS.placeholder,
    aria_label: PHI_SEARCH_WIDGET_DEFAULT_LABELS.ariaLabel,
    clear_label: PHI_SEARCH_WIDGET_DEFAULT_LABELS.clearLabel,
    submit_label: PHI_SEARCH_WIDGET_DEFAULT_LABELS.submitLabel,
  },
});

export async function getPhiSearchWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiSearchWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_SEARCH_WIDGET_LABEL_SET);
  return {
    title: labels.title,
    placeholder: labels.placeholder,
    ariaLabel: labels.aria_label,
    clearLabel: labels.clear_label,
    submitLabel: labels.submit_label,
  };
}
