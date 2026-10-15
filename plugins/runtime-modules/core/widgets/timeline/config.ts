import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { isPhiRecord } from "../../../../../helpers/is-record";
import {
  readBoolean,
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";
import {
  PHI_TEXT_TONE_FIELD_OPTIONS,
  readPhiTextTone,
  type PhiTextTone,
} from "../../../../../components/widgets/config/text-tone";

export type PhiTimelineWidgetEntry = {
  key: string;
  title?: string;
  content: string;
  /** When it happened, as the author writes it: "March 2026", "Yesterday", "v1.2". */
  time?: string;
  icon?: string;
  tone?: PhiTextTone;
  pending?: boolean;
};

export type PhiTimelineWidgetConfig = PhiCmsWidgetConfigBase & {
  entries: PhiTimelineWidgetEntry[];
  placement?: "start" | "end" | "alternate";
};

function readTimelineEntry(value: unknown): PhiTimelineWidgetEntry | null {
  if (!isPhiRecord(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const key = readString(record.key);
  if (!key) {
    return null;
  }
  return {
    key,
    title: readString(record.title),
    content: readString(record.content) ?? "",
    time: readString(record.time),
    icon: readString(record.icon),
    tone: readPhiTextTone(record.tone),
    pending: readBoolean(record.pending),
  };
}

function readTimelinePlacement(value: unknown): PhiTimelineWidgetConfig["placement"] {
  const placement = readString(value);
  return placement === "end" || placement === "alternate" ? placement : "start";
}

function parsePhiTimelineWidgetConfig(config: Record<string, unknown>): PhiTimelineWidgetConfig {
  return {
    ...readRenderableBlockConfig(config),
    entries: Array.isArray(config.entries)
      ? config.entries.map(readTimelineEntry).filter((entry): entry is PhiTimelineWidgetEntry => entry != null)
      : [],
    placement: readTimelinePlacement(config.placement),
  };
}

export const PHI_TIMELINE_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("timeline"),
  typeKey: "timeline",
  translatesOwnText: true,
  title: "Timeline",
  description: "What happened, in order: entries with a time, a title and a line of text.",
  category: "content",
  icon: "antd:history-outlined",
  iconFamily: "basic",
  slotSizePolicy: "intrinsic",
  fields: [
    {
      key: "entries",
      type: "collection",
      label: "Entries",
      itemKeyField: "key",
      itemLabelField: "title",
      defaultItem: { key: "entry", title: "Entry", content: "" },
      addLabel: "Add entry",
      emptyLabel: "No entries",
      reorderable: true,
      itemFields: [
        { key: "key", type: "string", label: "Key", required: true },
        { key: "time", type: "string", label: "Time" },
        { key: "title", type: "string", label: "Title" },
        { key: "content", type: "string", label: "Text" },
        { key: "icon", type: "icon", label: "Icon" },
        {
          key: "tone",
          type: "choice",
          label: "Tone",
          emptyOption: { value: "", label: "Default", separator: "after" },
          emptyValue: undefined,
          options: [...PHI_TEXT_TONE_FIELD_OPTIONS],
        },
        { key: "pending", type: "boolean", label: "Still under way" },
      ],
    },
    {
      key: "placement",
      type: "choice",
      label: "Placement",
      heading: "Timeline",
      options: [
        { value: "start", label: "Start" },
        { value: "end", label: "End" },
        { value: "alternate", label: "Alternate" },
      ],
    },
  ],
  defaultConfig: {
    placement: "start",
    entries: [
      { key: "entry1", title: "First", content: "What happened first." },
      { key: "entry2", title: "Then", content: "What came after." },
    ],
  },
  parseConfig: parsePhiTimelineWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiTimelineWidgetConfig>,
  | "translatesOwnText"
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "icon"
  | "iconFamily"
  | "slotSizePolicy"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
