import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { CSSProperties } from "react";

import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PHI_AUTHORING_OPTION_PROVIDER_KEYS } from "../../../../../constants/authoring-option-provider-keys";
import {
  PHI_MENU_SELECTION_STYLES,
  type PhiMenuSelectionStyle,
} from "../../../../../components/controls/phi-menu-control-vocabulary";
import {
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

export type PhiCmsHeaderNavigationWidgetConfig = PhiCmsWidgetConfigBase & {
  navKey?: string;
  align?: "left" | "center";
  /** How the current entry is marked (`PHI_MENU_SELECTION_STYLES`); absent is `auto`. */
  selectionStyle?: PhiMenuSelectionStyle;
};

function parsePhiCmsHeaderNavigationWidgetConfig(
  config: Record<string, unknown>,
): PhiCmsHeaderNavigationWidgetConfig {
  return {
    ...readRenderableBlockConfig(config),
    navKey: readString(config.navKey),
    align: readString(config.align) === "center" ? "center" : "left",
    selectionStyle: PHI_MENU_SELECTION_STYLES.find((style) => style === readString(config.selectionStyle)),
  };
}

export type PhiHeaderNavigationWidgetRenderableConfig = Pick<
  PhiCmsHeaderNavigationWidgetConfig,
  "align" | "selectionStyle"
> & {
  height?: CSSProperties["height"];
};

export const PHI_HEADER_NAVIGATION_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("header-navigation"),
  typeKey: "header-navigation",
  title: "Header Navigation",
  description: "Horizontal site navigation menu.",
  category: "navigation",
  iconFamily: "navigation",
  slotSizePolicy: "fill",
  /* What the Inspector shows chosen where a header states nothing, and what an absent value renders as. */
  defaultConfig: { align: "left", selectionStyle: "auto" },
  fields: [
    {
      key: "navKey",
      type: "choice",
      label: "Navigation",
      presentation: "select",
      optionsProvider: {
        providerKey: PHI_AUTHORING_OPTION_PROVIDER_KEYS.navigationSets,
        loadMode: "hybrid",
        search: { enabled: true, minChars: 1 },
        params: {
          value: "scopeKey",
        },
      },
      placeholder: "Select an Area navigation surface",
    },
    {
      key: "align",
      type: "choice",
      label: "Align",
      options: [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
      ],
    },
    /* Automatic is a bar in light mode and a rounded ground in dark mode, where a bar is hard to see. */
    {
      key: "selectionStyle",
      type: "choice",
      label: "Current entry",
      presentation: "segmented",
      options: [
        { value: "auto", label: "Automatic" },
        { value: "underline", label: "Underline" },
        { value: "pill", label: "Pill" },
      ],
    },
  ],
  parseConfig: parsePhiCmsHeaderNavigationWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsHeaderNavigationWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "slotSizePolicy"
  | "defaultConfig"

  | "fields"
  | "parseConfig"
>;

export const PHI_HEADER_NAVIGATION_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.HeaderNavigation;
