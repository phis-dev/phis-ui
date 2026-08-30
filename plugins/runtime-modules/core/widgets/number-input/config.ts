import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PHI_NUMBER_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";
import {
  PHI_CONTROL_PRESENTATION_FIELDS,
  PHI_CONTROL_STATE_FIELDS,
  parsePhiControlConfig,
} from "../../../../../components/widgets/config/control-signal-config";
import { readNumber, readString } from "../../../../../components/widgets/config/parser-primitives";

export type PhiNumberInputWidgetConfig = ReturnType<typeof parsePhiNumberInputWidgetConfig>;

export function parsePhiNumberInputWidgetConfig(config: Record<string, unknown>) {
  return {
    ...parsePhiControlConfig(config, { key: "number-input" }),
    label: readString(config.label),
    value: readNumber(config.value),
    placeholder: readString(config.placeholder),
    min: readNumber(config.min),
    max: readNumber(config.max),
    step: readNumber(config.step),
    precision: readNumber(config.precision),
  };
}

export const PHI_NUMBER_INPUT_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("number-input"),
  typeKey: "number-input",
  title: "Number Input",
  description: "Reusable numeric input that emits typed number signals.",
  category: "form",
  iconFamily: "form",
  runtimeSignals: { ...PHI_NUMBER_CONTROL_SIGNALS },
  fields: [
    { key: "label", type: "string", label: "Label" },
    { key: "value", type: "number", label: "Value" },
    { key: "placeholder", type: "string", label: "Placeholder" },
    { key: "min", type: "number", label: "Minimum" },
    { key: "max", type: "number", label: "Maximum" },
    { key: "step", type: "number", label: "Step" },
    { key: "precision", type: "number", label: "Precision", min: 0, precision: 0 },
    ...PHI_CONTROL_PRESENTATION_FIELDS,
    ...PHI_CONTROL_STATE_FIELDS,
  ],
  defaultConfig: {
    key: "number-input",
  },
  parseConfig: parsePhiNumberInputWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiNumberInputWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "runtimeSignals"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;

export const PHI_NUMBER_INPUT_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.NumberInput;
