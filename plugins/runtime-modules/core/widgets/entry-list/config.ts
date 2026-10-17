import { isPhiRecord } from "../../../../../helpers/is-record";
import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  isPhiContentEntryKind,
  PHI_CONTENT_ENTRY_KINDS,
  type PhiContentEntryKind,
} from "../../../../../constants/content-entry-kinds";
import { readPhiLinkTarget, type PhiLinkTarget } from "../../../../../types/references";
import {
  readBoolean,
  readInteger,
  readRenderableBlockConfig,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

/** As many as a page can carry without becoming an archive, which is a later address. */
export const PHI_ENTRY_LIST_DEFAULT_LIMIT = 10;
const PHI_ENTRY_LIST_MAX_LIMIT = 50;

export type PhiEntryListWidgetConfig = PhiCmsWidgetConfigBase & {
  /** Which content kind's entries (`CONTENT_ENTRIES.md`). */
  kind: PhiContentEntryKind;
  /**
   * Where an entry's title leads: the kind's detail route, a Page target the slug fills per entry
   * (REFERENCES.md). Absent, or a route that does not resolve, and the titles are not links.
   */
  detailLinkTarget?: PhiLinkTarget;
  /**
   * How many entries at most.
   *
   * A ceiling in the Widget rather than a page parameter: what a Site shows on its list page is a
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
    return PHI_ENTRY_LIST_DEFAULT_LIMIT;
  }
  return Math.min(limit, PHI_ENTRY_LIST_MAX_LIMIT);
}

export function normalizePhiEntryListWidgetConfig(config: unknown): PhiEntryListWidgetConfig {
  const raw = isPhiRecord(config)
    ? (config as Record<string, unknown>)
    : {};
  return {
    ...readRenderableBlockConfig(raw),
    // A new list shows News until somebody picks its kind in the Inspector.
    kind: isPhiContentEntryKind(raw.kind) ? raw.kind : "news",
    detailLinkTarget: readPhiLinkTarget(raw.detailLinkTarget) ?? undefined,
    limit: readLimit(raw.limit),
    // Absent means shown: a Site that never opened the Inspector gets the entry as it was published,
    // tags and link included, rather than a list quietly missing half of what was written. `readBoolean`
    // answers `undefined` for anything that is not a boolean, which is the same case as absent.
    showTags: readBoolean(raw.showTags) ?? true,
    showLinks: readBoolean(raw.showLinks) ?? true,
  };
}

function parsePhiEntryListWidgetConfig(config: Record<string, unknown>): PhiEntryListWidgetConfig {
  return normalizePhiEntryListWidgetConfig(config);
}

export const PHI_ENTRY_LIST_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("entry-list"),
  typeKey: "entry-list",
  title: "Entries",
  description: "A content kind's published entries -- News, Blog -- read while the page is drawn.",
  category: "content",
  tags: ["news", "blog", "content", "list"],
  icon: "antd:read",
  slotSizePolicy: "fill-inline",
  fields: [
    {
      key: "kind",
      type: "choice",
      label: "Kind",
      options: PHI_CONTENT_ENTRY_KINDS.map((kind) => ({ value: kind, label: kind })),
    },
    {
      key: "detailLinkTarget",
      type: "link-target",
      heading: "Entry link",
      label: "Detail page",
    },
    {
      key: "limit",
      type: "number",
      label: "Entries",
      description: `How many at most. ${PHI_ENTRY_LIST_DEFAULT_LIMIT} by default, ${PHI_ENTRY_LIST_MAX_LIMIT} at the very most.`,
    },
    { key: "showTags", type: "boolean", label: "Show tags" },
    { key: "showLinks", type: "boolean", label: "Show links" },
  ],
  defaultConfig: normalizePhiEntryListWidgetConfig(null),
  parseConfig: parsePhiEntryListWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiEntryListWidgetConfig>,
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
