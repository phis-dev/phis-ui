import { isPhiRecord } from "../../../../../helpers/is-record";
import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { readPhiContentEntryRecordBinding } from "../../../../../helpers/content-entry-record-binding";
import type { PhiRuntimeDataProviderBinding } from "../../../../../types/runtime-data-provider";
import {
  phiContentEntryPartOptions,
  PhiContentEntryPart,
  readPhiContentEntryParts,
} from "../../../../../constants/content-entry-parts";
import {
  readRenderableBlockConfig,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

/**
 * What the body shows after the text. The meta -- title, byline, category -- is the header's
 * (`entry-header`), so a detail Page states each part once.
 */
const PHI_ENTRY_DETAIL_PARTS = PhiContentEntryPart.Tags | PhiContentEntryPart.Link;

export type PhiEntryDetailWidgetConfig = PhiCmsWidgetConfigBase & {
  /**
   * The entry, as a record binding (`types/record-provider.ts`): the content entry Provider with the kind
   * and address. A detail route's tree writes the route's slug into it; a Site's own Page names one entry.
   */
  entry: PhiRuntimeDataProviderBinding;
  /** Which parts show after the text (`constants/content-entry-parts.ts`). */
  show: number;
};

export function normalizePhiEntryDetailWidgetConfig(config: unknown): PhiEntryDetailWidgetConfig {
  const raw = isPhiRecord(config) ? (config as Record<string, unknown>) : {};
  return {
    ...readRenderableBlockConfig(raw),
    entry: readPhiContentEntryRecordBinding(raw.entry),
    show: readPhiContentEntryParts(raw.show, PHI_ENTRY_DETAIL_PARTS, PHI_ENTRY_DETAIL_PARTS),
  };
}

export const PHI_ENTRY_DETAIL_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("entry-detail"),
  typeKey: "entry-detail",
  title: "Entry text",
  description: "The text of one published entry of a content kind, read while the page is drawn.",
  category: "content",
  tags: ["news", "blog", "content", "detail"],
  icon: "antd:read",
  slotSizePolicy: "fill-inline",
  fields: [
    { key: "entry", type: "data-provider", providerKind: "record", label: "Entry" },
    { key: "show", type: "flags", label: "Show", options: phiContentEntryPartOptions(PHI_ENTRY_DETAIL_PARTS) },
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
