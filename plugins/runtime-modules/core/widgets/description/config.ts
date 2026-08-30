import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { readRenderableBlockConfig, readString, type PhiCmsWidgetConfigBase } from "../../../../../components/widgets/config/parser-primitives";

export type PhiCmsDescriptionWidgetConfig = PhiCmsWidgetConfigBase & {
  eyebrow?: string;
  title?: string;
  description?: string;
  asideTitle?: string;
  asideItems?: string[];
  footer?: string;
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
  };
}

export const PHI_DESCRIPTION_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("description"),
  typeKey: "description",
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
  ],
  parseConfig: parsePhiCmsDescriptionWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsDescriptionWidgetConfig>,
  "kind" | "pluginKey" | "typeKey" | "title" | "description" | "category" | "iconFamily" | "fields" | "parseConfig"
>;

export const PHI_DESCRIPTION_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Description;
