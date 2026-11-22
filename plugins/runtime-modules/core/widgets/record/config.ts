import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { readBoolean, readInteger, readString } from "../../../../../components/widgets/config/parser-primitives";
import { createPhiConfigReader, type PhiConfigReader } from "../../../../../components/widgets/config/strict-config-reader";
import type { PhiCmsWidgetPlugin } from "../../../../../types/cms-plugins";
import { readPhiRecordWidgetTitleFromRecord } from "../../../../../helpers/record-widget";
import type {
  PhiRecordFieldDefinition,
  PhiRecordWidgetAction,
  PhiRecordWidgetConfig,
} from "../../../../../types/record-widget";
import { isPhiRuntimeDataProviderKey } from "../../../../../types/runtime-data-provider";
import { PHI_SIGNAL_VALUE_SCHEMAS, readPhiSignalRouteSet } from "../../../../../types/signals";
import {
  PHI_TABLE_TAG_VARIANTS,
  type PhiTableTagVariant,
  type PhiTableValueRenderer,
} from "../../../../../types/table-widget";
import { isPhiRecord } from "../../../../../helpers/is-record";

const PHI_RECORD_VALUE_RENDERERS = [
  "text",
  "email",
  "date",
  "datetime",
  "badge",
  "tags",
  "link",
  "code",
  "json",
  "switch",
  "checkbox",
  "icon",
  "money",
  "interval",
] as const satisfies readonly PhiTableValueRenderer[];

function readRecordValueRenderer(value: unknown): PhiTableValueRenderer | undefined {
  return typeof value === "string" && (PHI_RECORD_VALUE_RENDERERS as readonly string[]).includes(value)
    ? value as PhiTableValueRenderer
    : undefined;
}

function readTagVariant(value: unknown): PhiTableTagVariant | undefined {
  return typeof value === "string" && (PHI_TABLE_TAG_VARIANTS as readonly string[]).includes(value)
    ? value as PhiTableTagVariant
    : undefined;
}

function readStringMap(value: unknown): Readonly<Record<string, string>> | undefined {
  if (!isPhiRecord(value)) return undefined;
  const entries = Object.entries(value).flatMap(([key, entry]) => {
    const text = readString(entry);
    return text ? [[key, text] as const] : [];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function readRecordField(value: unknown): PhiRecordFieldDefinition | null {
  if (!isPhiRecord(value)) return null;
  const key = readString(value.key);
  const fieldKey = readString(value.fieldKey);
  if (!key || !fieldKey) return null;
  return {
    key,
    fieldKey,
    label: readString(value.label) ?? fieldKey,
    renderer: readRecordValueRenderer(value.renderer),
    valueMap: readStringMap(value.valueMap),
    tagColorMap: isPhiRecord(value.tagColorMap)
      ? value.tagColorMap as PhiRecordFieldDefinition["tagColorMap"]
      : undefined,
    tagVariant: readTagVariant(value.tagVariant),
    full: readBoolean(value.full),
  };
}

/** A required text: absent is as wrong as the wrong type, because the entry means nothing without it. */
function requireText(reader: PhiConfigReader, key: string) {
  return reader.string(key)?.trim() || reader.fail(key, "a text", reader.record[key]);
}

function readRecordAction(reader: PhiConfigReader): PhiRecordWidgetAction {
  const confirm = reader.object("confirm", (confirmReader) => ({
    title: requireText(confirmReader, "title"),
    description: confirmReader.string("description"),
    okText: confirmReader.string("okText"),
    cancelText: confirmReader.string("cancelText"),
  }));
  return {
    key: requireText(reader, "key"),
    mode: reader.oneOf("mode", ["normal", "danger"] as const) ?? "normal",
    ...(confirm ? { confirm } : {}),
  };
}

function parsePhiRecordWidgetConfig(
  rawConfig: Record<string, unknown>,
): PhiRecordWidgetConfig {
  const source = isPhiRecord(rawConfig.source) ? rawConfig.source : {};
  const providerKey = typeof source.providerKey === "string" ? source.providerKey : "";
  const resourceKey = readString(source.resourceKey)?.trim() ?? "";
  const presentation = isPhiRecord(rawConfig.presentation) ? rawConfig.presentation : {};
  const columns = readInteger(presentation.columns);
  // Strict, as every newer key: an action stated wrong is the author's to correct, not to drop.
  const reader = createPhiConfigReader(rawConfig);

  return {
    source: isPhiRuntimeDataProviderKey(providerKey) && resourceKey
      ? {
          providerKey,
          resourceKey,
          params: isPhiRecord(source.params) ? { ...source.params } : {},
        }
      : null,
    // Absent and empty are the same answer: no action named, so the record's own `view`.
    openActionKey: readString(rawConfig.openActionKey)?.trim() || "view",
    presentation: {
      appearance: presentation.appearance === "list" ? "list" : "grid",
      columns: columns && columns > 0 ? columns : 1,
      fields: Array.isArray(presentation.fields)
        ? presentation.fields.flatMap((field) => {
            const parsed = readRecordField(field);
            return parsed ? [parsed] : [];
          })
        : [],
    },
    actions: reader.list("actions", readRecordAction) ?? [],
    titleFromRecord: readPhiRecordWidgetTitleFromRecord(rawConfig.titleFromRecord),
    signalRoutes: readPhiSignalRouteSet(rawConfig.signalRoutes),
  };
}

export const PHI_RECORD_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("record"),
  typeKey: "record",
  title: "Record",
  description: "Shows one row of a Table Provider as named values, opened by a row action, and runs its Provider row actions on a press.",
  category: "data",
  tags: ["record", "detail", "data"],
  icon: "antd:profile",
  slotSizePolicy: "fill-inline",
  runtimeSignals: {
    emits: [
      /*
       * An action of `actions` went through on the record shown: which one, on which row. A dialog
       * closes on it and the Table beside it reads again -- each a route of its own, `dialog/close:none`
       * and `reload/activate:none`, which carry nothing of the value.
       */
      { id: "actionSuccess", action: "activate", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction },
      // The title the record gives the dialog, after every read (`titleFromRecord`), for the Overlay's `title`.
      { id: "recordTitle", action: "change", valueType: "string" },
    ],
    listens: [
      {
        id: "recordOpen",
        channel: "action",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
      },
      { id: "close", channel: "state", action: "change", valueType: "boolean" },
      /*
       * Run one of `actions` on the record shown: the value is the action's key, the words this command
       * channel answers. A footer button sends it; the row is the one the Widget holds.
       */
      { id: "actionActivate", channel: "action", action: "activate", valueType: "string" },
    ],
  },
  fields: [
    {
      key: "source",
      type: "data-provider",
      providerKind: "table",
      label: "Record source",
      required: true,
    },
    {
      key: "openActionKey",
      type: "string",
      label: "Open action key",
      required: true,
      description: "The row action whose signal carries the row to show.",
    },
    {
      key: "presentation.appearance",
      type: "choice",
      label: "Appearance",
      options: [
        { value: "grid", label: "Grid" },
        { value: "list", label: "List" },
      ],
    },
    {
      key: "presentation.columns",
      type: "number",
      label: "Columns",
      min: 1,
      max: 4,
      precision: 0,
    },
    {
      key: "presentation.fields",
      type: "collection",
      presentation: "overlay",
      label: "Fields",
      itemKeyField: "key",
      itemLabelField: "label",
      addLabel: "Add field",
      emptyLabel: "No fields",
      editLabel: "Edit fields",
      defaultItem: {
        key: "field",
        fieldKey: "field",
        label: "Field",
        renderer: "text",
        full: false,
      },
      itemFields: [
        { key: "key", type: "string", label: "Key", required: true },
        { key: "fieldKey", type: "string", label: "Provider Field", required: true },
        { key: "label", type: "string", label: "Label", required: true },
        {
          key: "renderer",
          type: "choice",
          label: "Renderer",
          options: [
            { value: "text", label: "Text" },
            { value: "email", label: "Email" },
            { value: "date", label: "Date" },
            { value: "datetime", label: "Date & Time" },
            { value: "badge", label: "Badge" },
            { value: "tags", label: "Tags" },
            { value: "link", label: "Link" },
            { value: "code", label: "Code" },
            { value: "json", label: "JSON" },
            { value: "switch", label: "Switch" },
            { value: "checkbox", label: "Checkbox" },
            { value: "icon", label: "Icon" },
            { value: "money", label: "Money" },
            { value: "interval", label: "Interval" },
          ],
        },
        {
          key: "tagVariant",
          type: "choice",
          label: "Tag Variant",
          visibleWhen: { field: "renderer", equals: "badge" },
          options: [
            { value: "outlined", label: "Outlined" },
            { value: "filled", label: "Filled" },
            { value: "solid", label: "Solid color" },
          ],
        },
        {
          key: "full",
          type: "boolean",
          label: "Full width",
          description: "Takes the rest of the line, for a value too long to share it.",
        },
      ],
    },
    {
      key: "actions",
      type: "collection",
      presentation: "overlay",
      label: "Actions",
      description: "Provider row actions of the source, run on the record shown when their key arrives on action/activate.",
      itemKeyField: "key",
      itemLabelField: "key",
      addLabel: "Add action",
      emptyLabel: "No actions",
      editLabel: "Edit actions",
      defaultItem: { key: "action", mode: "normal" },
      itemFields: [
        { key: "key", type: "string", label: "Provider Action", required: true },
        {
          key: "mode",
          type: "choice",
          label: "Mode",
          options: [
            { value: "normal", label: "Normal" },
            { value: "danger", label: "Danger" },
          ],
        },
        { key: "confirm.title", type: "string", label: "Confirm Title" },
        { key: "confirm.description", type: "string", label: "Confirm Description" },
        { key: "confirm.okText", type: "string", label: "Confirm OK Text" },
        { key: "confirm.cancelText", type: "string", label: "Confirm Cancel Text" },
      ],
    },
  ],
  defaultConfig: {
    source: null,
    openActionKey: "view",
    actions: [],
    presentation: {
      appearance: "grid",
      columns: 2,
      fields: [],
    },
    signalRoutes: null,
  },
  parseConfig: parsePhiRecordWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiRecordWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "tags"
  | "icon"
  | "slotSizePolicy"
  | "runtimeSignals"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
