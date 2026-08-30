import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";

export const PHI_AREA_MENU_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("area-menu"),
  typeKey: "area-menu",
  title: "Area Menu",
  description: "Menu for switching between available authenticated areas.",
  category: "navigation",
  iconFamily: "navigation",
  fields: [],
  parseConfig: () => ({}),
} satisfies Pick<
  PhiCmsWidgetPlugin<Record<string, never>>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"

  | "fields"
  | "parseConfig"
>;

export const PHI_AREA_MENU_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.AreaMenu;
