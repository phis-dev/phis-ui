import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import {
  readPhiLengthValue,
  type PhiCmsWidgetPlugin,
} from "../../../../../types";
import { PHI_LENGTH_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";
import {
  PHI_CONTROL_PRESENTATION_FIELDS,
  PHI_CONTROL_STATE_FIELDS,
  parsePhiControlConfig,
} from "../../../../../components/widgets/config/control-signal-config";
import { readNumber, readString } from "../../../../../components/widgets/config/parser-primitives";

export type PhiLengthWidgetConfig = ReturnType<typeof parsePhiLengthWidgetConfig>;

export function parsePhiLengthWidgetConfig(config: Record<string, unknown>) {
  return {
    ...parsePhiControlConfig(config, { key: "length" }),
    label: readString(config.label),
    placeholder: readString(config.placeholder),
    value: readPhiLengthValue(config.value),
    min: readNumber(config.min),
    max: readNumber(config.max),
    step: readNumber(config.step),
    precision: readNumber(config.precision),
  };
}

export const PHI_LENGTH_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("length"),
  typeKey: "length",
  title: "Length",
  description: "Reusable numeric CSS length input with an explicit unit.",
  category: "form",
  iconFamily: "form",
  runtimeSignals: { ...PHI_LENGTH_CONTROL_SIGNALS },
  fields: [
    { key: "label", type: "string", label: "Label" },
    { key: "value", type: "length", label: "Value" },
    { key: "placeholder", type: "string", label: "Placeholder" },
    { key: "min", type: "number", label: "Minimum" },
    { key: "max", type: "number", label: "Maximum" },
    { key: "step", type: "number", label: "Step" },
    { key: "precision", type: "number", label: "Precision", min: 0, precision: 0 },
    ...PHI_CONTROL_PRESENTATION_FIELDS,
    ...PHI_CONTROL_STATE_FIELDS,
  ],
  defaultConfig: {
    key: "length",
  },
  parseConfig: parsePhiLengthWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiLengthWidgetConfig>,
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

export const PHI_LENGTH_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Length;
