import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  readBoolean,
  readNumber,
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

export type PhiCmsBrandWidgetConfig = PhiCmsWidgetConfigBase & {
  fallbackTitle?: string;
  fallbackEyebrow?: string;
  showLogo?: boolean;
  logoYOffset?: number;
};

export function parsePhiCmsBrandWidgetConfig(config: Record<string, unknown>): PhiCmsBrandWidgetConfig {
  return {
    ...readRenderableBlockConfig(config),
    fallbackTitle: readString(config.fallbackTitle),
    fallbackEyebrow: readString(config.fallbackEyebrow),
    showLogo: readBoolean(config.showLogo) ?? true,
    logoYOffset: readNumber(config.logoYOffset) ?? 0,
  };
}

export const PHI_BRAND_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("brand"),
  typeKey: "brand",
  title: "Brand",
  category: "content",
  description: "Site brand mark and wordmark.",
  iconFamily: "brand",
  fields: [
    { key: "fallbackTitle", type: "string", label: "Fallback Title" },
    { key: "fallbackEyebrow", type: "string", label: "Fallback Eyebrow" },
    { key: "showLogo", type: "boolean", label: "Show Logo" },
    { key: "logoYOffset", type: "number", label: "Logo Y Offset" },
  ],
  parseConfig: parsePhiCmsBrandWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsBrandWidgetConfig>,
  "kind" | "pluginKey" | "typeKey" | "title" | "description" | "category" | "iconFamily" | "fields" | "parseConfig"
>;

export const PHI_BRAND_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Brand;
