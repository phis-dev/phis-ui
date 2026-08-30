import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PHI_WIDGET_DIMENSION_PLUGIN_FIELDS } from "../../../../../helpers/widget-dimension-plugin-fields";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiRenderableBlockSize } from "../../../../../types/renderable-block";
import {
  readCssSize,
  readRenderableBlockConfig,
  readRenderableBlockSize,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

export type PhiCmsHelloWorldWidgetConfig = PhiCmsWidgetConfigBase & {
  size?: PhiRenderableBlockSize;
};

export function parsePhiCmsHelloWorldWidgetConfig(
  config: Record<string, unknown>,
): PhiCmsHelloWorldWidgetConfig {
  const size = readRenderableBlockSize(config.size) ?? {
    width: readCssSize(config.width),
    height: readCssSize(config.height),
  };

  return {
    ...readRenderableBlockConfig(config),
    size,
  };
}

export const PHI_HELLO_WORLD_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("hello-world"),
  typeKey: "hello-world",
  title: "Hello World",
  category: "developer",
  description: "Debug widget showing current runtime and page information.",
  iconFamily: "developer",
  fields: [...PHI_WIDGET_DIMENSION_PLUGIN_FIELDS],
  parseConfig: parsePhiCmsHelloWorldWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsHelloWorldWidgetConfig>,
  "kind" | "pluginKey" | "typeKey" | "title" | "description" | "category" | "iconFamily" | "fields" | "parseConfig"
>;

export const PHI_HELLO_WORLD_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.HelloWorld;
