import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PHI_RENDERABLE_BLOCK_GEOMETRY_FIELDS } from "../../../../../helpers/renderable-block-plugin-fields";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiCmsResolvedContent } from "../../../../../types/cms";
import type { PhiWidgetFontFamilyKey, PhiWidgetFontSizeKey } from "../../../../../types/site-theme";
import type { PhiHtmlWidgetClientConfig } from "./client";
import { sanitizePhiHtmlWidgetMarkup } from "../../../../../components/widgets/helpers/html-content";
import {
  readBoolean,
  readNumber,
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

export type PhiCmsHtmlWidgetConfig = PhiCmsWidgetConfigBase & {
  html?: string;
  sourceMode?: "inline" | "url";
  sourceUrl?: string;
  sourceLocale?: string;
  revalidateSeconds?: number;
  fontFamily?: PhiWidgetFontFamilyKey;
  fontSize?: PhiWidgetFontSizeKey;
  translate?: boolean;
};

export type PhiHtmlWidgetContentConfig = PhiHtmlWidgetClientConfig & {
  resolvedContent?: PhiCmsResolvedContent | null;
};

function readWidgetFontFamilyKey(value: unknown): PhiWidgetFontFamilyKey | undefined {
  return value === "inherit" ||
    value === "system" ||
    value === "body" ||
    value === "mono" ||
    value === "serif" ||
    value === "accent" ||
    value === "display"
    ? value
    : undefined;
}

function readWidgetFontSizeKey(value: unknown): PhiWidgetFontSizeKey | undefined {
  return value === "inherit" || value === "xs" || value === "sm" || value === "base" || value === "lg" || value === "xl"
    ? value
    : undefined;
}

export function parsePhiCmsHtmlWidgetConfig(config: Record<string, unknown>): PhiCmsHtmlWidgetConfig {
  const renderableBlockConfig = readRenderableBlockConfig(config);

  return {
    ...renderableBlockConfig,
    size: renderableBlockConfig.size ?? { width: "100%", height: "auto" },
    minSize: {
      ...(renderableBlockConfig.minSize ?? {}),
      ...(renderableBlockConfig.minSize?.width == null ? { width: 150 } : {}),
    },
    maxSize: {
      ...(renderableBlockConfig.maxSize ?? {}),
      ...(renderableBlockConfig.maxSize?.width == null ? { width: "100%" } : {}),
    },
    html: readString(config.html),
    sourceMode: config.sourceMode === "url" ? "url" : "inline",
    sourceUrl: readString(config.sourceUrl),
    sourceLocale: readString(config.sourceLocale),
    revalidateSeconds: readNumber(config.revalidateSeconds),
    fontFamily: readWidgetFontFamilyKey(config.fontFamily),
    fontSize: readWidgetFontSizeKey(config.fontSize),
    translate: readBoolean(config.translate) ?? true,
  };
}

export type PhiHtmlWidgetRenderableConfig = PhiHtmlWidgetContentConfig & {
  translate?: boolean;
  sourceMode?: "inline" | "url";
  sourceUrl?: string;
  sourceLocale?: string;
  revalidateSeconds?: number;
};

export const PHI_HTML_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("html"),
  typeKey: "html",
  title: "Rich Text",
  category: "content",
  description: "HTML-backed editorial text block with a Lexical authoring scaffold in edit mode.",
  iconFamily: "content",
  slotSizePolicy: "fill-inline",
  contentBinding: {
    storage: "html",
    sourceField: "html",
    translatable: true,
    skipWhenConfigField: "sourceUrl",
    skipWhenConfigFieldValue: { field: "sourceMode", value: "url" },
  },
  fields: [
    ...PHI_RENDERABLE_BLOCK_GEOMETRY_FIELDS,
    {
      key: "sourceMode",
      type: "choice",
      label: "Source",
      options: [
        { value: "inline", label: "Inline" },
        { value: "url", label: "External URL" },
      ],
    },
    { key: "sourceUrl", type: "url", label: "Source URL", visibleWhen: { field: "sourceMode", equals: "url" } },
    { key: "sourceLocale", type: "string", label: "Source Locale", visibleWhen: { field: "sourceMode", equals: "url" } },
    { key: "revalidateSeconds", type: "number", label: "Revalidate Seconds", visibleWhen: { field: "sourceMode", equals: "url" } },
    { key: "translate", type: "boolean", label: "Translate" },
  ],
  defaultConfig: {
    translate: true,
    sourceMode: "inline",
    revalidateSeconds: 14400,
    size: {
      width: "100%",
      height: "auto",
    },
    minSize: {
      width: 150,
    },
    maxSize: {
      width: "100%",
    },
  },
  parseConfig: parsePhiCmsHtmlWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsHtmlWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "slotSizePolicy"
  | "runtimeSignals"
  | "contentBinding"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;

export function resolvePhiHtmlWidgetMarkup(
  config: PhiHtmlWidgetRenderableConfig | undefined,
  options?: {
    preferSource?: boolean;
    preferConfigHtml?: boolean;
    allowInternalReferences?: boolean;
  },
) {
  if (options?.preferConfigHtml && typeof config?.html === "string" && config.html.trim().length > 0) {
    return sanitizePhiHtmlWidgetMarkup(config.html, options);
  }

  const resolvedField = config?.resolvedContent?.textFields.html;
  if (resolvedField) {
    return sanitizePhiHtmlWidgetMarkup(options?.preferSource ? resolvedField.source : resolvedField.value, options);
  }

  return sanitizePhiHtmlWidgetMarkup(config?.html, options);
}

export const PHI_HTML_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Html;
