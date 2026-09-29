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
import { readPhiWidgetFontFamily } from "../../../../../components/widgets/helpers/font-family";
import { readPhiWidgetFontSize } from "../../../../../components/widgets/helpers/font-size";

export type PhiCmsSidebarNavigationWidgetConfig = PhiCmsWidgetConfigBase & {
  navKey?: string;
  fontFamily?: PhiWidgetFontFamilyKey;
  fontSize?: PhiWidgetFontSizeKey;
};

export function parsePhiCmsSidebarNavigationWidgetConfig(
  config: Record<string, unknown>,
): PhiCmsSidebarNavigationWidgetConfig {
  return {
    ...readRenderableBlockConfig(config),
    navKey: readString(config.navKey),
    fontFamily: readPhiWidgetFontFamily(config.fontFamily),
    fontSize: readPhiWidgetFontSize(config.fontSize),
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
  /*
   * The Area's own navigation, and therefore the Area's shell.
   *
   * It names a whole navigation surface and stands still while a person walks through the Pages under
   * it. A Page-owned Region is built again for every Page, so the same menu would rebuild itself on
   * each step -- visibly, under the hand that just used it. SETTINGS.md section 3 says the same thing
   * about the Settings container for the same reason; this is where a Builder is told.
   */
  requiredRegionOwnership: "shell",
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
  | "requiredRegionOwnership"
  | "fields"
  | "parseConfig"
>;

export const PHI_SIDEBAR_NAVIGATION_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.SidebarNavigation;
