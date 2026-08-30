import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { parsePhiEmptyWidgetConfig } from "../../../../../components/widgets/config/helpers";

export const PHI_SPACER_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("spacer"),
  typeKey: "spacer",
  title: "Spacer",
  description: "Fills the remaining available space in the current slot.",
  category: "structure",
  icon: "antd:column-width-outlined",
  iconFamily: "layout",
  slotSizePolicy: "fill",
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
  | "icon"
  | "iconFamily"
  | "slotSizePolicy"
  | "fields"
  | "parseConfig"
>;

export const PHI_SPACER_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Spacer;
