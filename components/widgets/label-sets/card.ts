import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL } from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import type { PhiBlockRuntime } from "../../../types";
import {
  PHI_CARD_WIDGET_DEFAULT_LABELS,
  type PhiCardWidgetDefaultLabels,
} from "../label-types/card";
import { buildPhiWidgetLabelTranslatorOptions } from "./runtime-options";

const PHI_CARD_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:card",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    action_label: PHI_CARD_WIDGET_DEFAULT_LABELS.actionLabel,
  },
});

/** The Card's own words in the reader's language, translated whatever the node's `NoTranslate` says. */
export async function getPhiCardWidgetLabelsForRuntime(
  runtime: Pick<PhiBlockRuntime, "locale" | "site">,
): Promise<PhiCardWidgetDefaultLabels> {
  const labels = await getPhiLabelSet(buildPhiWidgetLabelTranslatorOptions(runtime), PHI_CARD_WIDGET_LABEL_SET);
  return { actionLabel: labels.action_label };
}
