import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { readPhiTimelineEntries, type PhiTimelineEntry } from "@phis/contracts/timeline";
import {
  readPhiRuntimeDataProviderBinding,
  type PhiRuntimeDataProviderBinding,
} from "../../../../../types/runtime-data-provider";
import {
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";
import {
  parsePhiControlSignalConfig,
  type PhiControlSignalConfig,
} from "../../../../../components/widgets/config/control-signal-config";

/** How an entry's `at` reads: a date, a date with its time, or how long ago. */
export type PhiTimelineTimeFormat = "date" | "datetime" | "relative";

export type PhiTimelineWidgetConfig = PhiCmsWidgetConfigBase & Pick<PhiControlSignalConfig, "key" | "signalRoutes"> & {
  /** The Widget's own entries, edited in its scaffold's dialog; read only while no Provider answers. */
  entries: PhiTimelineEntry[];
  /** The Timeline Provider that answers instead of the Widget's own entries. */
  entriesProvider: PhiRuntimeDataProviderBinding | null;
  placement?: "start" | "end" | "alternate";
  timeFormat: PhiTimelineTimeFormat;
};

function readTimelinePlacement(value: unknown): PhiTimelineWidgetConfig["placement"] {
  const placement = readString(value);
  return placement === "end" || placement === "alternate" ? placement : "start";
}

function readTimelineTimeFormat(value: unknown): PhiTimelineTimeFormat {
  const format = readString(value);
  return format === "datetime" || format === "relative" ? format : "date";
}

function parsePhiTimelineWidgetConfig(config: Record<string, unknown>): PhiTimelineWidgetConfig {
  return {
    ...readRenderableBlockConfig(config),
    ...parsePhiControlSignalConfig(config, { key: "timeline" }),
    entries: readPhiTimelineEntries(config.entries),
    entriesProvider: readPhiRuntimeDataProviderBinding(config.entriesProvider),
    placement: readTimelinePlacement(config.placement),
    timeFormat: readTimelineTimeFormat(config.timeFormat),
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
  runtimeSignals: {
    emits: [],
    /* A Module whose data changed asks the Timeline to ask its Provider again. */
    listens: [{ id: "reload", channel: "reload", action: "activate", valueType: "none" }],
  },
  fields: [
    /* Edited in the scaffold's dialog, as a choice Widget's static options are. */
    {
      key: "entries",
      type: "collection",
      label: "Entries",
      editorPlacement: "toolbar",
      itemKeyField: "key",
      itemLabelField: "title",
      itemFields: [
        { key: "key", type: "string", label: "Key", required: true },
        { key: "title", type: "string", label: "Title" },
        { key: "content", type: "string", label: "Text" },
      ],
    },
    { key: "entriesProvider", type: "data-provider", providerKind: "timeline", label: "Entries Source" },
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
    {
      key: "timeFormat",
      type: "choice",
      label: "Time format",
      options: [
        { value: "date", label: "Date" },
        { value: "datetime", label: "Date and time" },
        { value: "relative", label: "Relative" },
      ],
    },
  ],
  defaultConfig: {
    placement: "start",
    timeFormat: "date",
    entriesProvider: null,
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
  | "runtimeSignals"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
