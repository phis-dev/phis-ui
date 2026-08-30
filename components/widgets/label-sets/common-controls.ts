import "server-only";

import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import {
  PHI_COMMON_CONTROL_DEFAULT_LABELS,
  type PhiCommonControlActionKey,
  type PhiCommonControlLabels,
} from "../label-types/common-controls";
import type { PhiBlockRuntime } from "../../../types";
import { buildPhiWidgetLabelTranslatorOptions } from "./runtime-options";

const ACTION_KEYS = Object.keys(PHI_COMMON_CONTROL_DEFAULT_LABELS.actions) as PhiCommonControlActionKey[];

const PHI_COMMON_CONTROL_LABEL_SET = definePhiLabelSet({
  key: "widget:common-controls",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: Object.fromEntries(
    ACTION_KEYS.flatMap((key) => [
      [`action_${key}_label`, PHI_COMMON_CONTROL_DEFAULT_LABELS.actions[key].label],
      [`action_${key}_tooltip`, PHI_COMMON_CONTROL_DEFAULT_LABELS.actions[key].tooltip],
    ]),
  ),
});

export async function getPhiCommonControlLabels(options: PhiGlobalTranslatorOptions): Promise<PhiCommonControlLabels> {
  const labels = await getPhiLabelSet(options, PHI_COMMON_CONTROL_LABEL_SET);
  return {
    actions: Object.fromEntries(
      ACTION_KEYS.map((key) => [
        key,
        {
          ...PHI_COMMON_CONTROL_DEFAULT_LABELS.actions[key],
          label: labels[`action_${key}_label`],
          tooltip: labels[`action_${key}_tooltip`],
        },
      ]),
    ) as PhiCommonControlLabels["actions"],
  };
}

export function getPhiCommonControlLabelsForRuntime(
  runtime: Pick<PhiBlockRuntime, "phis" | "locale" | "site">,
) {
  return getPhiCommonControlLabels(buildPhiWidgetLabelTranslatorOptions(runtime));
}
