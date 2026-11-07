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
  /**
   * How the entries stand on a phone (below 768px): behind a menu button that opens them in a Drawer, the
   * default, or in the row as on a wider screen, where what does not fit folds into "…".
   */
  phoneMenu?: PhiHeaderNavigationPhoneMenu;
};

export type PhiHeaderNavigationPhoneMenu = "button" | "row";

function parsePhiCmsHeaderNavigationWidgetConfig(
  config: Record<string, unknown>,
): PhiCmsHeaderNavigationWidgetConfig {
  return {
    ...readRenderableBlockConfig(config),
    navKey: readString(config.navKey),
    align: readString(config.align) === "center" ? "center" : "left",
    selectionStyle: PHI_MENU_SELECTION_STYLES.find((style) => style === readString(config.selectionStyle)),
    phoneMenu: readString(config.phoneMenu) === "row" ? "row" : "button",
  };
}

export type PhiHeaderNavigationWidgetRenderableConfig = Pick<
  PhiCmsHeaderNavigationWidgetConfig,
  "align" | "selectionStyle" | "phoneMenu"
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
  defaultConfig: { align: "left", selectionStyle: "auto", phoneMenu: "button" },
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
    {
      key: "phoneMenu",
      type: "choice",
      label: "On a phone",
      presentation: "segmented",
      options: [
        { value: "button", label: "Menu button" },
        { value: "row", label: "Row" },
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
