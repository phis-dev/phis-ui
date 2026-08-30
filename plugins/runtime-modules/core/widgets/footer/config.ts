import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { readRenderableBlockConfig, readString, type PhiCmsWidgetConfigBase } from "../../../../../components/widgets/config/parser-primitives";

export type PhiCmsFooterWidgetConfig = PhiCmsWidgetConfigBase & {
  brandTitle?: string;
  brandText?: string;
  contactEmailValue?: string;
  contactEmailHref?: string;
  locationValue?: string;
  note?: string;
};

export function parsePhiCmsFooterWidgetConfig(config: Record<string, unknown>): PhiCmsFooterWidgetConfig {
  return {
    ...readRenderableBlockConfig(config),
    brandTitle: readString(config.brandTitle),
    brandText: readString(config.brandText),
    contactEmailValue: readString(config.contactEmailValue),
    contactEmailHref: readString(config.contactEmailHref),
    locationValue: readString(config.locationValue),
    note: readString(config.note),
  };
}

export const PHI_FOOTER_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("footer"),
  typeKey: "footer",
  title: "Footer",
  category: "content",
  description: "Legacy footer widget with brand, links and contact data.",
  iconFamily: "content",
  slotSizePolicy: "fill-inline",
  fields: [
    { key: "brandTitle", type: "string", label: "Brand Title" },
    { key: "brandText", type: "string", label: "Brand Text" },
    { key: "contactEmailValue", type: "string", label: "Contact Email" },
    { key: "contactEmailHref", type: "url", label: "Contact Email Href" },
    { key: "locationValue", type: "string", label: "Location" },
    { key: "note", type: "string", label: "Note" },
  ],
  parseConfig: parsePhiCmsFooterWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsFooterWidgetConfig>,
  "kind" | "pluginKey" | "typeKey" | "title" | "description" | "category" | "iconFamily" | "slotSizePolicy" | "fields" | "parseConfig"
>;

export const PHI_FOOTER_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Footer;
