import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { readPhiProviderResourceSource } from "../../../../../types/runtime-data-provider";
import {
  PHI_TABLE_TAG_COLORS,
  PHI_TABLE_TAG_VARIANTS,
  readPhiTableQuery,
  type PhiTableActionDefinition,
  type PhiTableColumnDefinition,
  type PhiTableColumnEditorControl,
  type PhiTableColumnSizing,
  type PhiTableTagColor,
  type PhiTableTagVariant,
  type PhiTableSort,
  type PhiTableWidgetConfig,
  type PhiTableFilterDefinition,
  type PhiTableFooterConfig,
  type PhiTableFooterVariant,
  type PhiTableSummaryConfig,
  type PhiTableSummaryItemDefinition,
  type PhiTableSummaryValueSource,
} from "../../../../../types/table-widget";
import { PHI_SIGNAL_VALUE_SCHEMAS, readPhiSignalRouteSet } from "../../../../../types/signals";
import type { PhiFeedbackLevel } from "../../../../../types/control";
import type {
  PhiCmsConfigField,
  PhiCmsWidgetPlugin,
} from "../../../../../types/cms-plugins";
import { createPhiConfigReader, type PhiConfigReader } from "../../../../../components/widgets/config/strict-config-reader";
import { readPhiControlSize } from "../../../../../types/control";
import { PHI_CONTROL_SIZE_FIELD } from "../../../../../components/widgets/config/control-signal-config";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../../../../constants/core-data-provider-keys";
import { readPhiLengthValue } from "../../../../../types/length";
import { parsePhiControlOptionsProviderConfig } from "../../../../../components/controls/phi-control-options";
import {
  readPhiRuntimeConditionExpression,
  resolvePhiRuntimeConditionControllerRequirements,
} from "../../../../../types/runtime-condition";
import { isPhiRecord } from "../../../../../helpers/is-record";

const PHI_TABLE_DISABLED_CONDITION_CONFIG_FIELDS: PhiCmsConfigField[] = [
  { key: "source", type: "choice", label: "Source", options: [
    { value: "row", label: "Row" },
    { value: "controller", label: "Controller" },
  ] },
  { key: "controllerAddress", type: "string", label: "Controller Address", visibleWhen: { field: "source", equals: "controller" } },
  { key: "valuePath", type: "string", label: "Value Path", required: true },
  { key: "operator", type: "choice", label: "Operator", options: [
    { value: "truthy", label: "Truthy" },
    { value: "falsy", label: "Falsy" },
    { value: "equals", label: "Equals" },
    { value: "contains", label: "Contains" },
  ] },
  { key: "value", type: "string", label: "String Value" },
  { key: "reason", type: "string", label: "Disabled Reason" },
];

function buildPhiTableConditionExpressionConfigFields(
  key: string,
  label: string,
  match: "all" | "any",
  emptyLabel: string,
): PhiCmsConfigField[] {
  return [
    {
      key: `${key}.match`,
      type: "choice",
      label: `${label} Match`,
      options: [
        { value: "all", label: "All conditions" },
        { value: "any", label: "Any condition" },
      ],
    },
    {
      key: `${key}.conditions`,
      type: "collection",
      label,
      itemKeyField: "valuePath",
      itemLabelField: "valuePath",
      addLabel: "Add condition",
      emptyLabel,
      defaultItem: { source: "row", valuePath: match === "all" ? "visible" : "disabled", operator: "truthy" },
      itemFields: PHI_TABLE_DISABLED_CONDITION_CONFIG_FIELDS,
    },
  ];
}

const PHI_TABLE_FOOTER_VALUE_CONFIG_FIELDS: PhiCmsConfigField[] = [
  { key: "key", type: "string", label: "Key", required: true },
  { key: "value.source", type: "choice", label: "Value Source", options: [
    { value: "provider", label: "Provider summary" },
    { value: "core", label: "Table state" },
  ] },
  { key: "value.fieldKey", type: "string", label: "Value Field", required: true },
];

const PHI_TABLE_SUMMARY_CELL_CONFIG_FIELDS: PhiCmsConfigField[] = [
  { key: "key", type: "string", label: "Key", required: true },
  { key: "columnKey", type: "string", label: "Start Column", required: true },
  { key: "throughColumnKey", type: "string", label: "End Column" },
  { key: "align", type: "choice", label: "Alignment", options: [
    { value: "left", label: "Left" },
    { value: "center", label: "Center" },
    { value: "right", label: "Right" },
  ] },
  { key: "item.key", type: "string", label: "Value Key", required: true },
  { key: "item.label", type: "string", label: "Value Label" },
  { key: "item.labelPlacement", type: "choice", label: "Value Label Placement", options: [
    { value: "before", label: "Before value" },
    { value: "after", label: "After value" },
  ] },
  { key: "item.value.source", type: "choice", label: "Value Source", options: [
    { value: "provider", label: "Provider summary" },
    { value: "core", label: "Table state" },
  ] },
  { key: "item.value.fieldKey", type: "string", label: "Value Field", required: true },
];

const PHI_TABLE_ACTION_CONFIG_FIELDS: PhiCmsConfigField[] = [
  { key: "key", type: "string", label: "Key", required: true },
  {
    key: "execution",
    type: "choice",
    label: "Execution",
    options: [
      { value: "provider", label: "Provider" },
      { value: "signal", label: "Signal" },
      { value: "link", label: "Link" },
    ],
  },
  { key: "label", type: "string", label: "Label", required: true },
  { key: "icon", type: "icon", label: "Icon" },
  { key: "display", type: "choice", label: "Display", options: [
    { value: "icon", label: "Icon" },
    { value: "label", label: "Label" },
    { value: "icon-label", label: "Icon and label" },
  ] },
  { key: "mode", type: "choice", label: "Mode", options: [
    { value: "normal", label: "Normal" },
    { value: "primary", label: "Primary" },
    { value: "danger", label: "Danger" },
  ] },
  { key: "href", type: "url", label: "Href", visibleWhen: { field: "execution", equals: "link" } },
  { key: "hrefPath", type: "string", label: "Row Href Path", visibleWhen: { field: "execution", equals: "link" } },
  { key: "newTab", type: "boolean", label: "Open In New Tab", visibleWhen: { field: "execution", equals: "link" } },
  ...buildPhiTableConditionExpressionConfigFields("visibleWhen", "Visible Conditions", "all", "Always visible"),
  ...buildPhiTableConditionExpressionConfigFields("disabledWhen", "Disabled Conditions", "any", "No disabled conditions"),
  { key: "confirm.title", type: "string", label: "Confirm Title" },
  { key: "confirm.description", type: "string", label: "Confirm Description" },
  { key: "confirm.alert.level", type: "choice", label: "Confirm Alert Level", options: [
    { value: "success", label: "Success" },
    { value: "info", label: "Information" },
    { value: "warning", label: "Warning" },
    { value: "error", label: "Error" },
  ] },
  { key: "confirm.alert.title", type: "string", label: "Confirm Alert Title" },
  { key: "confirm.alert.description", type: "string", label: "Confirm Alert Description" },
  { key: "confirm.okText", type: "string", label: "Confirm OK Text" },
  { key: "confirm.cancelText", type: "string", label: "Confirm Cancel Text" },
];

const PHI_TABLE_COLUMN_RENDERERS = [
  "text", "email", "date", "datetime", "badge", "tags", "link", "code", "json", "switch", "checkbox", "icon",
] as const;
const PHI_TABLE_COLUMN_EDITOR_CONTROLS = [
  "switch", "checkbox", "select", "radio", "segmented", "multi-select", "checkbox-group", "icon-picker",
] as const;
const PHI_TABLE_ALIGNS = ["left", "center", "right"] as const;

function readCondition(reader: PhiConfigReader, key: string) {
  return reader.value(key, "a condition", (value) => readPhiRuntimeConditionExpression(value) ?? undefined);
}

function readLength(reader: PhiConfigReader, key: string) {
  return reader.value(key, "a CSS length", (value) => readPhiLengthValue(value) ?? undefined);
}

/** A required text: absent is as wrong as the wrong type, because the entry means nothing without it. */
function requireString(reader: PhiConfigReader, key: string) {
  return reader.string(key) ?? reader.fail(key, "a text", reader.record[key]);
}

function readTableTagColor(value: unknown): PhiTableTagColor | undefined {
  if (typeof value === "string" && (PHI_TABLE_TAG_COLORS as readonly string[]).includes(value)) {
    return value as PhiTableTagColor;
  }
  if (!isPhiRecord(value) || value.kind !== "custom") return undefined;
  return typeof value.value === "string" && value.value.trim()
    ? { kind: "custom", value: value.value }
    : undefined;
}

type PhiTableCoreSummaryFieldKey = Extract<
  PhiTableSummaryValueSource,
  { source: "core" }
>["fieldKey"];

const PHI_TABLE_CORE_SUMMARY_FIELD_KEYS = [
  "totalRows",
  "pageRows",
  "selectedRows",
  "page",
  "pageCount",
] as const satisfies readonly PhiTableCoreSummaryFieldKey[];

function readTableSummaryValueSource(reader: PhiConfigReader): PhiTableSummaryValueSource {
  const source = reader.oneOf("source", ["core", "provider"] as const) ?? reader.fail("source", "\"core\" or \"provider\"");
  if (source === "core") {
    return {
      source,
      fieldKey: reader.oneOf("fieldKey", PHI_TABLE_CORE_SUMMARY_FIELD_KEYS)
        ?? reader.fail("fieldKey", `one of ${PHI_TABLE_CORE_SUMMARY_FIELD_KEYS.join(", ")}`),
    };
  }
  return { source, fieldKey: requireString(reader, "fieldKey") };
}

function readTableSummaryItem(reader: PhiConfigReader): PhiTableSummaryItemDefinition {
  return {
    key: requireString(reader, "key"),
    value: reader.object("value", readTableSummaryValueSource) ?? reader.fail("value", "a value source"),
    label: reader.string("label"),
    labelPlacement: reader.oneOf("labelPlacement", ["before", "after"] as const) ?? "before",
  };
}

function readTableFooterValues(reader: PhiConfigReader) {
  return (reader.list("values", (entry) => {
    const item = readTableSummaryItem(entry);
    return { key: item.key, value: item.value };
  }) ?? []);
}

function readTableFooterVariant(reader: PhiConfigReader): PhiTableFooterVariant {
  // An empty template is a statement here, not a missing one: the footer has nothing to say.
  const template = typeof reader.record.template === "string"
    ? reader.record.template
    : reader.fail("template", "a text");
  const when = reader.object("when", (whenReader) => ({
    value: whenReader.object("value", readTableSummaryValueSource) ?? whenReader.fail("value", "a value source"),
    operator: whenReader.oneOf("operator", ["truthy", "falsy"] as const)
      ?? whenReader.fail("operator", "\"truthy\" or \"falsy\""),
  })) ?? reader.fail("when", "a condition");
  return { when, template, values: readTableFooterValues(reader) };
}

function readTableFooter(reader: PhiConfigReader): PhiTableFooterConfig {
  const values = readTableFooterValues(reader);
  if (values.length === 0) reader.fail("values", "at least one value");
  const variants = reader.list("variants", readTableFooterVariant) ?? [];
  return {
    template: requireString(reader, "template"),
    values,
    align: reader.oneOf("align", ["start", "center", "end"] as const) ?? "start",
    ...(variants.length > 0 ? { variants } : {}),
  };
}

function readTableSummary(reader: PhiConfigReader): PhiTableSummaryConfig {
  const rows = reader.list("rows", (rowReader) => ({
    key: requireString(rowReader, "key"),
    cells: rowReader.list("cells", (cellReader) => ({
      key: requireString(cellReader, "key"),
      columnKey: requireString(cellReader, "columnKey"),
      throughColumnKey: cellReader.string("throughColumnKey"),
      align: cellReader.oneOf("align", PHI_TABLE_ALIGNS) ?? "left",
      item: cellReader.object("item", readTableSummaryItem) ?? cellReader.fail("item", "a summary item"),
    })) ?? rowReader.fail("cells", "a list of cells"),
  })) ?? reader.fail("rows", "a list of rows");
  return {
    placement: reader.oneOf("placement", ["body-end", "sticky-top", "sticky-bottom"] as const) ?? "body-end",
    rows,
  };
}

function readTableColumnSizing(reader: PhiConfigReader): PhiTableColumnSizing {
  const mode = reader.oneOf("mode", ["content", "fixed", "fill"] as const) ?? "content";
  if (mode === "fixed") {
    return { mode, width: readLength(reader, "width") ?? reader.fail("width", "a CSS length for a fixed column") };
  }
  return { mode, minWidth: readLength(reader, "minWidth"), maxWidth: readLength(reader, "maxWidth") };
}

function readColumn(reader: PhiConfigReader): PhiTableColumnDefinition {
  const valueMap = reader.object("valueMap", (mapReader) => Object.fromEntries(
    Object.keys(mapReader.record).map((key) => [key, mapReader.string(key) ?? ""]),
  ));
  const tagColorMap = reader.object("tagColorMap", (mapReader) => Object.fromEntries(
    Object.keys(mapReader.record).map((key) => [
      key,
      mapReader.value(key, "a tag colour", readTableTagColor) ?? mapReader.fail(key, "a tag colour"),
    ]),
  ));
  const editor = reader.object("editor", (editorReader) => editorReader.boolean("enabled") === false
    ? undefined
    : {
        control: editorReader.oneOf("control", PHI_TABLE_COLUMN_EDITOR_CONTROLS) as PhiTableColumnEditorControl | undefined,
        disabledWhen: readCondition(editorReader, "disabledWhen"),
        ...(editorReader.string("prefix") ? { prefix: editorReader.string("prefix") } : {}),
      });
  return {
    key: requireString(reader, "key"),
    title: requireString(reader, "title"),
    fieldKey: requireString(reader, "fieldKey"),
    sortField: reader.string("sortField"),
    iconFieldKey: reader.string("iconFieldKey"),
    titleIcon: reader.string("titleIcon"),
    titleDisplay: reader.oneOf("titleDisplay", ["icon"] as const),
    description: reader.string("description"),
    renderer: reader.oneOf("renderer", PHI_TABLE_COLUMN_RENDERERS) ?? "text",
    editor,
    sizing: reader.object("sizing", readTableColumnSizing) ?? readTableColumnSizing(createPhiConfigReader({})),
    align: reader.oneOf("align", PHI_TABLE_ALIGNS) ?? "left",
    sticky: reader.oneOf("sticky", ["left", "right"] as const),
    sortable: reader.boolean("sortable"),
    hidden: reader.boolean("hidden"),
    ellipsis: reader.boolean("ellipsis"),
    valueMap,
    tagColorMap,
    tagVariant: reader.oneOf("tagVariant", PHI_TABLE_TAG_VARIANTS) as PhiTableTagVariant | undefined ?? "outlined",
  };
}

function readFilter(reader: PhiConfigReader): PhiTableFilterDefinition {
  const key = requireString(reader, "key");
  const label = requireString(reader, "label");
  const labelPlacement = reader.oneOf("labelPlacement", ["inline", "none"] as const);
  const type = reader.oneOf("type", ["text", "select", "boolean", "dateRange"] as const) ?? "text";
  if (type === "select") {
    return {
      key,
      type,
      label,
      labelPlacement,
      multiple: reader.boolean("multiple"),
      options: reader.list("options", (optionReader) => ({
        label: requireString(optionReader, "label"),
        value: requireString(optionReader, "value"),
      })) ?? [],
      optionsProvider: reader.value(
        "optionsProvider",
        "an options provider",
        (value) => parsePhiControlOptionsProviderConfig(value) ?? undefined,
      ),
      defaultValue: reader.value(
        "defaultValue",
        "a text or a list of texts",
        (value) => typeof value === "string" ||
          (Array.isArray(value) && value.every((entry) => typeof entry === "string"))
          ? value as string | string[]
          : undefined,
      ),
    };
  }
  if (type === "boolean") {
    return {
      key,
      type,
      control: reader.oneOf("control", ["switch"] as const),
      label,
      labelPlacement,
      defaultValue: reader.boolean("defaultValue"),
    };
  }
  if (type === "dateRange") {
    return {
      key,
      type,
      label,
      labelPlacement,
      startKey: requireString(reader, "startKey"),
      endKey: requireString(reader, "endKey"),
      startPlaceholder: reader.string("startPlaceholder"),
      endPlaceholder: reader.string("endPlaceholder"),
      defaultValue: reader.object("defaultValue", (rangeReader) => ({
        start: rangeReader.string("start"),
        end: rangeReader.string("end"),
      })),
    };
  }
  return {
    key,
    type,
    label,
    labelPlacement,
    placeholder: reader.string("placeholder"),
    defaultValue: reader.string("defaultValue"),
  };
}

function readAction(reader: PhiConfigReader): PhiTableActionDefinition {
  return {
    key: requireString(reader, "key"),
    label: requireString(reader, "label"),
    execution: reader.oneOf("execution", ["provider", "signal", "link"] as const)
      ?? reader.fail("execution", "\"provider\", \"signal\" or \"link\""),
    icon: reader.string("icon"),
    display: reader.oneOf("display", ["icon", "label", "icon-label"] as const),
    mode: reader.oneOf("mode", ["normal", "primary", "danger"] as const) ?? "normal",
    href: reader.string("href"),
    hrefPath: reader.string("hrefPath"),
    newTab: reader.boolean("newTab"),
    visibleWhen: readCondition(reader, "visibleWhen"),
    disabledWhen: readCondition(reader, "disabledWhen"),
    confirm: reader.object("confirm", (confirmReader) => ({
      title: requireString(confirmReader, "title"),
      description: confirmReader.string("description"),
      okText: confirmReader.string("okText"),
      cancelText: confirmReader.string("cancelText"),
      alert: confirmReader.object("alert", (alertReader) => ({
        level: alertReader.oneOf("level", ["success", "info", "warning", "error"] as const satisfies readonly PhiFeedbackLevel[])
          ?? alertReader.fail("level", "\"success\", \"info\", \"warning\" or \"error\""),
        title: requireString(alertReader, "title"),
        description: alertReader.string("description"),
      })),
    })),
  };
}

function readBindingField(reader: PhiConfigReader) {
  const disabledWhen = reader.object("disabledWhen", (conditionReader) => ({
    fieldKey: requireString(conditionReader, "fieldKey"),
    equals: conditionReader.value(
      "equals",
      "a text, a number or true/false",
      (value) => typeof value === "string" || typeof value === "boolean" ||
        (typeof value === "number" && Number.isFinite(value))
        ? value
        : undefined,
    ) ?? conditionReader.fail("equals", "a text, a number or true/false"),
  }));
  const optionLabels = reader.list("optionLabels", (optionReader) => ({
    value: optionReader.value(
      "value",
      "a text or a number",
      (value) => typeof value === "string" || (typeof value === "number" && Number.isFinite(value)) ? value : undefined,
    ) ?? optionReader.fail("value", "a text or a number"),
    label: requireString(optionReader, "label"),
  })) ?? [];
  const cascader = reader.object("cascader", (cascaderReader) => ({
    allowRoot: cascaderReader.boolean("allowRoot"),
    separator: cascaderReader.string("separator"),
    rootValue: cascaderReader.string("rootValue"),
    normalize: cascaderReader.oneOf("normalize", ["raw", "path"] as const) ?? "raw" as const,
  }));
  const create = reader.object("create", (createReader) => ({
    label: requireString(createReader, "label"),
    description: createReader.string("description"),
    icon: createReader.string("icon"),
    display: createReader.oneOf("display", ["icon", "label", "icon-label"] as const) ?? "icon" as const,
    placeholder: createReader.string("placeholder"),
    submitLabel: createReader.string("submitLabel"),
  }));
  return {
    key: requireString(reader, "key"),
    label: reader.string("label"),
    placeholder: reader.string("placeholder"),
    control: reader.oneOf("control", ["select", "autocomplete", "cascader"] as const) ?? "select" as const,
    ...(disabledWhen ? { disabledWhen } : {}),
    ...(optionLabels.length > 0 ? { optionLabels } : {}),
    ...(cascader ? { cascader } : {}),
    create,
  };
}

export function parsePhiTableWidgetConfig(config: Record<string, unknown>): PhiTableWidgetConfig {
  const root = createPhiConfigReader(config);
  const section = (reader: PhiConfigReader, key: string) =>
    reader.object(key, (nested) => nested) ?? createPhiConfigReader({}, reader.path ? `${reader.path}.${key}` : key);
  const presentation = section(root, "presentation");
  const features = section(root, "features");
  const search = section(features, "search");
  const pagination = section(features, "pagination");
  const sorting = section(features, "sorting");
  const rowSelection = section(features, "rowSelection");
  const rowReordering = section(features, "rowReordering");
  const columnReordering = section(features, "columnReordering");
  const editing = section(features, "editing");
  const tools = section(features, "tools");
  const structure = section(features, "structure");
  const actions = section(features, "actions");
  const emptyState = section(presentation, "emptyState");
  const layout = section(presentation, "layout");
  const row = section(presentation, "row");
  const readQuery = (reader: PhiConfigReader, key: string, wrap: (value: unknown) => unknown, expected: string) =>
    reader.value(key, expected, (value) => readPhiTableQuery(wrap(value)) ?? undefined);
  const initialQuery = readQuery(root, "initialQuery", (value) => value, "a table query") ?? {};
  const defaultSorts = readQuery(sorting, "defaultSorts", (value) => ({ sorts: value }), "a list of sorts")?.sorts ?? [];
  // Read with the same rules as any query's filters; a value no filter can carry is refused, not kept.
  const fixedFilters = readQuery(root, "fixedFilters", (value) => ({ filters: value }), "filter keys mapped to query values")?.filters;
  const controlSize = presentation.value("controlSize", "a control size", readPhiControlSize);
  const toolsMode = tools.oneOf("mode", ["self-contained", "external"] as const) ?? "self-contained";
  const toolsReset = tools.boolean("reset");
  const structureMode = structure.oneOf("mode", ["flat", "tree"] as const) ?? "flat";
  const treeStructure = structureMode === "tree"
    ? {
        mode: "tree" as const,
        parentRowIdentityPath: requireString(structure, "parentRowIdentityPath"),
        defaultExpandedRowIdentities: readQuery(
          structure,
          "defaultExpandedRowIdentities",
          (value) => ({ expandedRowIdentities: value }),
          "a list of row identities",
        )?.expandedRowIdentities,
        expandRowByClick: structure.boolean("expandRowByClick"),
        indentSize: structure.number("indentSize"),
        expandColumnKey: requireString(structure, "expandColumnKey"),
      }
    : { mode: "flat" as const };

  return {
    presentation: {
      controlSize: controlSize ?? (toolsMode === "self-contained" ? "small" : "medium"),
      title: presentation.string("title"),
      description: presentation.string("description"),
      columns: presentation.list("columns", readColumn) ?? [],
      layout: {
        mode: layout.oneOf("mode", ["auto", "fixed"] as const) ?? "auto",
        overflowX: layout.oneOf("overflowX", ["auto", "visible"] as const) ?? "auto",
      },
      emptyState: {
        title: emptyState.string("title"),
        description: emptyState.string("description"),
      },
      borders: presentation.boolean("borders"),
      header: presentation.boolean("header"),
      stickyHeader: presentation.boolean("stickyHeader"),
      footer: presentation.object("footer", readTableFooter),
      summary: presentation.object("summary", readTableSummary),
      row: {
        striped: row.boolean("striped"),
        mutedWhen: readCondition(row, "mutedWhen"),
      },
    },
    features: {
      search: {
        enabled: search.boolean("enabled"),
        placeholder: search.string("placeholder"),
        debounceMs: search.number("debounceMs"),
      },
      filters: features.list("filters", readFilter) ?? [],
      pagination: {
        enabled: pagination.boolean("enabled"),
        pageSize: pagination.number("pageSize"),
        pageSizes: pagination.value(
          "pageSizes",
          "a list of numbers",
          (value) => Array.isArray(value) && value.length > 0 &&
            value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
            ? value as number[]
            : undefined,
        ),
      },
      sorting: {
        mode: sorting.oneOf("mode", ["none", "single", "multiple"] as const) ?? "none",
        defaultSorts,
      },
      rowSelection: {
        mode: rowSelection.oneOf("mode", ["none", "single", "multiple"] as const) ?? "none",
        preserveSelectedRowIdentities: rowSelection.boolean("preserveSelectedRowIdentities"),
        disabledWhen: readCondition(rowSelection, "disabledWhen"),
        ...(rowSelection.has("emitFields")
          ? { emitFields: (rowSelection.stringList("emitFields") ?? []).map((field) => field.trim()).filter(Boolean) }
          : {}),
      },
      rowReordering: {
        enabled: rowReordering.boolean("enabled"),
      },
      columnReordering: {
        enabled: columnReordering.boolean("enabled"),
      },
      editing: {
        mode: editing.oneOf("mode", ["none", "cell", "row"] as const) ?? "none",
        disabledWhen: readCondition(editing, "disabledWhen"),
      },
      tools: {
        mode: toolsMode,
        bindingFields: tools.list("bindingFields", readBindingField),
        ...(toolsReset === undefined ? {} : { reset: toolsReset }),
        reload: tools.boolean("reload"),
      },
      structure: treeStructure,
      actions: {
        rowLayout: actions.oneOf("rowLayout", ["compact", "spaced"] as const) ?? "compact",
        toolbar: actions.list("toolbar", readAction) ?? [],
        row: actions.list("row", readAction) ?? [],
        bulk: actions.list("bulk", readAction) ?? [],
      },
    },
    initialQuery: {
      ...initialQuery,
      sorts: initialQuery.sorts as readonly PhiTableSort[] | undefined,
    },
    ...(fixedFilters ? { fixedFilters } : {}),
    source: root.value("source", "a provider source", (value) => readPhiProviderResourceSource(value) ?? undefined) ?? null,
    signalRoutes: readPhiSignalRouteSet(config.signalRoutes),
  };
}

export const PHI_TABLE_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("table"),
  typeKey: "table",
  title: "Table",
  description: "Provider-backed structured data table with declarative columns, rows, and actions.",
  category: "data",
  tags: ["table", "data", "provider"],
  icon: "antd:table",
  iconFamily: "data",
  slotSizePolicy: "fill-inline",
  requiredRuntimeControllers: ({ config }) =>
    resolvePhiRuntimeConditionControllerRequirements(config.signalRoutes),
  runtimeSignals: {
    emits: [
      { id: "queryChange", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableQuery },
      { id: "selectionChange", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableSelection },
      { id: "actionActivate", action: "activate", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction },
      { id: "bindingParamsChange", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableBindingParams },
      { id: "stateChange", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableState },
      { id: "mutationChange", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableMutation },
      { id: "columnsChange", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableColumnOrder },
      { id: "expansionChange", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableExpansion },
      { id: "conditionStateRequest", action: "reload", valueType: "none" },
    ],
    listens: [
      { id: "searchChange", channel: "search", action: "change", valueType: "string" },
      { id: "searchClear", channel: "search", action: "clear", valueType: "none" },
      { id: "queryChange", channel: "query", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableQuery },
      { id: "filtersChange", channel: "filters", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableFilters },
      { id: "bindingParamsChange", channel: "bindingParams", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableBindingParams },
      { id: "reload", channel: "reload", action: "activate", valueType: "none" },
      { id: "selectionClear", channel: "selection", action: "clear", valueType: "none" },
      { id: "columnsChange", channel: "columns", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableColumnOrder },
      { id: "expansionChange", channel: "expansion", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableExpansion },
      { id: "actionActivate", channel: "action", action: "activate", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction },
      { id: "conditionStateChange", channel: "condition", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeConditionState },
    ],
  },
  fields: [
    { key: "presentation.title", type: "string", label: "Title" },
    { key: "presentation.description", type: "string", label: "Description" },
    {
      key: "presentation.layout.mode",
      type: "choice",
      label: "Table Layout",
      description: "Auto follows content; fixed gives deterministic fixed/fill column distribution.",
      options: [
        { value: "auto", label: "Auto" },
        { value: "fixed", label: "Fixed" },
      ],
    },
    {
      key: "presentation.layout.overflowX",
      type: "choice",
      label: "Horizontal Overflow",
      options: [
        { value: "auto", label: "Scroll when needed" },
        { value: "visible", label: "Visible" },
      ],
    },
    {
      key: "source",
      type: "data-provider",
      providerKind: "table",
      label: "Table Provider",
    },
    {
      key: "presentation.columns",
      type: "collection",
      presentation: "overlay",
      label: "Columns",
      itemKeyField: "key",
      itemLabelField: "title",
      addLabel: "Add column",
      emptyLabel: "No columns",
      defaultItem: {
        key: "column",
        fieldKey: "field",
        title: "Column",
        renderer: "text",
        sizing: { mode: "content" },
        align: "left",
        sortable: false,
        hidden: false,
        ellipsis: false,
        tagVariant: "outlined",
      },
      itemFields: [
        { key: "key", type: "string", label: "Key", required: true },
        { key: "fieldKey", type: "string", label: "Provider Field", required: true },
        { key: "title", type: "string", label: "Title", required: true },
        { key: "description", type: "string", label: "Hint" },
        { key: "sortField", type: "string", label: "Provider Sort Field" },
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
          options: [
            { value: "outlined", label: "Outlined" },
            { value: "filled", label: "Filled" },
            { value: "solid", label: "Solid" },
          ],
        },
        {
          key: "sizing.mode",
          type: "choice",
          label: "Sizing",
          options: [
            { value: "content", label: "Content" },
            { value: "fixed", label: "Fixed" },
            { value: "fill", label: "Fill" },
          ],
        },
        {
          key: "sizing.width",
          type: "length",
          label: "Width",
          min: 0,
          required: true,
          visibleWhen: { field: "sizing.mode", equals: "fixed" },
        },
        {
          key: "sizing.minWidth",
          type: "length",
          label: "Minimum Width",
          min: 0,
          visibleWhen: { field: "sizing.mode", notEquals: "fixed" },
        },
        {
          key: "sizing.maxWidth",
          type: "length",
          label: "Maximum Width",
          min: 0,
          visibleWhen: { field: "sizing.mode", notEquals: "fixed" },
        },
        {
          key: "align",
          type: "choice",
          label: "Align",
          options: [
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ],
        },
        {
          key: "sticky",
          type: "choice",
          label: "Sticky",
          options: [
            { value: "left", label: "Left" },
            { value: "right", label: "Right" },
          ],
        },
        { key: "sortable", type: "boolean", label: "Sortable" },
        { key: "editor.enabled", type: "boolean", label: "Editable" },
        {
          key: "editor.control",
          type: "choice",
          label: "Editor Control",
          visibleWhen: { field: "editor.enabled", equals: true },
          options: [
            { value: "switch", label: "Switch" },
            { value: "checkbox", label: "Checkbox" },
            { value: "select", label: "Select" },
            { value: "radio", label: "Radio" },
            { value: "segmented", label: "Segmented" },
            { value: "multi-select", label: "Multi-select" },
            { value: "checkbox-group", label: "Checkbox group" },
            { value: "icon-picker", label: "Icon picker" },
          ],
        },
        // The unit beside a number editor; the column title names the value, not its unit.
        {
          key: "editor.prefix",
          type: "string",
          label: "Editor Unit",
          visibleWhen: { field: "editor.enabled", equals: true },
        },
        ...buildPhiTableConditionExpressionConfigFields("editor.disabledWhen", "Editor Disabled Conditions", "any", "No disabled conditions").map((field) => ({ ...field, visibleWhen: { field: "editor.enabled", equals: true } })),
        { key: "hidden", type: "boolean", label: "Hidden" },
        { key: "ellipsis", type: "boolean", label: "Ellipsis" },
      ],
    },
    {
      key: "features.filters",
      type: "collection",
      presentation: "overlay",
      label: "Filters",
      itemKeyField: "key",
      itemLabelField: "key",
      addLabel: "Add filter",
      emptyLabel: "No filters",
      defaultItem: { key: "filter", label: "Filter", type: "text" },
      itemFields: [
        { key: "key", type: "string", label: "Key", required: true },
        { key: "label", type: "string", label: "Label" },
        {
          key: "type",
          type: "choice",
          label: "Type",
          options: [
            { value: "text", label: "Text" },
            { value: "select", label: "Select" },
            { value: "boolean", label: "Boolean" },
            { value: "dateRange", label: "Date Range" },
          ],
        },
        { key: "placeholder", type: "string", label: "Placeholder", visibleWhen: { field: "type", equals: "text" } },
        { key: "defaultValue", type: "string", label: "Default", visibleWhen: { field: "type", equals: "text" } },
        { key: "multiple", type: "boolean", label: "Multiple", visibleWhen: { field: "type", equals: "select" } },
        {
          key: "options",
          type: "collection",
          label: "Options",
          itemKeyField: "value",
          itemLabelField: "label",
          addLabel: "Add option",
          emptyLabel: "No options",
          visibleWhen: { field: "type", equals: "select" },
          defaultItem: { value: "option", label: "Option" },
          itemFields: [
            { key: "value", type: "string", label: "Value", required: true },
            { key: "label", type: "string", label: "Label", required: true },
          ],
        },
        {
          key: "optionsProvider",
          type: "data-provider",
          providerKind: "options",
          label: "Options Source",
          visibleWhen: { field: "type", equals: "select" },
        },
        { key: "startKey", type: "string", label: "Start Key", required: true, visibleWhen: { field: "type", equals: "dateRange" } },
        { key: "endKey", type: "string", label: "End Key", required: true, visibleWhen: { field: "type", equals: "dateRange" } },
        { key: "startPlaceholder", type: "string", label: "Start Placeholder", visibleWhen: { field: "type", equals: "dateRange" } },
        { key: "endPlaceholder", type: "string", label: "End Placeholder", visibleWhen: { field: "type", equals: "dateRange" } },
      ],
    },
    { key: "features.search.enabled", type: "boolean", label: "Search" },
    { key: "features.search.placeholder", type: "string", label: "Search Placeholder", visibleWhen: { field: "features.search.enabled", equals: true } },
    { key: "features.search.debounceMs", type: "number", label: "Search Debounce", min: 0, precision: 0, visibleWhen: { field: "features.search.enabled", equals: true } },
    { key: "features.pagination.enabled", type: "boolean", label: "Pagination" },
    { key: "features.pagination.pageSize", type: "number", label: "Page Size", min: 1, precision: 0, visibleWhen: { field: "features.pagination.enabled", equals: true } },
    { key: "features.pagination.pageSizes", type: "number-list", label: "Page Sizes", min: 1, visibleWhen: { field: "features.pagination.enabled", equals: true } },
    {
      key: "features.sorting.mode",
      type: "choice",
      label: "Sorting",
      options: [
        { value: "none", label: "None" },
        { value: "single", label: "Single" },
        { value: "multiple", label: "Multiple" },
      ],
    },
    {
      key: "features.sorting.defaultSorts",
      type: "collection",
      label: "Default Sorts",
      itemKeyField: "key",
      itemLabelField: "key",
      addLabel: "Add sort",
      emptyLabel: "No default sorts",
      defaultItem: { key: "column", direction: "ascending" },
      visibleWhen: { field: "features.sorting.mode", notEquals: "none" },
      itemFields: [
        { key: "key", type: "string", label: "Provider Sort Field", required: true },
        { key: "direction", type: "choice", label: "Direction", options: [
          { value: "ascending", label: "Ascending" },
          { value: "descending", label: "Descending" },
        ] },
      ],
    },
    {
      key: "features.rowSelection.mode",
      type: "choice",
      label: "Row Selection",
      options: [
        { value: "none", label: "None" },
        { value: "single", label: "Single" },
        { value: "multiple", label: "Multiple" },
      ],
    },
    { key: "features.rowSelection.preserveSelectedRowIdentities", type: "boolean", label: "Preserve Selection", visibleWhen: { field: "features.rowSelection.mode", notEquals: "none" } },
    ...buildPhiTableConditionExpressionConfigFields("features.rowSelection.disabledWhen", "Selection Disabled Conditions", "any", "No disabled conditions").map((field) => ({ ...field, visibleWhen: { field: "features.rowSelection.mode", notEquals: "none" } })),
    {
      key: "features.actions.toolbar",
      type: "collection",
      presentation: "overlay",
      label: "Toolbar Actions",
      itemKeyField: "key",
      itemLabelField: "label",
      addLabel: "Add toolbar action",
      emptyLabel: "No toolbar actions",
      defaultItem: { key: "action", label: "Action", execution: "provider", display: "label", mode: "normal" },
      itemFields: PHI_TABLE_ACTION_CONFIG_FIELDS,
    },
    {
      key: "features.actions.rowLayout",
      type: "choice",
      label: "Row Action Layout",
      options: [
        { value: "spaced", label: "Spaced" },
        { value: "compact", label: "Compact" },
      ],
    },
    {
      key: "features.actions.row",
      type: "collection",
      presentation: "overlay",
      label: "Row Actions",
      itemKeyField: "key",
      itemLabelField: "label",
      addLabel: "Add row action",
      emptyLabel: "No row actions",
      defaultItem: { key: "action", label: "Action", execution: "provider", display: "label", mode: "normal" },
      itemFields: PHI_TABLE_ACTION_CONFIG_FIELDS,
    },
    {
      key: "features.actions.bulk",
      type: "collection",
      presentation: "overlay",
      label: "Bulk Actions",
      itemKeyField: "key",
      itemLabelField: "label",
      addLabel: "Add bulk action",
      emptyLabel: "No bulk actions",
      defaultItem: { key: "action", label: "Action", execution: "provider", display: "label", mode: "normal" },
      itemFields: PHI_TABLE_ACTION_CONFIG_FIELDS,
    },
    { key: "features.columnReordering.enabled", type: "boolean", label: "Visitor Column Reordering" },
    { key: "features.rowReordering.enabled", type: "boolean", label: "Provider Row Reordering" },
    { key: "features.editing.mode", type: "choice", label: "Editing", options: [
      { value: "none", label: "None" },
      { value: "cell", label: "Cell" },
      { value: "row", label: "Row" },
    ] },
    ...buildPhiTableConditionExpressionConfigFields("features.editing.disabledWhen", "Editing Disabled Conditions", "any", "No disabled conditions"),
    { key: "features.tools.mode", type: "choice", label: "Global Tools", options: [
      { value: "self-contained", label: "Self-contained" },
      { value: "external", label: "External" },
    ] },
    {
      key: "features.tools.bindingFields",
      type: "collection",
      presentation: "overlay",
      label: "Binding Tools",
      itemKeyField: "key",
      itemLabelField: "key",
      addLabel: "Add binding tool",
      emptyLabel: "No binding tools",
      defaultItem: { key: "binding", label: "Binding", control: "select" },
      itemFields: [
        { key: "key", type: "string", label: "Provider Binding Field", required: true },
        { key: "label", type: "string", label: "Label", required: true },
        { key: "placeholder", type: "string", label: "Placeholder" },
        { key: "control", type: "choice", label: "Control", options: [
          { value: "select", label: "Select" },
          { value: "autocomplete", label: "Autocomplete" },
          { value: "cascader", label: "Cascader" },
        ] },
        { key: "disabledWhen.fieldKey", type: "string", label: "Disable When Binding Field" },
        { key: "disabledWhen.equals", type: "string", label: "Disable When Value Equals" },
        {
          key: "optionLabels",
          type: "collection",
          label: "Option Labels",
          itemKeyField: "value",
          itemLabelField: "label",
          addLabel: "Add option label",
          emptyLabel: "Provider labels",
          defaultItem: { value: "value", label: "Label" },
          itemFields: [
            { key: "value", type: "string", label: "Provider Value", required: true },
            { key: "label", type: "string", label: "Display Label", required: true },
          ],
        },
        { key: "cascader.allowRoot", type: "boolean", label: "Allow Root", visibleWhen: { field: "control", equals: "cascader" } },
        { key: "cascader.separator", type: "string", label: "Path Separator", visibleWhen: { field: "control", equals: "cascader" } },
        { key: "cascader.rootValue", type: "string", label: "Root Value", visibleWhen: { field: "control", equals: "cascader" } },
        { key: "cascader.normalize", type: "choice", label: "Path Normalization", options: [
          { value: "raw", label: "Raw" },
          { value: "path", label: "Path" },
        ], visibleWhen: { field: "control", equals: "cascader" } },
        { key: "create.label", type: "string", label: "Create label" },
        { key: "create.description", type: "string", label: "Create description" },
        { key: "create.icon", type: "icon", label: "Create icon" },
        { key: "create.display", type: "choice", label: "Create display", options: [
          { value: "icon", label: "Icon" },
          { value: "label", label: "Label" },
          { value: "icon-label", label: "Icon and label" },
        ] },
        { key: "create.placeholder", type: "string", label: "Create placeholder" },
        { key: "create.submitLabel", type: "string", label: "Create submit label" },
      ],
      visibleWhen: { field: "features.tools.mode", equals: "self-contained" },
    },
    {
      key: "features.tools.reset",
      type: "boolean",
      label: "Reset Control",
      visibleWhen: { field: "features.tools.mode", equals: "self-contained" },
    },
    {
      key: "features.tools.reload",
      type: "boolean",
      label: "Reload Control",
      visibleWhen: { field: "features.tools.mode", equals: "self-contained" },
    },
    { key: "features.structure.mode", type: "choice", label: "Structure", options: [
      { value: "flat", label: "Flat" },
      { value: "tree", label: "Tree" },
    ] },
    { key: "features.structure.parentRowIdentityPath", type: "string", label: "Parent Row Identity Path", visibleWhen: { field: "features.structure.mode", equals: "tree" } },
    { key: "features.structure.expandColumnKey", type: "string", label: "Expand Column", visibleWhen: { field: "features.structure.mode", equals: "tree" } },
    { key: "features.structure.expandRowByClick", type: "boolean", label: "Expand Row By Click", visibleWhen: { field: "features.structure.mode", equals: "tree" } },
    { key: "features.structure.indentSize", type: "number", label: "Tree Indent", min: 0, precision: 0, visibleWhen: { field: "features.structure.mode", equals: "tree" } },
    {
      key: "presentation.footer.values",
      type: "collection",
      label: "Footer Values",
      itemKeyField: "key",
      itemLabelField: "label",
      addLabel: "Add footer value",
      emptyLabel: "No footer",
      defaultItem: {
        key: "total",
        value: { source: "core", fieldKey: "totalRows" },
      },
      itemFields: PHI_TABLE_FOOTER_VALUE_CONFIG_FIELDS,
    },
    { key: "presentation.footer.template", type: "string", label: "Footer Template" },
    { key: "presentation.footer.align", type: "choice", label: "Footer Alignment", options: [
      { value: "start", label: "Start" },
      { value: "center", label: "Center" },
      { value: "end", label: "End" },
    ] },
    { key: "presentation.summary.placement", type: "choice", label: "Summary Placement", options: [
      { value: "body-end", label: "Body end" },
      { value: "sticky-top", label: "Sticky top" },
      { value: "sticky-bottom", label: "Sticky bottom" },
    ] },
    {
      key: "presentation.summary.rows",
      type: "collection",
      label: "Summary Rows",
      itemKeyField: "key",
      itemLabelField: "key",
      addLabel: "Add summary row",
      emptyLabel: "No summary rows",
      defaultItem: { key: "summary", cells: [] },
      itemFields: [
        { key: "key", type: "string", label: "Key", required: true },
        {
          key: "cells",
          type: "collection",
          label: "Cells",
          itemKeyField: "key",
          itemLabelField: "key",
          addLabel: "Add summary cell",
          emptyLabel: "No summary cells",
          defaultItem: {
            key: "value",
            columnKey: "column",
            align: "left",
            item: { key: "value", value: { source: "core", fieldKey: "totalRows" } },
          },
          itemFields: PHI_TABLE_SUMMARY_CELL_CONFIG_FIELDS,
        },
      ],
    },
    { key: "presentation.emptyState.title", type: "string", label: "Empty Title" },
    { key: "presentation.emptyState.description", type: "string", label: "Empty Description" },
    { ...PHI_CONTROL_SIZE_FIELD, key: "presentation.controlSize" },
    { key: "presentation.borders", type: "boolean", label: "Borders" },
    { key: "presentation.header", type: "boolean", label: "Header" },
    { key: "presentation.stickyHeader", type: "boolean", label: "Sticky Header" },
    { key: "presentation.row.striped", type: "boolean", label: "Striped Rows" },
    ...buildPhiTableConditionExpressionConfigFields("presentation.row.mutedWhen", "Muted Row Conditions", "any", "No muted rows"),
  ],
  defaultConfig: {
    presentation: {
      columns: [],
      layout: { mode: "auto", overflowX: "auto" },
      borders: false,
      header: true,
      stickyHeader: true,
      row: { striped: false },
    },
    features: {
      pagination: { pageSizes: [10, 20, 50, 100] },
      sorting: { mode: "none", defaultSorts: [] },
      rowSelection: { mode: "none" },
      rowReordering: { enabled: false },
      editing: { mode: "none" },
      tools: { mode: "self-contained", reset: true, reload: false },
      structure: { mode: "flat" },
    },
    source: {
      providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentTable,
      resourceKey: "empty",
    },
    signalRoutes: null,
  },
  parseConfig: parsePhiTableWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiTableWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "tags"
  | "icon"
  | "iconFamily"
  | "slotSizePolicy"
  | "requiredRuntimeControllers"
  | "runtimeSignals"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
