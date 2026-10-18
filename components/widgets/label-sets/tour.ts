import "server-only";

import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import {
  PHI_TOUR_WIDGET_DEFAULT_LABELS,
  type PhiTourWidgetLabels,
} from "../label-types/tour";

/**
 * Core's, not the Tour Module's: the step buttons belong to every Tour, and the Page resolution that
 * hands a Tour on translates them with it ([types/tours.ts](../../../types/tours.ts)).
 */
const PHI_TOUR_LABEL_SET = definePhiLabelSet({
  key: "widget:tour",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    next: PHI_TOUR_WIDGET_DEFAULT_LABELS.next,
    previous: PHI_TOUR_WIDGET_DEFAULT_LABELS.previous,
    finish: PHI_TOUR_WIDGET_DEFAULT_LABELS.finish,
    button: PHI_TOUR_WIDGET_DEFAULT_LABELS.button,
    start: PHI_TOUR_WIDGET_DEFAULT_LABELS.start,
  },
});

export async function getPhiTourWidgetLabels(options: PhiGlobalTranslatorOptions): Promise<PhiTourWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_TOUR_LABEL_SET);
  return {
    next: labels.next,
    previous: labels.previous,
    finish: labels.finish,
    button: labels.button,
    start: labels.start,
  };
}
