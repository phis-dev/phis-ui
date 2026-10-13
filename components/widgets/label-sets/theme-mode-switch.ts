import "server-only";

import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import {
  PHI_THEME_MODE_SWITCH_WIDGET_DEFAULT_LABELS,
  type PhiThemeModeSwitchWidgetLabels,
} from "../label-types/theme-mode-switch";

const PHI_THEME_MODE_SWITCH_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:theme-mode-switch",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    switch_to_dark: PHI_THEME_MODE_SWITCH_WIDGET_DEFAULT_LABELS.switchToDark,
    switch_to_light: PHI_THEME_MODE_SWITCH_WIDGET_DEFAULT_LABELS.switchToLight,
  },
});

export async function getPhiThemeModeSwitchWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiThemeModeSwitchWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_THEME_MODE_SWITCH_WIDGET_LABEL_SET);
  return {
    switchToDark: labels.switch_to_dark,
    switchToLight: labels.switch_to_light,
  };
}
