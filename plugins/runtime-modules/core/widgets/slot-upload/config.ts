import {
  buildPhiCmsWidgetNamespacedTypeKey,
  resolvePhiCmsWidgetPluginKey,
} from "../../../../../constants/cms-widget-types";
import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  readPhiSignalRouteSet,
  type PhiSignalRouteSet,
} from "../../../../../types/signals";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../widget-config";

/**
 * A file on a row of an Add-on's own table.
 *
 * Not a picker and not a library: a slot is a field. Which types it takes, how large a file may be and
 * whether it holds one or many are declared in the Add-on's schema descriptor, so this asks Core rather
 * than being configured with the same facts a second time -- a copy that would be wrong from the first
 * time somebody widened a slot and forgot the other place.
 *
 * The row comes from a Signal, because a field is placed once and used for whichever row a surface is
 * about. What it needs to be told is only where to put the file: the Add-on, its table, and the slot.
 */
export const PHI_SLOT_UPLOAD_WIDGET_TYPE_KEY = "slot-upload";
export const PHI_SLOT_UPLOAD_WIDGET_PLUGIN_KEY =
  resolvePhiCmsWidgetPluginKey(PHI_SLOT_UPLOAD_WIDGET_TYPE_KEY);
export const PHI_SLOT_UPLOAD_WIDGET_TYPE = buildPhiCmsWidgetNamespacedTypeKey(
  PHI_SLOT_UPLOAD_WIDGET_PLUGIN_KEY,
  PHI_SLOT_UPLOAD_WIDGET_TYPE_KEY,
);

export type PhiSlotUploadWidgetConfig = PhiCmsWidgetConfigBase & {
  /** The Add-on that owns the table, by package name -- `@scope/name`. */
  addon?: string;
  table?: string;
  slot?: string;
  /** Which binding parameter carries the row. `id` unless a surface names it otherwise. */
  ownerParam?: string;
  /** How the row reaches this field. Wired where the widget is placed, like every other Signal. */
  signalRoutes?: PhiSignalRouteSet | null;
};

export function parsePhiSlotUploadWidgetConfig(
  config: Record<string, unknown>,
): PhiSlotUploadWidgetConfig {
  return {
    ...readRenderableBlockConfig(config),
    addon: readString(config.addon),
    table: readString(config.table),
    slot: readString(config.slot),
    ownerParam: readString(config.ownerParam) ?? "id",
    signalRoutes: readPhiSignalRouteSet(config.signalRoutes),
  };
}

export const PHI_SLOT_UPLOAD_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: PHI_SLOT_UPLOAD_WIDGET_PLUGIN_KEY,
  typeKey: PHI_SLOT_UPLOAD_WIDGET_TYPE_KEY,
  title: "Slot upload",
  category: "media",
  description: "Puts a file into a declared slot on a row of an Add-on's table.",
  iconFamily: "media",
  fields: [
    { key: "addon", type: "string", label: "Add-on" },
    { key: "table", type: "string", label: "Table" },
    { key: "slot", type: "string", label: "Slot" },
    { key: "ownerParam", type: "string", label: "Row parameter" },
  ],
  defaultConfig: { ownerParam: "id" },
  parseConfig: parsePhiSlotUploadWidgetConfig,
  runtimeSignals: {
    emits: [
      // So whatever shows the row can read it again. What changed is the row, not this widget.
      { id: "changed", action: "change", valueType: "none" },
    ],
    listens: [
      {
        id: "bindingParamsChange",
        channel: "bindingParams",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableBindingParams,
      },
    ],
  },
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiSlotUploadWidgetConfig>,
  | "kind" | "pluginKey" | "typeKey" | "title" | "description"
  | "category" | "iconFamily" | "fields" | "defaultConfig" | "parseConfig" | "runtimeSignals"
>;
