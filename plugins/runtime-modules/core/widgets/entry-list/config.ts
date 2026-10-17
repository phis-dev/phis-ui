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
  phiContentEntryPartOptions,
  PhiContentEntryPart,
  readPhiContentEntryParts,
} from "../../../../../constants/content-entry-parts";
import {
  readInteger,
  readRenderableBlockConfig,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

/**
 * How the entries stand on the page (`CONTENT_ENTRIES.md`): `stack` is each entry whole, one under the
 * next; `cards` a grid of cards, each leading to its entry's detail Page; `compact` one line of date and
 * title with a teaser under it, for a sidebar or a home page.
 */
export const PHI_ENTRY_LIST_PRESENTATIONS = ["stack", "cards", "compact"] as const;
export type PhiEntryListPresentation = (typeof PHI_ENTRY_LIST_PRESENTATIONS)[number];

/**
 * Where the entries come from: the newest of the kind, or the ones closest to one entry -- a "more like
 * this" list under a detail Page, which names that entry in `relatedTo`.
 */
export const PHI_ENTRY_LIST_SOURCES = ["latest", "related"] as const;
export type PhiEntryListSource = (typeof PHI_ENTRY_LIST_SOURCES)[number];

/** Every part an entry in a list can show. */
const PHI_ENTRY_LIST_PARTS = PhiContentEntryPart.Title | PhiContentEntryPart.Subtitle
  | PhiContentEntryPart.Date | PhiContentEntryPart.Author | PhiContentEntryPart.Avatar
  | PhiContentEntryPart.Category | PhiContentEntryPart.Tags | PhiContentEntryPart.Link;

/** What a list nobody configured shows: what it showed before the parts were a choice. */
export const PHI_ENTRY_LIST_DEFAULT_PARTS = PhiContentEntryPart.Title | PhiContentEntryPart.Subtitle
  | PhiContentEntryPart.Date | PhiContentEntryPart.Tags | PhiContentEntryPart.Link;

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
  presentation: PhiEntryListPresentation;
  /**
   * How many entries at most.
   *
   * A ceiling in the Widget rather than a page parameter: what a Site shows on its list page is a
   * decision it makes once in the Builder, and a visitor who could ask for five hundred entries would be
   * asking the server to render them.
   */
  limit: number;
  /** Which parts of each entry show (`constants/content-entry-parts.ts`). */
  show: number;
  source: PhiEntryListSource;
  /**
   * The entry a `related` list is about, by its address. A detail route's tree writes the route's
   * parameter here; a list with no entry to be related to shows nothing.
   */
  relatedTo: string;
  /** A heading drawn above the entries, and only where there are any; empty for none. */
  title: string;
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
    presentation: (PHI_ENTRY_LIST_PRESENTATIONS as readonly unknown[]).includes(raw.presentation)
      ? raw.presentation as PhiEntryListPresentation
      : "stack",
    limit: readLimit(raw.limit),
    // Absent means the default parts: a Site that never opened the Inspector gets the entry as it was
    // published, tags and link included, rather than a list quietly missing half of what was written.
    show: readPhiContentEntryParts(raw.show, PHI_ENTRY_LIST_PARTS, PHI_ENTRY_LIST_DEFAULT_PARTS),
    source: (PHI_ENTRY_LIST_SOURCES as readonly unknown[]).includes(raw.source)
      ? raw.source as PhiEntryListSource
      : "latest",
    relatedTo: typeof raw.relatedTo === "string" ? raw.relatedTo.trim() : "",
    title: typeof raw.title === "string" ? raw.title.trim() : "",
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
  // The heading is the Site's own words; the entries arrive translated from Core.
  translatesOwnText: true,
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
      key: "presentation",
      type: "choice",
      label: "Presentation",
      options: [
        { value: "stack", label: "Whole entries" },
        { value: "cards", label: "Cards" },
        { value: "compact", label: "Compact" },
      ],
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
    { key: "show", type: "flags", label: "Show", options: phiContentEntryPartOptions(PHI_ENTRY_LIST_PARTS) },
    {
      key: "source",
      type: "choice",
      label: "Source",
      options: [
        { value: "latest", label: "The newest" },
        { value: "related", label: "Related to one entry" },
      ],
    },
    {
      key: "relatedTo",
      type: "string",
      label: "Related to",
      description: "The address of the entry; a detail Page fills it in from its own address.",
      visibleWhen: { field: "source", equals: "related" },
    },
    { key: "title", type: "string", label: "Heading" },
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
  | "translatesOwnText"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
