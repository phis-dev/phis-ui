import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import {
  readPhiDimensionValue,
  type PhiCmsWidgetPlugin,
} from "../../../../../types";
import { PHI_DIMENSION_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";
import {
  PHI_CONTROL_PRESENTATION_FIELDS,
  PHI_CONTROL_STATE_FIELDS,
  parsePhiControlConfig,
} from "../../../../../components/widgets/config/control-signal-config";

export type PhiDimensionWidgetConfig = ReturnType<typeof parsePhiDimensionWidgetConfig>;

export function parsePhiDimensionWidgetConfig(config: Record<string, unknown>) {
  return {
    ...parsePhiControlConfig(config, { key: "dimension" }),
    value: readPhiDimensionValue(config.value),
  };
}

export const PHI_DIMENSION_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("dimension"),
  typeKey: "dimension",
  title: "Dimension",
  description: "Reusable width and height input with explicit CSS units.",
  category: "form",
  iconFamily: "form",
  runtimeSignals: { ...PHI_DIMENSION_CONTROL_SIGNALS },
  fields: [
    { key: "value", type: "dimension", label: "Value" },
    ...PHI_CONTROL_PRESENTATION_FIELDS,
    ...PHI_CONTROL_STATE_FIELDS,
  ],
  defaultConfig: {
    key: "dimension",
  },
  parseConfig: parsePhiDimensionWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiDimensionWidgetConfig>,
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

export const PHI_DIMENSION_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Dimension;
