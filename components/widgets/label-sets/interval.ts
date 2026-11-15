import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import { PHI_INTERVAL_DEFAULT_LABELS, type PhiIntervalLabels } from "../label-types/interval";

/**
 * The words of the `interval` value renderer. One set, not one per Widget, so that a Table and a record
 * of the same rows say "every 3 months" the same way and a translator says it once.
 */
const PHI_INTERVAL_LABEL_SET = definePhiLabelSet({
  key: "value:interval",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    day_one: PHI_INTERVAL_DEFAULT_LABELS.day.one,
    day_many: PHI_INTERVAL_DEFAULT_LABELS.day.many,
    week_one: PHI_INTERVAL_DEFAULT_LABELS.week.one,
    week_many: PHI_INTERVAL_DEFAULT_LABELS.week.many,
    month_one: PHI_INTERVAL_DEFAULT_LABELS.month.one,
    month_many: PHI_INTERVAL_DEFAULT_LABELS.month.many,
    year_one: PHI_INTERVAL_DEFAULT_LABELS.year.one,
    year_many: PHI_INTERVAL_DEFAULT_LABELS.year.many,
  },
});

export async function getPhiIntervalLabels(options: PhiGlobalTranslatorOptions): Promise<PhiIntervalLabels> {
  const labels = await getPhiLabelSet(options, PHI_INTERVAL_LABEL_SET);
  return {
    day: { one: labels.day_one, many: labels.day_many },
    week: { one: labels.week_one, many: labels.week_many },
    month: { one: labels.month_one, many: labels.month_many },
    year: { one: labels.year_one, many: labels.year_many },
  };
}
