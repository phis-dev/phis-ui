import { isPhiRecord } from "../../../../../helpers/is-record";
import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  readBoolean,
  readInteger,
  readRenderableBlockConfig,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

/** As many as a page can carry without becoming an archive, which is a later address. */
export const PHI_NEWS_LIST_DEFAULT_LIMIT = 10;
const PHI_NEWS_LIST_MAX_LIMIT = 50;

export type PhiNewsListWidgetConfig = PhiCmsWidgetConfigBase & {
  /**
   * How many entries at most.
   *
   * A ceiling in the Widget rather than a page parameter: what a Site shows on its News page is a
   * decision it makes once in the Builder, and a visitor who could ask for five hundred entries would be
   * asking the server to render them.
   */
  limit: number;
  /** Whether each entry shows the tags it was published with. */
  showTags: boolean;
  /** Whether an entry that carries a link shows it as an action. */
  showLinks: boolean;
};

function readLimit(value: unknown) {
  const limit = readInteger(value);
  if (!limit || limit <= 0) {
    return PHI_NEWS_LIST_DEFAULT_LIMIT;
  }
  return Math.min(limit, PHI_NEWS_LIST_MAX_LIMIT);
}

export function normalizePhiNewsListWidgetConfig(config: unknown): PhiNewsListWidgetConfig {
  const raw = isPhiRecord(config)
    ? (config as Record<string, unknown>)
    : {};
  return {
    ...readRenderableBlockConfig(raw),
    limit: readLimit(raw.limit),
    // Absent means shown: a Site that never opened the Inspector gets the entry as it was published,
    // tags and link included, rather than a list quietly missing half of what was written. `readBoolean`
    // answers `undefined` for anything that is not a boolean, which is the same case as absent.
    showTags: readBoolean(raw.showTags) ?? true,
    showLinks: readBoolean(raw.showLinks) ?? true,
  };
}

export function parsePhiNewsListWidgetConfig(config: Record<string, unknown>): PhiNewsListWidgetConfig {
  return normalizePhiNewsListWidgetConfig(config);
}

export const PHI_NEWS_LIST_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("news-list"),
  typeKey: "news-list",
  title: "News",
  description: "The Site's published news entries, read while the page is drawn.",
  category: "content",
  tags: ["news", "content", "list"],
  icon: "antd:notification",
  slotSizePolicy: "fill-inline",
  fields: [
    {
      key: "limit",
      type: "number",
      label: "Entries",
      description: `How many at most. ${PHI_NEWS_LIST_DEFAULT_LIMIT} by default, ${PHI_NEWS_LIST_MAX_LIMIT} at the very most.`,
    },
    { key: "showTags", type: "boolean", label: "Show tags" },
    { key: "showLinks", type: "boolean", label: "Show links" },
  ],
  defaultConfig: normalizePhiNewsListWidgetConfig(null),
  parseConfig: parsePhiNewsListWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiNewsListWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "tags"
  | "icon"
  | "slotSizePolicy"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
