import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiMediaImageSourceConfig } from "../../../../../types/media";
import { readPhiMediaImageSourceConfig } from "../../../../../components/widgets/config/image-source-parser";
import {
  readBoolean,
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

export type PhiCmsCardWidgetConfig = PhiCmsWidgetConfigBase &
  PhiMediaImageSourceConfig & {
    eyebrow?: string;
    title?: string;
    description?: string;
    meta?: string;
    href?: string;
    newTab?: boolean;
    actionLabel?: string;
    actionHref?: string;
    actionNewTab?: boolean;
    variant?: "default" | "compact" | "featured";
    highlight?: boolean;
    translate?: boolean;
  };

export function parsePhiCmsCardWidgetConfig(config: Record<string, unknown>): PhiCmsCardWidgetConfig {
  const source = readPhiMediaImageSourceConfig(config);
  const normalized = {
    ...readRenderableBlockConfig(config),
    trusted: readBoolean(config.trusted) ?? false,
    alt: readString(config.alt),
    title: readString(config.title),
    blurDataUrl: readString(config.blurDataUrl),
    eyebrow: readString(config.eyebrow),
    description: readString(config.description),
    meta: readString(config.meta),
    href: readString(config.href),
    newTab: readBoolean(config.newTab),
    actionLabel: readString(config.actionLabel),
    actionHref: readString(config.actionHref),
    actionNewTab: readBoolean(config.actionNewTab),
    variant: ((): PhiCmsCardWidgetConfig["variant"] => {
      const variant = readString(config.variant);
      return variant === "compact" || variant === "featured" || variant === "default" ? variant : undefined;
    })(),
    highlight: readBoolean(config.highlight),
    translate: readBoolean(config.translate) ?? true,
  };
  return source.sourceKind === "asset"
    ? { ...normalized, ...source }
    : { ...normalized, ...source };
}

export const PHI_CARD_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("card"),
  typeKey: "card",
  title: "Card",
  category: "content",
  description: "Flexible content card with optional cover, CTA, and highlight state.",
  iconFamily: "basic",
  slotSizePolicy: "fill-inline",
  fields: [
    { key: "eyebrow", type: "string", label: "Eyebrow" },
    { key: "title", type: "string", label: "Title" },
    { key: "description", type: "string", label: "Description" },
    { key: "meta", type: "string", label: "Meta" },
    {
      key: "sourceKind",
      type: "choice",
      label: "Image Source Kind",
      options: [
        { value: "url", label: "URL" },
        { value: "asset", label: "Asset" },
      ],
    },
    { key: "sourceUrl", type: "url", label: "Image Source URL", visibleWhen: { field: "sourceKind", equals: "url" } },
    { key: "assetId", type: "number", label: "Asset ID", editorPlacement: "toolbar" },
    { key: "variantKey", type: "number", label: "Variant Key" },
    { key: "alt", type: "string", label: "Image Alt" },
    { key: "blurDataUrl", type: "string", label: "Blur Data URL" },
    { key: "trusted", type: "boolean", label: "Trusted" },
    { key: "href", type: "url", label: "Primary Link" },
    { key: "newTab", type: "boolean", label: "Open Primary Link In New Tab" },
    { key: "actionLabel", type: "string", label: "Action Label" },
    { key: "actionHref", type: "url", label: "Action Link" },
    { key: "actionNewTab", type: "boolean", label: "Open Action Link In New Tab" },
    {
      key: "variant",
      type: "choice",
      label: "Variant",
      options: [
        { value: "default", label: "Default" },
        { value: "compact", label: "Compact" },
        { value: "featured", label: "Featured" },
      ],
    },
    { key: "highlight", type: "boolean", label: "Highlight" },
    { key: "translate", type: "boolean", label: "Translate Text" },
  ],
  parseConfig: parsePhiCmsCardWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsCardWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "slotSizePolicy"
  | "fields"
  | "parseConfig"
>;

export const PHI_CARD_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Card;
