import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PHI_SIMPLE_TEXT_MARKS, type PhiSimpleTextMark } from "../../../../../types/core-widget-placements";
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
import {
  PHI_WIDGET_FONT_FAMILY_OPTIONS,
  readPhiWidgetFontFamily,
} from "../../../../../components/widgets/helpers/font-family";
import {
  PHI_WIDGET_FONT_SIZE_OPTIONS,
  readPhiWidgetFontSize,
} from "../../../../../components/widgets/helpers/font-size";
import {
  PHI_TEXT_TONE_FIELD_OPTIONS,
  readPhiTextTone,
  type PhiTextTone,
} from "../../../../../components/widgets/config/text-tone";

function readSimpleTextMarks(value: unknown): PhiSimpleTextMark[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return PHI_SIMPLE_TEXT_MARKS.filter((mark) => value.includes(mark));
}

export function hasPhiSimpleTextMark(
  config: { marks?: readonly PhiSimpleTextMark[] } | null | undefined,
  mark: PhiSimpleTextMark,
) {
  return config?.marks?.includes(mark) === true;
}

export type PhiCmsSimpleTextWidgetConfig = PhiCmsWidgetConfigBase & {
  text?: string;
  href?: string;
  icon?: string;
  color?: string;
  fontFamily?: PhiWidgetFontFamilyKey;
  fontSize?: PhiWidgetFontSizeKey;
  external?: boolean;
  newTab?: boolean;
  tone?: PhiTextTone;
  marks?: PhiSimpleTextMark[];
  disabled?: boolean;
};

export function parsePhiCmsSimpleTextWidgetConfig(
  config: Record<string, unknown>,
): PhiCmsSimpleTextWidgetConfig {
  const renderableBlockConfig = readRenderableBlockConfig(config);

  return {
    ...renderableBlockConfig,
    text: readString(config.text),
    href: readString(config.href),
    icon: readString(config.icon),
    color: readString(config.color),
    fontFamily: readPhiWidgetFontFamily(config.fontFamily),
    fontSize: readPhiWidgetFontSize(config.fontSize),
    external: readBoolean(config.external),
    newTab: readBoolean(config.newTab),
    tone: readPhiTextTone(config.tone),
    marks: readSimpleTextMarks(config.marks),
    disabled: readBoolean(config.disabled),
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
  translatesOwnText: true,
  slotSizePolicy: "intrinsic",
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
      options: [...PHI_WIDGET_FONT_FAMILY_OPTIONS],
    },
    {
      key: "fontSize",
      type: "choice",
      label: "Font Size",
      editorPlacement: "toolbar",
      options: [...PHI_WIDGET_FONT_SIZE_OPTIONS],
    },
    {
      key: "tone",
      type: "choice",
      label: "Tone",
      options: [...PHI_TEXT_TONE_FIELD_OPTIONS],
    },
    { key: "external", type: "boolean", label: "External" },
    { key: "newTab", type: "boolean", label: "Open In New Tab" },
    { key: "marks", type: "string", label: "Marks", editorPlacement: "toolbar" },
    { key: "disabled", type: "boolean", label: "Disabled" },
  ],
  defaultConfig: {
    /*
     * No size: the `intrinsic` slot policy already draws a text as wide as its content
     * (`slot-size-policy.ts`), and a *stated* size means something else -- it fixes the axis and takes
     * the child out of its Layout's hands. The cap is the one thing worth saying, and it says only
     * "never wider than the slot".
     */
    maxSize: {
      width: "100%",
    },
  },
  parseConfig: parsePhiCmsSimpleTextWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsSimpleTextWidgetConfig>,
  | "translatesOwnText"
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "slotSizePolicy"
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
