import {
  readPhiRuntimeDataProviderBinding,
  type PhiRuntimeDataProviderBinding,
} from "../../../../../types/runtime-data-provider";
import { isPhiRecord } from "../../../../../helpers/is-record";
import {
  buildPhiSequenceSettingsFields,
  PHI_SEQUENCE_SETTINGS_DEFAULTS,
  readPhiSequenceSettings,
  type PhiSequenceSettings,
} from "../../../../../components/widgets/config/sequence-settings";
import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../../../../constants/core-data-provider-keys";
import { PHI_CONTENT_ENTRY_CURATION_NONE_CONFIG_KEYS } from "../../../../../components/forms/content-entry-curation-config";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  isPhiContentEntryKind,
  PHI_CONTENT_ENTRY_KINDS,
  type PhiContentEntryKind,
} from "../../../../../constants/content-entry-kinds";
import { readPhiLinkTarget, type PhiLinkTarget } from "../../../../../types/references";
import {
  PHI_ENTRY_LIST_DEFAULT_PARTS,
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
 * title with a teaser under it, for a sidebar or a home page; `slideshow` the same cards a few at a
 * time, moving the way a Gallery moves (`sequence-settings.ts`).
 */
export const PHI_ENTRY_LIST_PRESENTATIONS = ["stack", "cards", "compact", "slideshow"] as const;
export type PhiEntryListPresentation = (typeof PHI_ENTRY_LIST_PRESENTATIONS)[number];

/**
 * Where the entries come from: the newest of the kind, or the ones closest to one entry -- a "more like
 * this" list under a detail Page, bound to that entry's record in `relatedTo`.
 */
export const PHI_ENTRY_LIST_SOURCES = ["latest", "related"] as const;
export type PhiEntryListSource = (typeof PHI_ENTRY_LIST_SOURCES)[number];

/** Every part an entry in a list can show. */
const PHI_ENTRY_LIST_PARTS = PhiContentEntryPart.Title | PhiContentEntryPart.Subtitle
  | PhiContentEntryPart.Date | PhiContentEntryPart.Author | PhiContentEntryPart.Avatar
  | PhiContentEntryPart.Category | PhiContentEntryPart.Tags | PhiContentEntryPart.Link;

export { PHI_ENTRY_LIST_DEFAULT_PARTS };

/** As many as a page can carry without becoming an archive, which is a later address. */
export const PHI_ENTRY_LIST_DEFAULT_LIMIT = 10;
const PHI_ENTRY_LIST_MAX_LIMIT = 50;

export type PhiEntryListWidgetConfig = PhiCmsWidgetConfigBase & PhiSequenceSettings & {
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
   * Which categories a `latest` list shows, by id, and `none` for the entries filed under no category;
   * empty is every entry. An id whose category was deleted since filters nothing -- it is left standing
   * rather than swept, and a list left with only such ids shows every entry again.
   *
   * By id, not by address: a category renamed or given another address is still the one the list was
   * set to (REFERENCES.md says the same of Pages).
   */
  categories: string[];
  /**
   * The entry a `related` list is about, as a record binding (`types/record-provider.ts`) -- the one the
   * header and text above it are bound to, so the three share one read. A detail route's tree writes the
   * route's slug into it; a list with no entry to be related to shows nothing.
   */
  relatedTo: PhiRuntimeDataProviderBinding | null;
  /** A heading drawn above the entries, and only where there are any; empty for none. */
  title: string;
};

/** What the category filter says for the entries filed under no category, as Core's list reads it. */
const PHI_ENTRY_LIST_UNCATEGORIZED = "none";

function readCategories(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const categories = value
    .map((entry) => (typeof entry === "number" ? String(entry) : entry))
    .filter((entry): entry is string =>
      typeof entry === "string" && (entry === PHI_ENTRY_LIST_UNCATEGORIZED || /^[1-9][0-9]{0,9}$/u.test(entry)));
  return [...new Set(categories)];
}

function readLimit(value: unknown) {
  const limit = readInteger(value);
  if (!limit || limit <= 0) {
    return PHI_ENTRY_LIST_DEFAULT_LIMIT;
  }
  return Math.min(limit, PHI_ENTRY_LIST_MAX_LIMIT);
}

function failSequence(key: string, value: unknown, expected: string): never {
  throw new Error(`Invalid Entries ${key} ${JSON.stringify(value)}. Expected ${expected}.`);
}

/** A slideshow's settings, shown only while the list is one. */
const PHI_ENTRY_LIST_SEQUENCE_FIELDS = buildPhiSequenceSettingsFields({
  countLabel: "Visible Entries",
  heading: "Slideshow",
  visibleWhen: { field: "presentation", equals: "slideshow" },
});

export function normalizePhiEntryListWidgetConfig(config: unknown): PhiEntryListWidgetConfig {
  const raw = isPhiRecord(config)
    ? (config as Record<string, unknown>)
    : {};
  return {
    ...readRenderableBlockConfig(raw),
    // Read strictly, as the Gallery reads them: a run that moves other than written is a quiet mistake.
    ...readPhiSequenceSettings(raw, failSequence),
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
    categories: readCategories(raw.categories),
    relatedTo: readPhiRuntimeDataProviderBinding(raw.relatedTo),
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
        { value: "slideshow", label: "Slideshow" },
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
      key: "categories",
      type: "choice",
      mode: "multiple",
      label: "Categories",
      description: "Which categories the list shows. None chosen shows every entry.",
      placeholder: "All categories",
      // The kind's categories, read with the Widget's own `kind`: the Inspector hands the provider the config.
      optionsProvider: {
        providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntryCategoryOptions,
        params: {
          noneValue: PHI_ENTRY_LIST_UNCATEGORIZED,
          [PHI_CONTENT_ENTRY_CURATION_NONE_CONFIG_KEYS.category]: "Filed under none",
        },
      },
      visibleWhen: { field: "source", notEquals: "related" },
    },
    {
      key: "relatedTo",
      type: "data-provider",
      providerKind: "record",
      providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntry,
      label: "Related to",
      description: "The entry; a detail Page binds it to its own.",
      visibleWhen: { field: "source", equals: "related" },
    },
    { key: "title", type: "string", label: "Heading" },
    ...PHI_ENTRY_LIST_SEQUENCE_FIELDS.window,
    ...PHI_ENTRY_LIST_SEQUENCE_FIELDS.movement,
    ...PHI_ENTRY_LIST_SEQUENCE_FIELDS.controls,
  ],
  defaultConfig: { ...normalizePhiEntryListWidgetConfig(null), ...PHI_SEQUENCE_SETTINGS_DEFAULTS },
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
