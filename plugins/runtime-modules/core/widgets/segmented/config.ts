import { readPhiThemeGradientKey, type PhiThemeGradientKey } from "../../../../../theme/phi-theme-gradients";
import { PHI_THEME_GRADIENT_FIELD_OPTIONS } from "../../../../../components/widgets/config/theme-gradient";
import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  buildPhiChoiceControlOptionFields,
  PHI_CHOICE_CONTROL_CONFIG_FIELDS,
  PHI_CHOICE_CONTROL_VALUE_MODE_FIELD,
  parsePhiStackChoiceControlConfig,
  type PhiStackChoiceControlConfig,
} from "../../../../../components/widgets/config/choice-shared";
import { PHI_SELECT_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";

export type PhiSegmentedWidgetConfig = PhiStackChoiceControlConfig & {
  /** A Theme gradient slot the selected segment is filled with; absent, Ant Design's selected ground. */
  gradient?: PhiThemeGradientKey;
};

function parsePhiSegmentedWidgetConfig(config: Record<string, unknown>): PhiSegmentedWidgetConfig {
  return { ...parsePhiStackChoiceControlConfig(config), gradient: readPhiThemeGradientKey(config.gradient) };
}

export const PHI_SEGMENTED_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("segmented"),
  typeKey: "segmented",
  title: "Segmented",
  description: "Reusable segmented control that emits runtime state signals.",
  category: "form",
  iconFamily: "form",
  slotSizePolicy: "intrinsic",
  runtimeSignals: {
    ...PHI_SELECT_CONTROL_SIGNALS,
  },
  fields: [
    { key: "label", type: "string", label: "Label" },
    { key: "value", type: "string", label: "Value" },
    PHI_CHOICE_CONTROL_VALUE_MODE_FIELD,
    ...buildPhiChoiceControlOptionFields("toolbar"),
    ...PHI_CHOICE_CONTROL_CONFIG_FIELDS,
    {
      key: "gradient",
      type: "choice",
      label: "Gradient",
      description: "Fills the selected segment with one of the Theme's gradients.",
      options: [...PHI_THEME_GRADIENT_FIELD_OPTIONS],
      emptyOption: { value: "", label: "None" },
    },
  ],
  defaultConfig: {
    key: "segmented",
    valueMode: "raw",
    optionsProvider: null,
    options: [],
  },
  parseConfig: parsePhiSegmentedWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiSegmentedWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "slotSizePolicy"
  | "runtimeSignals"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
