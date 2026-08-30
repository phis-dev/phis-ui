import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";

export type PhiPageTitleWidgetConfig = Record<string, never>;

function parsePhiPageTitleWidgetConfig(): PhiPageTitleWidgetConfig {
  return {};
}

export const PHI_PAGE_TITLE_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("page-title"),
  typeKey: "page-title",
  title: "Page title",
  category: "content",
  description: "Displays the current localized CMS page title from runtime metadata.",
  iconFamily: "basic",
  fields: [],
  parseConfig: parsePhiPageTitleWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiPageTitleWidgetConfig>,
  "kind" | "pluginKey" | "typeKey" | "title" | "description" | "category" | "iconFamily" | "fields" | "parseConfig"
>;
