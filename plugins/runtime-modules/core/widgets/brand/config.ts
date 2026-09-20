import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  readRenderableBlockConfig,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

/**
 * Which part of the Brand this Widget stands for, and the only thing it is asked.
 *
 * What the Brand *is* -- the Logo, the Wordmark's parts and their type, the eyebrow, the two lines --
 * is stated once in the Theme (`PhiSiteThemeBrand`). A placement never restates it; it picks which part
 * of it to draw here, and reads the rest. That is why there is one field and no overrides beside it.
 *
 * `lockup` is the Logo and the Wordmark set together, which is what the trade calls that pairing. It is
 * deliberately not named `mark`: a mark is the picture and a wordmark is the name in type, so a `mark`
 * that meant "both" left `mark` and `wordmark` reading like a typo for one another.
 *
 * The lines are modes rather than a second field. They were `mode: "line"` plus `line: "slogan"`, which
 * is one question asked twice -- and a Widget that had answered only the first was guessed at.
 */
export type PhiBrandWidgetMode =
  | "lockup"
  | "logo"
  | "wordmark"
  | "slogan"
  | "location";

/** The modes that draw one of the Brand's sentences rather than the Brand itself. */
export type PhiBrandWidgetLineMode = Extract<PhiBrandWidgetMode, "slogan" | "location">;

export function isPhiBrandWidgetLineMode(
  mode: PhiBrandWidgetMode | undefined,
): mode is PhiBrandWidgetLineMode {
  return mode === "slogan" || mode === "location";
}

export type PhiCmsBrandWidgetConfig = PhiCmsWidgetConfigBase & {
  mode?: PhiBrandWidgetMode;
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
    { key: "mode", type: "choice", label: "Shows", options: PHI_BRAND_WIDGET_MODE_OPTIONS },
  ],
  parseConfig: parsePhiCmsBrandWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsBrandWidgetConfig>,
  "kind" | "pluginKey" | "typeKey" | "title" | "description" | "category" | "iconFamily" | "fields" | "parseConfig"
>;

export const PHI_BRAND_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Brand;
