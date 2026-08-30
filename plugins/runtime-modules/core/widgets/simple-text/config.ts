import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PHI_RENDERABLE_BLOCK_GEOMETRY_FIELDS } from "../../../../../helpers/renderable-block-plugin-fields";
import type { PhiCmsResolvedContent, PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiWidgetFontFamilyKey, PhiWidgetFontSizeKey } from "../../../../../types/site-theme";
import {
  readBoolean,
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

export type PhiCmsSimpleTextWidgetConfig = PhiCmsWidgetConfigBase & {
  text?: string;
  href?: string;
  icon?: string;
  color?: string;
  fontFamily?: PhiWidgetFontFamilyKey;
  fontSize?: PhiWidgetFontSizeKey;
  external?: boolean;
  newTab?: boolean;
  type?: "secondary" | "success" | "warning" | "danger";
  strong?: boolean;
  italic?: boolean;
  underline?: boolean;
  delete?: boolean;
  disabled?: boolean;
  code?: boolean;
};

export function parsePhiCmsSimpleTextWidgetConfig(
  config: Record<string, unknown>,
): PhiCmsSimpleTextWidgetConfig {
  const renderableBlockConfig = readRenderableBlockConfig(config);

  return {
    ...renderableBlockConfig,
    size: renderableBlockConfig.size ?? { width: "fit-content", height: "auto" },
    maxSize: {
      ...(renderableBlockConfig.maxSize ?? {}),
      ...(renderableBlockConfig.maxSize?.width == null ? { width: "100%" } : {}),
    },
    text: readString(config.text),
    href: readString(config.href),
    icon: readString(config.icon),
    color: readString(config.color),
    fontFamily: ((): PhiCmsSimpleTextWidgetConfig["fontFamily"] => {
      const value = readString(config.fontFamily);
      return value === "inherit" ||
        value === "system" ||
        value === "body" ||
        value === "mono" ||
        value === "serif" ||
        value === "accent" ||
        value === "display"
        ? value
        : undefined;
    })(),
    fontSize: ((): PhiCmsSimpleTextWidgetConfig["fontSize"] => {
      const value = readString(config.fontSize);
      return value === "inherit" || value === "xs" || value === "sm" || value === "base" || value === "lg" || value === "xl"
        ? value
        : undefined;
    })(),
    external: readBoolean(config.external),
    newTab: readBoolean(config.newTab),
    type: ((): PhiCmsSimpleTextWidgetConfig["type"] => {
      const value = readString(config.type);
      return value === "secondary" || value === "success" || value === "warning" || value === "danger"
        ? value
        : undefined;
    })(),
    strong: readBoolean(config.strong),
    italic: readBoolean(config.italic),
    underline: readBoolean(config.underline),
    delete: readBoolean(config.delete),
    disabled: readBoolean(config.disabled),
    code: readBoolean(config.code),
  };
}

export type PhiSimpleTextWidgetRenderableConfig = PhiCmsSimpleTextWidgetConfig & {
  label?: string;
  resolvedContent?: PhiCmsResolvedContent | null;
};

export const PHI_SIMPLE_TEXT_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("simple-text"),
  typeKey: "simple-text",
  title: "Simple Text",
  category: "content",
  description: "Plain text or a single link with optional icon and text styling.",
  iconFamily: "basic",
  contentBinding: {
    storage: "text",
    sourceField: "text",
    translatable: true,
  },
  fields: [
    ...PHI_RENDERABLE_BLOCK_GEOMETRY_FIELDS,
    { key: "text", type: "string", label: "Text", required: true },
    { key: "href", type: "url", label: "Href" },
    { key: "icon", type: "icon", label: "Icon", editorPlacement: "toolbar" },
    { key: "color", type: "color", label: "Color", mode: "single", editorPlacement: "toolbar" },
    {
      key: "fontFamily",
      type: "choice",
      label: "Font Family",
      editorPlacement: "toolbar",
      options: [
        { value: "inherit", label: "Inherit" },
        { value: "system", label: "System" },
        { value: "body", label: "Body" },
        { value: "mono", label: "Mono" },
        { value: "serif", label: "Serif" },
        { value: "accent", label: "Accent" },
        { value: "display", label: "Display" },
      ],
    },
    {
      key: "fontSize",
      type: "choice",
      label: "Font Size",
      editorPlacement: "toolbar",
      options: [
        { value: "inherit", label: "Inherit" },
        { value: "xs", label: "XS" },
        { value: "sm", label: "SM" },
        { value: "base", label: "Base" },
        { value: "lg", label: "LG" },
        { value: "xl", label: "XL" },
      ],
    },
    {
      key: "type",
      type: "choice",
      label: "Type",
      options: [
        { value: "secondary", label: "Secondary" },
        { value: "success", label: "Success" },
        { value: "warning", label: "Warning" },
        { value: "danger", label: "Danger" },
      ],
    },
    { key: "external", type: "boolean", label: "External" },
    { key: "newTab", type: "boolean", label: "Open In New Tab" },
    { key: "strong", type: "boolean", label: "Strong", editorPlacement: "toolbar" },
    { key: "italic", type: "boolean", label: "Italic", editorPlacement: "toolbar" },
    { key: "underline", type: "boolean", label: "Underline", editorPlacement: "toolbar" },
    { key: "delete", type: "boolean", label: "Delete", editorPlacement: "toolbar" },
    { key: "disabled", type: "boolean", label: "Disabled" },
    { key: "code", type: "boolean", label: "Code", editorPlacement: "toolbar" },
  ],
  defaultConfig: {
    size: {
      width: "fit-content",
      height: "auto",
    },
    maxSize: {
      width: "100%",
    },
  },
  parseConfig: parsePhiCmsSimpleTextWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsSimpleTextWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "runtimeSignals"
  | "contentBinding"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;

export function resolvePhiSimpleTextWidgetText(
  config: PhiSimpleTextWidgetRenderableConfig | undefined,
  options?: {
    preferSource?: boolean;
    preferConfigText?: boolean;
  },
  fallbackText = "Text",
) {
  if (options?.preferConfigText && typeof config?.text === "string" && config.text.trim().length > 0) {
    return config.text;
  }

  const resolvedField = config?.resolvedContent?.textFields.text;
  if (resolvedField) {
    return options?.preferSource ? resolvedField.source : resolvedField.value;
  }

  return config?.text ?? config?.label ?? fallbackText;
}

export const PHI_SIMPLE_TEXT_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.SimpleText;
