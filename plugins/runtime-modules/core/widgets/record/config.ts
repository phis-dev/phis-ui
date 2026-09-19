import { PhiCmsWidgetType, resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { readBoolean, readInteger, readString } from "../../../../../components/widgets/config/parser-primitives";
import type { PhiCmsWidgetPlugin } from "../../../../../types/cms-plugins";
import type {
  PhiRecordFieldDefinition,
  PhiRecordWidgetConfig,
} from "../../../../../types/record-widget";
import { isPhiRuntimeDataProviderKey } from "../../../../../types/runtime-data-provider";
import { PHI_SIGNAL_VALUE_SCHEMAS, readPhiSignalRouteSet } from "../../../../../types/signals";
import {
  PHI_TABLE_TAG_VARIANTS,
  type PhiTableTagVariant,
  type PhiTableValueRenderer,
} from "../../../../../types/table-widget";

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
] as const satisfies readonly PhiTableValueRenderer[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

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
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value).flatMap(([key, entry]) => {
    const text = readString(entry);
    return text ? [[key, text] as const] : [];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function readRecordField(value: unknown): PhiRecordFieldDefinition | null {
  if (!isRecord(value)) return null;
  const key = readString(value.key);
  const fieldKey = readString(value.fieldKey);
  if (!key || !fieldKey) return null;
  return {
    key,
    fieldKey,
    label: readString(value.label) ?? fieldKey,
    renderer: readRecordValueRenderer(value.renderer),
    valueMap: readStringMap(value.valueMap),
    tagColorMap: isRecord(value.tagColorMap)
      ? value.tagColorMap as PhiRecordFieldDefinition["tagColorMap"]
      : undefined,
    tagVariant: readTagVariant(value.tagVariant),
    full: readBoolean(value.full),
  };
}

export function parsePhiRecordWidgetConfig(
  rawConfig: Record<string, unknown>,
): PhiRecordWidgetConfig {
  const source = isRecord(rawConfig.source) ? rawConfig.source : {};
  const providerKey = typeof source.providerKey === "string" ? source.providerKey : "";
  const resourceKey = readString(source.resourceKey)?.trim() ?? "";
  const presentation = isRecord(rawConfig.presentation) ? rawConfig.presentation : {};
  const columns = readInteger(presentation.columns);

  return {
    source: isPhiRuntimeDataProviderKey(providerKey) && resourceKey
      ? {
          providerKey,
          resourceKey,
          params: isRecord(source.params) ? { ...source.params } : {},
        }
      : null,
    openActionKey: readString(rawConfig.openActionKey)?.trim() ?? "view",
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
    signalRoutes: readPhiSignalRouteSet(rawConfig.signalRoutes),
  };
}

export const PHI_RECORD_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("record"),
  typeKey: "record",
  title: "Record",
  description: "Shows one row of a Table Provider as named values, opened by a row action.",
  category: "data",
  tags: ["record", "detail", "data"],
  icon: "antd:profile",
  slotSizePolicy: "fill-inline",
  runtimeSignals: {
    emits: [],
    listens: [
      {
        id: "recordOpen",
        channel: "action",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
      },
      { id: "close", channel: "state", action: "change", valueType: "boolean" },
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
            { value: "solid", label: "Solid" },
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
  ],
  defaultConfig: {
    source: null,
    openActionKey: "view",
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

export const PHI_RECORD_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Record;
