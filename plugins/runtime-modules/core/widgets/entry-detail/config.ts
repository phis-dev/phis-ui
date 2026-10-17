import { isPhiRecord } from "../../../../../helpers/is-record";
import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  isPhiContentEntryKind,
  PHI_CONTENT_ENTRY_KINDS,
  type PhiContentEntryKind,
} from "../../../../../constants/content-entry-kinds";
import {
  readBoolean,
  readRenderableBlockConfig,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

export type PhiEntryDetailWidgetConfig = PhiCmsWidgetConfigBase & {
  /** Which content kind the entry is of (`CONTENT_ENTRIES.md`). */
  kind: PhiContentEntryKind;
  /**
   * The entry's address. A detail route's tree writes the route's parameter here; a Site that places the
   * Widget on a Page of its own names one entry by it.
   */
  slug: string;
  /** Whether the entry shows the tags it was published with. */
  showTags: boolean;
  /** Whether an entry that carries a link shows it as an action. */
  showLinks: boolean;
};

export function normalizePhiEntryDetailWidgetConfig(config: unknown): PhiEntryDetailWidgetConfig {
  const raw = isPhiRecord(config) ? (config as Record<string, unknown>) : {};
  return {
    ...readRenderableBlockConfig(raw),
    // A new detail shows News until somebody picks its kind in the Inspector.
    kind: isPhiContentEntryKind(raw.kind) ? raw.kind : "news",
    slug: typeof raw.slug === "string" ? raw.slug.trim() : "",
    showTags: readBoolean(raw.showTags) ?? true,
    showLinks: readBoolean(raw.showLinks) ?? true,
  };
}

export const PHI_ENTRY_DETAIL_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("entry-detail"),
  typeKey: "entry-detail",
  title: "Entry",
  description: "One published entry of a content kind, read while the page is drawn.",
  category: "content",
  tags: ["news", "blog", "content", "detail"],
  icon: "antd:read",
  slotSizePolicy: "fill-inline",
  fields: [
    {
      key: "kind",
      type: "choice",
      label: "Kind",
      options: PHI_CONTENT_ENTRY_KINDS.map((kind) => ({ value: kind, label: kind })),
    },
    { key: "slug", type: "string", label: "Address" },
    { key: "showTags", type: "boolean", label: "Show tags" },
    { key: "showLinks", type: "boolean", label: "Show link" },
  ],
  defaultConfig: normalizePhiEntryDetailWidgetConfig(null),
  parseConfig: (config: Record<string, unknown>) => normalizePhiEntryDetailWidgetConfig(config),
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiEntryDetailWidgetConfig>,
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
