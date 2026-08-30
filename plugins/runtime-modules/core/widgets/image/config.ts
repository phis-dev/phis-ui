import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiImageAssetVariantKey } from "../../../../../constants/media";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiMediaImageSourceConfig } from "../../../../../types/media";
import { readPhiMediaImageSourceConfig } from "../../../../../components/widgets/config/image-source-parser";
import {
  readBoolean,
  readCssSize,
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";
import {
  normalizePhiMaskConfig,
  type PhiMaskConfig,
} from "../../../../../components/widgets/config/mask";

export type PhiImageWidgetSourceKind = "url" | "asset";
export type PhiImageWidgetPreviewMode = "none" | "native" | "lightbox";
export type PhiImageWidgetFit = "cover" | "contain" | "fill";

export type PhiCmsImageWidgetConfig = PhiCmsWidgetConfigBase &
  PhiMediaImageSourceConfig & {
    fit?: PhiImageWidgetFit;
    objectPosition?: string;
    sizes?: string;
    alt?: string;
    title?: string;
    overrideSize?: boolean;
    width?: number | string | null;
    height?: number | string | null;
    borderTopLeftRadius?: number | string;
    borderTopRightRadius?: number | string;
    borderBottomLeftRadius?: number | string;
    borderBottomRightRadius?: number | string;
    mask?: PhiMaskConfig;
  };

function readImagePreviewMode(value: unknown): PhiImageWidgetPreviewMode {
  const mode = readString(value);
  return mode === "native" || mode === "lightbox" ? mode : "none";
}

function readImageFit(value: unknown): PhiImageWidgetFit {
  const fit = readString(value);
  return fit === "contain" || fit === "fill" ? fit : "cover";
}

export function normalizePhiImageWidgetConfig(config: unknown): PhiCmsImageWidgetConfig {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {
      ...readRenderableBlockConfig({}),
      sourceKind: "url",
      sourceUrl: undefined,
      assetId: undefined,
      variantKey: undefined,
      trusted: false,
      alt: undefined,
      title: undefined,
      fit: "cover",
      objectPosition: undefined,
      sizes: undefined,
      preload: false,
      previewMode: "none",
      overrideSize: false,
      width: undefined,
      height: undefined,
      blurDataUrl: undefined,
      borderTopLeftRadius: undefined,
      borderTopRightRadius: undefined,
      borderBottomLeftRadius: undefined,
      borderBottomRightRadius: undefined,
      mask: undefined,
    };
  }

  const raw = config as Record<string, unknown>;
  const source = readPhiMediaImageSourceConfig(raw);
  const normalized = {
    ...readRenderableBlockConfig(raw),
    trusted: readBoolean(raw.trusted) ?? false,
    alt: readString(raw.alt),
    title: readString(raw.title),
    fit: readImageFit(raw.fit),
    objectPosition: readString(raw.objectPosition),
    sizes: readString(raw.sizes),
    preload: readBoolean(raw.preload) ?? false,
    previewMode: readImagePreviewMode(raw.previewMode),
    overrideSize: readBoolean(raw.overrideSize) ?? false,
    width: readCssSize(raw.width),
    height: readCssSize(raw.height),
    blurDataUrl: readString(raw.blurDataUrl),
    borderTopLeftRadius: readCssSize(raw.borderTopLeftRadius),
    borderTopRightRadius: readCssSize(raw.borderTopRightRadius),
    borderBottomLeftRadius: readCssSize(raw.borderBottomLeftRadius),
    borderBottomRightRadius: readCssSize(raw.borderBottomRightRadius),
    mask: normalizePhiMaskConfig(raw.mask),
  };
  return source.sourceKind === "asset"
    ? { ...normalized, ...source, variantKey: source.variantKey ?? PhiImageAssetVariantKey.Card }
    : { ...normalized, ...source };
}

export function parsePhiCmsImageWidgetConfig(config: Record<string, unknown>): PhiCmsImageWidgetConfig {
  return normalizePhiImageWidgetConfig(config);
}

const IMAGE_VARIANT_OPTIONS = [
  { value: String(PhiImageAssetVariantKey.Thumbnail), label: "Thumbnail" },
  { value: String(PhiImageAssetVariantKey.Preview), label: "Preview" },
  { value: String(PhiImageAssetVariantKey.Banner), label: "Banner" },
  { value: String(PhiImageAssetVariantKey.Header), label: "Header" },
  { value: String(PhiImageAssetVariantKey.Card), label: "Card" },
  { value: String(PhiImageAssetVariantKey.Hero), label: "Hero" },
  { value: String(PhiImageAssetVariantKey.Avatar), label: "Avatar" },
  { value: String(PhiImageAssetVariantKey.Logo), label: "Logo" },
  { value: String(PhiImageAssetVariantKey.Landscape), label: "Landscape" },
  { value: String(PhiImageAssetVariantKey.Portrait), label: "Portrait" },
];

const IMAGE_OBJECT_POSITION_OPTIONS = [
  { value: "center", label: "Center" },
  { value: "top", label: "Top" },
  { value: "right", label: "Right" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "top left", label: "Top Left" },
  { value: "top right", label: "Top Right" },
  { value: "bottom left", label: "Bottom Left" },
  { value: "bottom right", label: "Bottom Right" },
];

export const PHI_IMAGE_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("image"),
  typeKey: "image",
  title: "Image",
  description: "Flexible image renderer for local media, trusted URLs, and on-demand renditions.",
  category: "content",
  iconFamily: "content",
  fields: [
    {
      key: "sourceKind",
      type: "choice",
      label: "Source Kind",
      options: [
        { value: "url", label: "URL" },
        { value: "asset", label: "Asset" },
      ],
    },
    { key: "sourceUrl", type: "url", label: "Source URL", visibleWhen: { field: "sourceKind", equals: "url" } },
    {
      key: "variantKey",
      type: "choice",
      label: "Variant",
      options: IMAGE_VARIANT_OPTIONS,
      emptyOption: { value: "__original__", label: "Original" },
      emptyValue: null,
      visibleWhen: { field: "sourceKind", equals: "asset" },
    },
    { key: "alt", type: "string", label: "Alt Text", visibleWhen: { field: "sourceKind", equals: "url" } },
    { key: "title", type: "string", label: "Title", visibleWhen: { field: "sourceKind", equals: "url" } },
    {
      key: "fit",
      type: "choice",
      label: "Fit",
      options: [
        { value: "cover", label: "Cover" },
        { value: "contain", label: "Contain" },
        { value: "fill", label: "Fill" },
      ],
    },
    { key: "objectPosition", type: "choice", label: "Object Position", options: IMAGE_OBJECT_POSITION_OPTIONS },
    { key: "preload", type: "boolean", label: "Preload" },
    {
      key: "previewMode",
      type: "choice",
      label: "Preview Mode",
      options: [
        { value: "none", label: "Off" },
        { value: "native", label: "Native" },
        { value: "lightbox", label: "Lightbox" },
      ],
    },
    {
      key: "overrideSize",
      type: "boolean",
      label: "Override size",
    },
    {
      key: "radius",
      type: "radius",
      label: "Corner radius",
      topLeftKey: "borderTopLeftRadius",
      topRightKey: "borderTopRightRadius",
      bottomLeftKey: "borderBottomLeftRadius",
      bottomRightKey: "borderBottomRightRadius",
    },
    {
      key: "imageSize",
      type: "dimension",
      label: "Size",
      widthKey: "width",
      heightKey: "height",
      widthPlaceholder: "Width",
      heightPlaceholder: "Height",
      visibleWhen: { field: "overrideSize", equals: true },
    },
  ],
  contentBinding: {
    storage: "asset",
    sourceField: "assetId",
    translatable: true,
    skipWhenConfigFieldValue: { field: "sourceKind", value: "url" },
  },
  defaultConfig: normalizePhiImageWidgetConfig(null),
  parseConfig: parsePhiCmsImageWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsImageWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "runtimeSignals"
  | "fields"
  | "contentBinding"
  | "defaultConfig"
  | "parseConfig"
>;

export const PHI_IMAGE_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Image;
