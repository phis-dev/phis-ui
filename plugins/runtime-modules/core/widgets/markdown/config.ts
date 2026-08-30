import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsResolvedContent } from "../../../../../types/cms";
import {
  readBoolean,
  readNumber,
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

export type PhiMarkdownSpacingKey = "none" | "xxs" | "xs" | "sm" | "base" | "md" | "lg" | "xl" | "xxl";

export type PhiCmsMarkdownWidgetConfig = PhiCmsWidgetConfigBase & {
  sourceMode?: "inline" | "url";
  markdown?: string;
  widgetId?: string | number | null;
  sourceUrl?: string;
  sourceLocale?: string;
  revalidateSeconds?: number;
  translate?: boolean;
  textBlockSpacingBefore?: PhiMarkdownSpacingKey;
  textBlockSpacingAfter?: PhiMarkdownSpacingKey;
  headingBlockSpacingBefore?: PhiMarkdownSpacingKey;
  headingBlockSpacingAfter?: PhiMarkdownSpacingKey;
  tocKey?: string;
  resolvedContent?: PhiCmsResolvedContent | null;
  preferSource?: boolean;
};

const PHI_MARKDOWN_SPACING_OPTIONS: Array<{ value: PhiMarkdownSpacingKey; label: string }> = [
  { value: "none", label: "None" },
  { value: "xxs", label: "XXS" },
  { value: "xs", label: "XS" },
  { value: "sm", label: "SM" },
  { value: "base", label: "Base" },
  { value: "md", label: "MD" },
  { value: "lg", label: "LG" },
  { value: "xl", label: "XL" },
  { value: "xxl", label: "XXL" },
];

function readMarkdownSourceMode(value: unknown): PhiCmsMarkdownWidgetConfig["sourceMode"] | undefined {
  return value === "inline" || value === "url" ? value : undefined;
}

function readMarkdownSpacingKey(value: unknown): PhiMarkdownSpacingKey | undefined {
  return PHI_MARKDOWN_SPACING_OPTIONS.some((option) => option.value === value) ? (value as PhiMarkdownSpacingKey) : undefined;
}

export function parsePhiCmsMarkdownWidgetConfig(config: Record<string, unknown>): PhiCmsMarkdownWidgetConfig {
  const sourceUrl = readString(config.sourceUrl);

  return {
    ...readRenderableBlockConfig(config),
    sourceMode: readMarkdownSourceMode(config.sourceMode) ?? (sourceUrl ? "url" : "inline"),
    widgetId: typeof config.widgetId === "number" || typeof config.widgetId === "string" ? config.widgetId : undefined,
    markdown: readString(config.markdown),
    sourceUrl,
    sourceLocale: readString(config.sourceLocale),
    revalidateSeconds: readNumber(config.revalidateSeconds),
    translate: readBoolean(config.translate) ?? true,
    textBlockSpacingBefore: readMarkdownSpacingKey(config.textBlockSpacingBefore),
    textBlockSpacingAfter: readMarkdownSpacingKey(config.textBlockSpacingAfter),
    headingBlockSpacingBefore: readMarkdownSpacingKey(config.headingBlockSpacingBefore),
    headingBlockSpacingAfter: readMarkdownSpacingKey(config.headingBlockSpacingAfter),
    tocKey: readString(config.tocKey),
  };
}

export const PHI_MARKDOWN_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("markdown"),
  typeKey: "markdown",
  title: "Markdown",
  category: "content",
  description: "Render local or remote markdown with shared translation and typography.",
  iconFamily: "basic",
  slotSizePolicy: "intrinsic",
  defaultConfig: {
    translate: true,
    revalidateSeconds: 14400,
    textBlockSpacingBefore: "none",
    textBlockSpacingAfter: "sm",
    headingBlockSpacingBefore: "none",
    headingBlockSpacingAfter: "sm",
  },
  contentBinding: {
    storage: "markdown",
    sourceField: "markdown",
    translatable: true,
    skipWhenConfigField: "sourceUrl",
    skipWhenConfigFieldValue: {
      field: "sourceMode",
      value: "url",
    },
  },
  fields: [
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
    {
      key: "sourceLocale",
      type: "string",
      label: "Source Locale",
      visibleWhen: { field: "sourceMode", equals: "url" },
    },
    {
      key: "revalidateSeconds",
      type: "number",
      label: "Revalidate Seconds",
      visibleWhen: { field: "sourceMode", equals: "url" },
    },
    { key: "translate", type: "boolean", label: "Translate" },
    {
      key: "textBlockSpacingBefore",
      type: "choice",
      label: "Before Paragraph",
      options: PHI_MARKDOWN_SPACING_OPTIONS,
    },
    {
      key: "textBlockSpacingAfter",
      type: "choice",
      label: "After Paragraph",
      options: PHI_MARKDOWN_SPACING_OPTIONS,
    },
    {
      key: "headingBlockSpacingBefore",
      type: "choice",
      label: "Before Header",
      options: PHI_MARKDOWN_SPACING_OPTIONS,
    },
    {
      key: "headingBlockSpacingAfter",
      type: "choice",
      label: "After Header",
      options: PHI_MARKDOWN_SPACING_OPTIONS,
    },
    { key: "tocKey", type: "string", label: "TOC Key" },
  ],
  parseConfig: parsePhiCmsMarkdownWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsMarkdownWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "slotSizePolicy"
  | "defaultConfig"
  | "runtimeSignals"
  | "contentBinding"
  | "fields"
  | "parseConfig"
>;

export const PHI_MARKDOWN_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Markdown;
