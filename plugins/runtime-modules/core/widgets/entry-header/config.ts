import { isPhiRecord } from "../../../../../helpers/is-record";
import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  isPhiContentEntryKind,
  PHI_CONTENT_ENTRY_KINDS,
  type PhiContentEntryKind,
} from "../../../../../constants/content-entry-kinds";
import {
  phiContentEntryPartOptions,
  PhiContentEntryPart,
  readPhiContentEntryParts,
} from "../../../../../constants/content-entry-parts";
import {
  readRenderableBlockConfig,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

/** Everything about an entry that is not its text: the parts a header can show. */
const PHI_ENTRY_HEADER_PARTS = PhiContentEntryPart.Title | PhiContentEntryPart.Subtitle
  | PhiContentEntryPart.Date | PhiContentEntryPart.Author | PhiContentEntryPart.Avatar
  | PhiContentEntryPart.Category | PhiContentEntryPart.Tags;

/** An article's opening: what it is filed under, its title and teaser, who wrote it and when. */
const PHI_ENTRY_HEADER_DEFAULT_PARTS = PhiContentEntryPart.Title | PhiContentEntryPart.Subtitle
  | PhiContentEntryPart.Date | PhiContentEntryPart.Author | PhiContentEntryPart.Avatar
  | PhiContentEntryPart.Category;

export type PhiEntryHeaderWidgetConfig = PhiCmsWidgetConfigBase & {
  /** Which content kind the entry is of (`CONTENT_ENTRIES.md`). */
  kind: PhiContentEntryKind;
  /** The entry's address; a detail route's tree writes the route's parameter here. */
  slug: string;
  /** Which parts show (`constants/content-entry-parts.ts`). */
  show: number;
  /**
   * How high the title stands. `h1` on the entry's own Page, where it is the Page's title; `h2` where a
   * Site places the header under a heading of its own. Spelled as the Card spells its heading level.
   */
  titleLevel: "h1" | "h2";
  align: "start" | "center";
};

export function normalizePhiEntryHeaderWidgetConfig(config: unknown): PhiEntryHeaderWidgetConfig {
  const raw = isPhiRecord(config) ? (config as Record<string, unknown>) : {};
  return {
    ...readRenderableBlockConfig(raw),
    kind: isPhiContentEntryKind(raw.kind) ? raw.kind : "news",
    slug: typeof raw.slug === "string" ? raw.slug.trim() : "",
    show: readPhiContentEntryParts(raw.show, PHI_ENTRY_HEADER_PARTS, PHI_ENTRY_HEADER_DEFAULT_PARTS),
    titleLevel: raw.titleLevel === "h2" ? "h2" : "h1",
    align: raw.align === "center" ? "center" : "start",
  };
}

export const PHI_ENTRY_HEADER_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("entry-header"),
  typeKey: "entry-header",
  title: "Entry header",
  description: "The opening of one published entry: category, title, subtitle, author and date.",
  category: "content",
  tags: ["news", "blog", "content", "detail", "header", "author"],
  icon: "antd:profile",
  slotSizePolicy: "fill-inline",
  fields: [
    {
      key: "kind",
      type: "choice",
      label: "Kind",
      options: PHI_CONTENT_ENTRY_KINDS.map((kind) => ({ value: kind, label: kind })),
    },
    { key: "slug", type: "string", label: "Address" },
    { key: "show", type: "flags", label: "Show", options: phiContentEntryPartOptions(PHI_ENTRY_HEADER_PARTS) },
    {
      key: "titleLevel",
      type: "choice",
      label: "Title level",
      options: [{ value: "h1", label: "Page title (h1)" }, { value: "h2", label: "Section (h2)" }],
    },
    {
      key: "align",
      type: "choice",
      label: "Alignment",
      options: [{ value: "start", label: "Start" }, { value: "center", label: "Centre" }],
    },
  ],
  defaultConfig: normalizePhiEntryHeaderWidgetConfig(null),
  parseConfig: (config: Record<string, unknown>) => normalizePhiEntryHeaderWidgetConfig(config),
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiEntryHeaderWidgetConfig>,
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
