import { PHI_SEARCH_DEFAULT_LIMIT, PHI_SEARCH_MAX_LIMIT } from "@phis/contracts/search";

import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { readClampedPositiveInteger, readRenderableBlockConfig, readString, type PhiCmsWidgetConfigBase } from "../../../../../components/widgets/config/parser-primitives";

/**
 * The Pages matching the query in the page's URL (SEARCH.md), read from Core while the page is drawn.
 *
 * It searches where it stands: on a Public Page the Public Area, on an App Page the App and Public
 * Areas -- nobody reaches the App without signing in, and a member who did may search both. The query
 * comes from the URL alone, so the page is never static and a pasted link answers like a typed search.
 */
export type PhiSearchResultsWidgetConfig = PhiCmsWidgetConfigBase & {
  /** How many hits at most; a ceiling the Site sets once, not a parameter a visitor raises. */
  limit: number;
  /** A heading over the hits in the author's words; empty for the label set's, which names the query. */
  title: string;
};

function normalizePhiSearchResultsWidgetConfig(raw: Record<string, unknown>): PhiSearchResultsWidgetConfig {
  return {
    ...readRenderableBlockConfig(raw),
    limit: readClampedPositiveInteger(raw.limit, PHI_SEARCH_DEFAULT_LIMIT, PHI_SEARCH_MAX_LIMIT),
    title: readString(raw.title)?.trim() ?? "",
  };
}

export const PHI_SEARCH_RESULTS_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("search-results"),
  typeKey: "search-results",
  title: "Search Results",
  description: "The Site's pages matching the search in the page's address, best first.",
  category: "content",
  tags: ["search", "results", "find"],
  translatesOwnText: true,
  icon: "antd:search",
  slotSizePolicy: "fill-inline",
  fields: [
    {
      key: "limit",
      type: "number",
      label: "Hits",
      description: `How many at most. ${PHI_SEARCH_DEFAULT_LIMIT} by default, ${PHI_SEARCH_MAX_LIMIT} at the very most.`,
    },
    { key: "title", type: "string", label: "Heading", description: "Empty names the query." },
  ],
  defaultConfig: normalizePhiSearchResultsWidgetConfig({}),
  parseConfig: normalizePhiSearchResultsWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiSearchResultsWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "tags"
  | "icon"
  | "slotSizePolicy"
  | "translatesOwnText"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
