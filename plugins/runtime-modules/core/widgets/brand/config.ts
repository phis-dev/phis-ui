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

/**
 * Which part of the Brand this Widget stands for.
 *
 * `mark` is the Logo and the Wordmark, the Brand as a destination. `line` is one of the two sentences
 * that travel with it -- the slogan, the place -- which are Brand as much as the Wordmark is
 * (`PhiSiteThemeBrand`) and were drawn by a Simple Text holding a copy of them until now.
 */
export type PhiBrandWidgetMode = "mark" | "line";

/** Which of the Brand's lines, when this Widget is one. */
export type PhiBrandWidgetLine = "slogan" | "location";

export type PhiCmsBrandWidgetConfig = PhiCmsWidgetConfigBase & {
  mode?: PhiBrandWidgetMode;
  line?: PhiBrandWidgetLine;
  fallbackTitle?: string;
  fallbackEyebrow?: string;
  showLogo?: boolean;
  logoYOffset?: number;
};

const PHI_BRAND_WIDGET_MODE_OPTIONS = [
  { value: "mark", label: "Logo and wordmark" },
  { value: "line", label: "A brand line" },
];

const PHI_BRAND_WIDGET_LINE_OPTIONS = [
  { value: "slogan", label: "Slogan" },
  { value: "location", label: "Location" },
];

function readBrandWidgetMode(value: unknown): PhiBrandWidgetMode | undefined {
  return value === "mark" || value === "line" ? value : undefined;
}

function readBrandWidgetLine(value: unknown): PhiBrandWidgetLine | undefined {
  return value === "slogan" || value === "location" ? value : undefined;
}

export function parsePhiCmsBrandWidgetConfig(config: Record<string, unknown>): PhiCmsBrandWidgetConfig {
  return {
    ...readRenderableBlockConfig(config),
    mode: readBrandWidgetMode(config.mode),
    line: readBrandWidgetLine(config.line),
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
  /*
   * `notEquals` on the mark's own fields rather than `equals: "mark"`, because the rule is read against
   * the stored config and a Widget that never stated a mode has none stored: `equals` would hide the
   * four fields of the default until somebody picked the default by hand.
   */
  fields: [
    { key: "mode", type: "choice", label: "Shows", options: PHI_BRAND_WIDGET_MODE_OPTIONS },
    {
      key: "line",
      type: "choice",
      label: "Line",
      options: PHI_BRAND_WIDGET_LINE_OPTIONS,
      visibleWhen: { field: "mode", equals: "line" },
    },
    {
      key: "fallbackTitle",
      type: "string",
      label: "Fallback Title",
      visibleWhen: { field: "mode", notEquals: "line" },
    },
    {
      key: "fallbackEyebrow",
      type: "string",
      label: "Fallback Eyebrow",
      visibleWhen: { field: "mode", notEquals: "line" },
    },
    { key: "showLogo", type: "boolean", label: "Show Logo", visibleWhen: { field: "mode", notEquals: "line" } },
    {
      key: "logoYOffset",
      type: "number",
      label: "Logo Y Offset",
      visibleWhen: { field: "mode", notEquals: "line" },
    },
  ],
  parseConfig: parsePhiCmsBrandWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsBrandWidgetConfig>,
  "kind" | "pluginKey" | "typeKey" | "title" | "description" | "category" | "iconFamily" | "fields" | "parseConfig"
>;

export const PHI_BRAND_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Brand;
