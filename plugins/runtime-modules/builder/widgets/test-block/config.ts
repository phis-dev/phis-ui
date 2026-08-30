import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PHI_WIDGET_DIMENSION_PLUGIN_FIELDS } from "../../../../../helpers/widget-dimension-plugin-fields";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiRenderableBlockSize } from "../../../../../types/renderable-block";
import {
  readCssSize,
  readRenderableBlockConfig,
  readRenderableBlockSize,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

export type PhiCmsTestBlockWidgetConfig = PhiCmsWidgetConfigBase & {
  text?: string;
  size?: PhiRenderableBlockSize;
  backgroundColor?: string;
  color?: string;
};

export function parsePhiCmsTestBlockWidgetConfig(
  config: Record<string, unknown>,
): PhiCmsTestBlockWidgetConfig {
  const size = readRenderableBlockSize(config.size) ?? {
    width: readCssSize(config.width) ?? 100,
    height: readCssSize(config.height) ?? 100,
  };

  return {
    ...readRenderableBlockConfig(config),
    text: readString(config.text),
    size,
    backgroundColor: readString(config.backgroundColor),
    color: readString(config.color),
  };
}

export const PHI_TEST_BLOCK_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("test-block"),
  typeKey: "test-block",
  title: "Test Block",
  category: "developer",
  description: "Simple colored box for layout testing.",
  iconFamily: "basic",
  defaultConfig: parsePhiCmsTestBlockWidgetConfig({}),
  fields: [
    { key: "text", type: "string", label: "Text" },
    ...PHI_WIDGET_DIMENSION_PLUGIN_FIELDS,
    { key: "backgroundColor", type: "color", label: "Background Color", mode: "both" },
    { key: "color", type: "color", label: "Text Color", mode: "single" },
  ],
  parseConfig: parsePhiCmsTestBlockWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsTestBlockWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "defaultConfig"
  | "fields"
  | "parseConfig"
>;

export const PHI_TEST_BLOCK_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.TestBlock;
