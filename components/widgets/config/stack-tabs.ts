import { resolvePhiCmsWidgetPluginKey } from "../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../types";
import { readString, type PhiCmsWidgetConfigBase } from "./parser-primitives";
import {
  PHI_CHOICE_CONTROL_OPTION_FIELDS,
  PHI_CHOICE_CONTROL_CONFIG_FIELDS,
  PHI_CHOICE_CONTROL_VALUE_MODE_FIELD,
  parsePhiStackChoiceControlConfig,
  type PhiStackChoiceControlConfig,
} from "./choice-shared";
import { PHI_SELECT_CONTROL_SIGNALS } from "../signals/control-signal-capabilities";

export type PhiCmsTabBarWidgetConfig = PhiCmsWidgetConfigBase & PhiStackChoiceControlConfig & {
  key?: string;
  placement?: "top" | "bottom" | "left" | "right";
};

export function parsePhiCmsTabBarWidgetConfig(config: Record<string, unknown>): PhiCmsTabBarWidgetConfig {
  const placement = readString(config.placement);

  return {
    ...parsePhiStackChoiceControlConfig(config),
    placement: placement === "bottom" || placement === "left" || placement === "right" ? placement : "top",
  };
}

export const PHI_TAB_BAR_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("tab-bar"),
  typeKey: "tab-bar",
  title: "Tab bar",
  description: "Reusable tab control that emits runtime state signals and can optionally control stack slots.",
  category: "navigation",
  iconFamily: "basic",
  slotSizePolicy: "fill-block",
  runtimeSignals: {
    ...PHI_SELECT_CONTROL_SIGNALS,
  },
  defaultConfig: {
    key: "tab",
    valueMode: "raw",
    placement: "top",
    optionsProvider: null,
    options: [],
  },
  fields: [
    { key: "value", type: "string", label: "Value" },
    PHI_CHOICE_CONTROL_VALUE_MODE_FIELD,
    {
      key: "placement",
      type: "choice",
      label: "Placement",
      options: [
        { value: "top", label: "Top" },
        { value: "bottom", label: "Bottom" },
        { value: "left", label: "Left" },
        { value: "right", label: "Right" },
      ],
    },
    ...PHI_CHOICE_CONTROL_OPTION_FIELDS,
    ...PHI_CHOICE_CONTROL_CONFIG_FIELDS,
  ],
  parseConfig: parsePhiCmsTabBarWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsTabBarWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "slotSizePolicy"
  | "runtimeSignals"
  | "defaultConfig"
  | "fields"
  | "parseConfig"
>;

export const PHI_TAB_BAR_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.TabBar;
