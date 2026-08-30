import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { parsePhiEmptyWidgetConfig } from "../../../../../components/widgets/config/helpers";

export const PHI_LOCALE_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("locale"),
  typeKey: "locale",
  title: "Locale",
  description: "Locale switcher widget.",
  category: "navigation",
  iconFamily: "navigation",
  fields: [],
  parseConfig: parsePhiEmptyWidgetConfig,
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

export const PHI_LOCALE_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Locale;
