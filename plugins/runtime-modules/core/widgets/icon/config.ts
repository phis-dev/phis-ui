import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { readRenderableBlockConfig, readString, type PhiCmsWidgetConfigBase } from "../../../../../components/widgets/config/parser-primitives";

export type PhiCmsIconWidgetConfig = PhiCmsWidgetConfigBase & {
  icon?: string;
  color?: string;
};

export function parsePhiCmsIconWidgetConfig(config: Record<string, unknown>): PhiCmsIconWidgetConfig {
  return {
    ...readRenderableBlockConfig(config),
    icon: readString(config.icon),
    color: readString(config.color),
  };
}

export const PHI_ICON_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("icon"),
  typeKey: "icon",
  title: "Icon",
  category: "content",
  description: "Standalone icon block with shared icon and color tool actions.",
  iconFamily: "basic",
  fields: [],
  defaultConfig: {
    icon: "antd:question-circle-outlined",
  },
  parseConfig: parsePhiCmsIconWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsIconWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "runtimeSignals"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;

export const PHI_ICON_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Icon;
