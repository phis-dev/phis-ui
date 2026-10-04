import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiSignalRouteSet } from "../../../../../types/signals";
import type { PhiCmsConfigFieldColorMode } from "../../../../../types/cms-plugins";
import { PHI_COLOR_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";
import { readBoolean, readString } from "../../../../../components/widgets/config/parser-primitives";
import {
  PHI_CONTROL_STATE_FIELDS,
  parsePhiControlStateConfig,
} from "../../../../../components/widgets/config/control-signal-config";

/** What the trigger shows: the swatch with its value written out, or the swatch alone. */
export type PhiColorWidgetDisplay = "value" | "swatch";

export type PhiColorWidgetConfig = {
  label?: string;
  value?: string;
  defaultValue?: string;
  mode?: PhiCmsConfigFieldColorMode;
  display?: PhiColorWidgetDisplay;
  signalRoutes?: PhiSignalRouteSet | null;
  key?: string;
  allowClear?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
};

function readColorMode(value: unknown): PhiCmsConfigFieldColorMode | undefined {
  const mode = readString(value);
  if (mode === "single" || mode === "gradient" || mode === "both") {
    return mode;
  }

  return undefined;
}

function readColorDisplay(value: unknown): PhiColorWidgetDisplay | undefined {
  const display = readString(value);
  return display === "value" || display === "swatch" ? display : undefined;
}

export function parsePhiColorWidgetConfig(config: Record<string, unknown>): PhiColorWidgetConfig {
  const controlState = parsePhiControlStateConfig(config, {
    key: "color",
  });

  return {
    ...controlState,
    label: readString(config.label),
    value: readString(config.value),
    defaultValue: readString(config.defaultValue),
    mode: readColorMode(config.mode),
    display: readColorDisplay(config.display),
    allowClear: readBoolean(config.allowClear),
  };
}

export const PHI_COLOR_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("color"),
  typeKey: "color",
  slotSizePolicy: "intrinsic",
  title: "Color",
  description: "Reusable color control widget for CMS builder surfaces.",
  category: "configuration",
  icon: "antd:bg-colors-outlined",
  iconFamily: "config",
  runtimeSignals: {
    ...PHI_COLOR_CONTROL_SIGNALS,
  },
  fields: [
    { key: "label", type: "string", label: "Label" },
    {
      key: "mode",
      type: "choice",
      label: "Picker Mode",
      options: [
        { value: "single", label: "Single" },
        { value: "gradient", label: "Gradient" },
        { value: "both", label: "Both" },
      ],
    },
    {
      key: "display",
      type: "choice",
      label: "Display",
      options: [
        { value: "value", label: "Swatch and value" },
        { value: "swatch", label: "Swatch only" },
      ],
    },
    { key: "value", type: "color", label: "Value", mode: "both" },
    { key: "defaultValue", type: "color", label: "Default Value", mode: "both" },
    { key: "allowClear", type: "boolean", label: "Allow Clear" },
    ...PHI_CONTROL_STATE_FIELDS,
  ],
  defaultConfig: {
    mode: "single",
    display: "value",
    key: "color",
  },
  parseConfig: parsePhiColorWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiColorWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "slotSizePolicy"
  | "title"
  | "description"
  | "category"
  | "icon"
  | "iconFamily"
  | "runtimeSignals"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
