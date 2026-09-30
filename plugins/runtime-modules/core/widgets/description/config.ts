import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { readRenderableBlockConfig, readString, type PhiCmsWidgetConfigBase } from "../../../../../components/widgets/config/parser-primitives";
import {
  PHI_TEXT_TONE_FIELD_OPTIONS,
  readPhiTextTone,
  type PhiTextTone,
} from "../../../../../components/widgets/config/text-tone";

export type PhiCmsDescriptionWidgetConfig = PhiCmsWidgetConfigBase & {
  eyebrow?: string;
  title?: string;
  description?: string;
  asideTitle?: string;
  asideItems?: string[];
  footer?: string;
  /** The tone of the description text; absent is the default secondary text. */
  tone?: PhiTextTone;
};

export function parsePhiCmsDescriptionWidgetConfig(
  config: Record<string, unknown>,
): PhiCmsDescriptionWidgetConfig {
  const asideItemsRaw = Array.isArray(config.asideItems) ? config.asideItems : [];

  return {
    ...readRenderableBlockConfig(config),
    eyebrow: readString(config.eyebrow),
    title: readString(config.title),
    description: readString(config.description),
    asideTitle: readString(config.asideTitle),
    asideItems: asideItemsRaw
      .map((item) => (typeof item === "string" ? item : undefined))
      .filter((item): item is string => item != null),
    footer: readString(config.footer),
    tone: readPhiTextTone(config.tone),
  };
}

export const PHI_DESCRIPTION_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("description"),
  typeKey: "description",
  translatesOwnText: true,
  slotSizePolicy: "intrinsic",
  title: "Description",
  category: "content",
  description: "Introductory text block with eyebrow, title, body, bullet list, and footer.",
  iconFamily: "basic",
  fields: [
    { key: "eyebrow", type: "string", label: "Eyebrow" },
    { key: "title", type: "string", label: "Title" },
    { key: "description", type: "string", label: "Description" },
    { key: "asideTitle", type: "string", label: "Aside Title" },
    { key: "asideItems", type: "string", label: "Aside Items", editorPlacement: "toolbar" },
    { key: "footer", type: "string", label: "Footer" },
    { key: "tone", type: "choice", label: "Tone", options: [...PHI_TEXT_TONE_FIELD_OPTIONS] },
  ],
  parseConfig: parsePhiCmsDescriptionWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsDescriptionWidgetConfig>,
  "translatesOwnText" | "kind" | "pluginKey" | "typeKey" | "slotSizePolicy" | "title" | "description" | "category" | "iconFamily" | "fields" | "parseConfig"
>;

export const PHI_DESCRIPTION_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Description;
