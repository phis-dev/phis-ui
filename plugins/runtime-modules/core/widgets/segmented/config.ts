import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  PHI_CHOICE_CONTROL_OPTION_FIELDS,
  PHI_CHOICE_CONTROL_CONFIG_FIELDS,
  PHI_CHOICE_CONTROL_VALUE_MODE_FIELD,
  parsePhiStackChoiceControlConfig,
  type PhiStackChoiceControlConfig,
} from "../../../../../components/widgets/config/choice-shared";
import { PHI_SELECT_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";

export type PhiSegmentedWidgetConfig = PhiStackChoiceControlConfig;

export function parsePhiSegmentedWidgetConfig(config: Record<string, unknown>): PhiSegmentedWidgetConfig {
  return parsePhiStackChoiceControlConfig(config);
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
    ...PHI_CHOICE_CONTROL_OPTION_FIELDS,
    ...PHI_CHOICE_CONTROL_CONFIG_FIELDS,
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
