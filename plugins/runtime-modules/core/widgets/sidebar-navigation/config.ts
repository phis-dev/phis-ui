import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiWidgetFontFamilyKey, PhiWidgetFontSizeKey } from "../../../../../types/site-theme";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "../../../../../plugins/runtime-modules/builder/ids";
import {
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

export type PhiCmsSidebarNavigationWidgetConfig = PhiCmsWidgetConfigBase & {
  navKey?: string;
  fontFamily?: PhiWidgetFontFamilyKey;
  fontSize?: PhiWidgetFontSizeKey;
};

function readWidgetFontFamilyKey(value: unknown): PhiWidgetFontFamilyKey | undefined {
  return value === "inherit" ||
    value === "system" ||
    value === "body" ||
    value === "mono" ||
    value === "serif" ||
    value === "accent" ||
    value === "display"
    ? value
    : undefined;
}

function readWidgetFontSizeKey(value: unknown): PhiWidgetFontSizeKey | undefined {
  return value === "inherit" || value === "xs" || value === "sm" || value === "base" || value === "lg" || value === "xl"
    ? value
    : undefined;
}

export function parsePhiCmsSidebarNavigationWidgetConfig(
  config: Record<string, unknown>,
): PhiCmsSidebarNavigationWidgetConfig {
  return {
    ...readRenderableBlockConfig(config),
    navKey: readString(config.navKey),
    fontFamily: readWidgetFontFamilyKey(config.fontFamily),
    fontSize: readWidgetFontSizeKey(config.fontSize),
  };
}

export const PHI_SIDEBAR_NAVIGATION_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("sidebar-navigation"),
  typeKey: "sidebar-navigation",
  title: "Sidebar Navigation",
  description: "Vertical site navigation menu.",
  category: "navigation",
  iconFamily: "navigation",
  slotSizePolicy: "fill-inline",
  fields: [{
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
  }],
  parseConfig: parsePhiCmsSidebarNavigationWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsSidebarNavigationWidgetConfig>,
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

export const PHI_SIDEBAR_NAVIGATION_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.SidebarNavigation;
