import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { readBoolean, readNumber, readString, type PhiCmsWidgetConfigBase } from "../../../../../components/widgets/config/parser-primitives";
import { PHI_MARKDOWN_WIDGET_DEFINITION } from "../markdown/config";

export type PhiMarkdownTocHeading = {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  text: string;
};

export type PhiCmsMarkdownTocWidgetConfig = PhiCmsWidgetConfigBase & {
  bindingMode?: "auto" | "target";
  markdownWidgetId?: string;
  tocKey?: string;
  title?: string;
  minLevel?: number;
  maxLevel?: number;
  offsetTop?: number;
  showTitle?: boolean;
  headings?: PhiMarkdownTocHeading[];
};

function clampHeadingLevel(value: number | undefined, fallback: number) {
  if (value == null) {
    return fallback;
  }

  return Math.min(Math.max(value, 1), 5);
}

export function parsePhiCmsMarkdownTocWidgetConfig(config: Record<string, unknown>): PhiCmsMarkdownTocWidgetConfig {
  const minLevel = clampHeadingLevel(readNumber(config.minLevel), 1);
  const maxLevel = clampHeadingLevel(readNumber(config.maxLevel), 5);
  const bindingMode = readString(config.bindingMode);

  return {
    bindingMode: bindingMode === "target" ? "target" : "auto",
    markdownWidgetId: readString(config.markdownWidgetId),
    tocKey: readString(config.tocKey),
    title: readString(config.title),
    minLevel: Math.min(minLevel, maxLevel),
    maxLevel: Math.max(minLevel, maxLevel),
    offsetTop: readNumber(config.offsetTop) ?? 0,
    showTitle: readBoolean(config.showTitle) ?? true,
  };
}

export const PHI_MARKDOWN_TOC_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("markdown-toc"),
  typeKey: "markdown-toc",
  title: "Markdown TOC",
  category: "content",
  description: "Render an anchor table of contents for a Markdown widget.",
  iconFamily: "basic",
  slotSizePolicy: "fill-inline",
  defaultConfig: {
    bindingMode: "auto",
    minLevel: 1,
    maxLevel: 5,
    offsetTop: 0,
    showTitle: true,
  },
  fields: [
    {
      key: "bindingMode",
      type: "choice",
      label: "Binding Mode",
      options: [
        { value: "auto", label: "Auto" },
        { value: "target", label: "Target" },
      ],
    },
    {
      key: "markdownWidgetId",
      type: "choice",
      label: "Markdown Widget",
      filter: {
        widgetType: `${PHI_MARKDOWN_WIDGET_DEFINITION.pluginKey}/${PHI_MARKDOWN_WIDGET_DEFINITION.typeKey}`,
      },
      placeholder: "Select widget",
      visibleWhen: { field: "bindingMode", equals: "target" },
    },
    { key: "tocKey", type: "string", label: "TOC Key", visibleWhen: { field: "bindingMode", equals: "target" } },
    { key: "title", type: "string", label: "Title" },
    { key: "minLevel", type: "number", label: "Min Heading Level", min: 1, max: 6, precision: 0 },
    { key: "maxLevel", type: "number", label: "Max Heading Level", min: 1, max: 6, precision: 0 },
    { key: "offsetTop", type: "number", label: "Offset Top" },
    { key: "showTitle", type: "boolean", label: "Show Title" },
  ],
  parseConfig: parsePhiCmsMarkdownTocWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsMarkdownTocWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "slotSizePolicy"
  | "runtimeSignals"
  | "defaultConfig"
  | "fields"
  | "parseConfig"
>;

export const PHI_MARKDOWN_TOC_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.MarkdownToc;
