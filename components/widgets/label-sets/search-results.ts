import "server-only";

import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import {
  PHI_SEARCH_RESULTS_WIDGET_DEFAULT_LABELS,
  type PhiSearchResultsWidgetLabels,
} from "../label-types/search-results";

/**
 * What the results Widget says around the hits (SEARCH.md). The hits' own words -- titles, snippets --
 * are the Pages' and arrive from Core in the page's language already.
 */
const PHI_SEARCH_RESULTS_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:search-results",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    heading: PHI_SEARCH_RESULTS_WIDGET_DEFAULT_LABELS.heading,
    count: PHI_SEARCH_RESULTS_WIDGET_DEFAULT_LABELS.count,
    count_one: PHI_SEARCH_RESULTS_WIDGET_DEFAULT_LABELS.countOne,
    empty: definePhiMessageLabel(PHI_SEARCH_RESULTS_WIDGET_DEFAULT_LABELS.empty),
    short: definePhiMessageLabel(PHI_SEARCH_RESULTS_WIDGET_DEFAULT_LABELS.short),
    idle: definePhiMessageLabel(PHI_SEARCH_RESULTS_WIDGET_DEFAULT_LABELS.idle),
    unavailable: definePhiMessageLabel(PHI_SEARCH_RESULTS_WIDGET_DEFAULT_LABELS.unavailable),
    region: PHI_SEARCH_RESULTS_WIDGET_DEFAULT_LABELS.region,
  },
});

export async function getPhiSearchResultsWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiSearchResultsWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_SEARCH_RESULTS_WIDGET_LABEL_SET);
  return {
    heading: labels.heading,
    count: labels.count,
    countOne: labels.count_one,
    empty: labels.empty,
    short: labels.short,
    idle: labels.idle,
    unavailable: labels.unavailable,
    region: labels.region,
  };
}
