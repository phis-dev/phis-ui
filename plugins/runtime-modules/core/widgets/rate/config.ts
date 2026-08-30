import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  normalizePhiRateCount,
  normalizePhiRateValue,
} from "../../../../../components/controls/phi-rate-control-contract";
import { PHI_NUMBER_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";
import {
  PHI_CONTROL_PRESENTATION_FIELDS,
  PHI_CONTROL_STATE_FIELDS,
  parsePhiControlConfig,
  type PhiControlConfig,
} from "../../../../../components/widgets/config/control-signal-config";
import { readBoolean, readNumber, readString } from "../../../../../components/widgets/config/parser-primitives";

export type PhiRateWidgetConfig = PhiControlConfig & {
  label?: string;
  description?: string;
  value: number;
  count: number;
  allowHalf: boolean;
  allowClear: boolean;
  icon?: string;
};

export function parsePhiRateWidgetConfig(config: Record<string, unknown>): PhiRateWidgetConfig {
  const count = normalizePhiRateCount(readNumber(config.count));
  const allowHalf = readBoolean(config.allowHalf) ?? false;

  return {
    ...parsePhiControlConfig(config, { key: "rate" }),
    label: readString(config.label),
    description: readString(config.description),
    value: normalizePhiRateValue(readNumber(config.value), count, allowHalf),
    count,
    allowHalf,
    allowClear: readBoolean(config.allowClear) ?? true,
    icon: readString(config.icon),
  };
}

export const PHI_RATE_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("rate"),
  typeKey: "rate",
  title: "Rate",
  description: "Reusable rating control that emits typed number signals.",
  category: "form",
  iconFamily: "form",
  slotSizePolicy: "intrinsic",
  runtimeSignals: { ...PHI_NUMBER_CONTROL_SIGNALS },
  fields: [
    { key: "label", type: "string", label: "Label" },
    { key: "description", type: "string", label: "Description" },
    { key: "value", type: "number", label: "Initial value", min: 0, step: 0.5 },
    { key: "count", type: "number", label: "Count", min: 1, step: 1, precision: 0 },
    { key: "allowHalf", type: "boolean", label: "Allow half" },
    { key: "allowClear", type: "boolean", label: "Allow clear" },
    { key: "icon", type: "icon", label: "Icon", editorPlacement: "toolbar" },
    ...PHI_CONTROL_PRESENTATION_FIELDS,
    ...PHI_CONTROL_STATE_FIELDS,
  ],
  defaultConfig: {
    key: "rate",
    value: 0,
    count: 5,
    allowHalf: false,
    allowClear: true,
    controlSize: "medium",
  },
  parseConfig: parsePhiRateWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiRateWidgetConfig>,
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

export const PHI_RATE_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Rate;
