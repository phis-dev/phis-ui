import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { CSSProperties } from "react";

import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "../../../../../plugins/runtime-modules/builder/ids";
import {
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

export type PhiCmsHeaderNavigationWidgetConfig = PhiCmsWidgetConfigBase & {
  navKey?: string;
  align?: "left" | "center";
};

export function parsePhiCmsHeaderNavigationWidgetConfig(
  config: Record<string, unknown>,
): PhiCmsHeaderNavigationWidgetConfig {
  return {
    ...readRenderableBlockConfig(config),
    navKey: readString(config.navKey),
    align: readString(config.align) === "center" ? "center" : "left",
  };
}

export type PhiHeaderNavigationWidgetRenderableConfig = Pick<
  PhiCmsHeaderNavigationWidgetConfig,
  "align"
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
  fields: [
    {
      key: "navKey",
      type: "choice",
      label: "Navigation",
      presentation: "select",
      optionsProvider: {
        providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.builderNavigationSets,
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

  | "fields"
  | "parseConfig"
>;

export const PHI_HEADER_NAVIGATION_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.HeaderNavigation;
