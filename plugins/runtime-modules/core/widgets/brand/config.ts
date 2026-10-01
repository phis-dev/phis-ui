import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiWidgetFontFamilyKey, PhiWidgetFontSizeKey } from "../../../../../types/site-theme";
import {
  readRenderableBlockConfig,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";
import { readPhiWidgetFontFamily } from "../../../../../components/widgets/helpers/font-family";
import { readPhiWidgetFontSize } from "../../../../../components/widgets/helpers/font-size";
import type { PhiBrandWidgetMode } from "./mode";

export type PhiCmsBrandWidgetConfig = PhiCmsWidgetConfigBase & {
  mode?: PhiBrandWidgetMode;
  fontFamily?: PhiWidgetFontFamilyKey;
  fontSize?: PhiWidgetFontSizeKey;
};

const PHI_BRAND_WIDGET_MODE_OPTIONS = [
  { value: "lockup", label: "Logo and wordmark" },
  { value: "logo", label: "Logo only" },
  { value: "wordmark", label: "Wordmark only" },
  { value: "slogan", label: "Slogan" },
  { value: "location", label: "Location" },
];

function readBrandWidgetMode(value: unknown): PhiBrandWidgetMode | undefined {
  return value === "lockup"
    || value === "logo"
    || value === "wordmark"
    || value === "slogan"
    || value === "location"
    ? value
    : undefined;
}

export function parsePhiCmsBrandWidgetConfig(config: Record<string, unknown>): PhiCmsBrandWidgetConfig {
  return {
    ...readRenderableBlockConfig(config),
    mode: readBrandWidgetMode(config.mode),
    fontFamily: readPhiWidgetFontFamily(config.fontFamily),
    fontSize: readPhiWidgetFontSize(config.fontSize),
  };
}

export const PHI_BRAND_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("brand"),
  typeKey: "brand",
  slotSizePolicy: "intrinsic",
  title: "Brand",
  category: "content",
  description: "Site brand mark and wordmark.",
  iconFamily: "brand",
  fields: [
    { key: "mode", type: "choice", label: "Shows", options: PHI_BRAND_WIDGET_MODE_OPTIONS },
  ],
  parseConfig: parsePhiCmsBrandWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsBrandWidgetConfig>,
  "kind" | "pluginKey" | "typeKey" | "slotSizePolicy" | "title" | "description" | "category" | "iconFamily" | "fields" | "parseConfig"
>;

export const PHI_BRAND_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Brand;
