import "server-only";

import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_COLOR_PICKER_DEFAULT_LABELS,
  type PhiColorPickerLabels,
} from "../label-types/color-picker";
import type { PhiBlockRuntime } from "../../../types";
import { buildPhiWidgetLabelTranslatorOptions } from "./runtime-options";

const PHI_COLOR_PICKER_LABEL_SET = definePhiLabelSet({
  key: "widget:color-picker",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    custom: PHI_COLOR_PICKER_DEFAULT_LABELS.custom,
    color_primary: PHI_COLOR_PICKER_DEFAULT_LABELS.colors.primary,
    color_text: PHI_COLOR_PICKER_DEFAULT_LABELS.colors.text,
    color_red: PHI_COLOR_PICKER_DEFAULT_LABELS.colors.red,
    color_volcano: PHI_COLOR_PICKER_DEFAULT_LABELS.colors.volcano,
    color_orange: PHI_COLOR_PICKER_DEFAULT_LABELS.colors.orange,
    color_gold: PHI_COLOR_PICKER_DEFAULT_LABELS.colors.gold,
    color_yellow: PHI_COLOR_PICKER_DEFAULT_LABELS.colors.yellow,
    color_lime: PHI_COLOR_PICKER_DEFAULT_LABELS.colors.lime,
    color_green: PHI_COLOR_PICKER_DEFAULT_LABELS.colors.green,
    color_cyan: PHI_COLOR_PICKER_DEFAULT_LABELS.colors.cyan,
    color_blue: PHI_COLOR_PICKER_DEFAULT_LABELS.colors.blue,
    color_geekblue: PHI_COLOR_PICKER_DEFAULT_LABELS.colors.geekblue,
    color_purple: PHI_COLOR_PICKER_DEFAULT_LABELS.colors.purple,
    color_magenta: PHI_COLOR_PICKER_DEFAULT_LABELS.colors.magenta,
    color_gray: PHI_COLOR_PICKER_DEFAULT_LABELS.colors.gray,
  },
});

export async function getPhiColorPickerLabels(options: PhiGlobalTranslatorOptions): Promise<PhiColorPickerLabels> {
  const labels = await getPhiLabelSet(options, PHI_COLOR_PICKER_LABEL_SET);
  return {
    custom: labels.custom,
    colors: {
      primary: labels.color_primary,
      text: labels.color_text,
      red: labels.color_red,
      volcano: labels.color_volcano,
      orange: labels.color_orange,
      gold: labels.color_gold,
      yellow: labels.color_yellow,
      lime: labels.color_lime,
      green: labels.color_green,
      cyan: labels.color_cyan,
      blue: labels.color_blue,
      geekblue: labels.color_geekblue,
      purple: labels.color_purple,
      magenta: labels.color_magenta,
      gray: labels.color_gray,
    },
  };
}

export function getPhiColorPickerLabelsForRuntime(
  runtime: Pick<PhiBlockRuntime, "phis" | "locale" | "site">,
) {
  return getPhiColorPickerLabels(buildPhiWidgetLabelTranslatorOptions(runtime));
}
