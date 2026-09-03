import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { isPhiRuntimeDataProviderKey } from "../../../../../types/runtime-data-provider";
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
import { readBoolean, readNumber, readString } from "../../../../../components/widgets/config/parser-primitives";
import {
  PHI_CONTROL_SIZE_FIELD,
  parsePhiControlPresentationConfig,
} from "../../../../../components/widgets/config/control-signal-config";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../../../../plugins/runtime-modules/core/ids";
import { readPhiLengthValue } from "../../../../../types/length";
import { parsePhiControlOptionsProviderConfig } from "../../../../../components/controls/phi-control-options";
import {
  readPhiRuntimeConditionExpression,
  resolvePhiRuntimeConditionControllerRequirements,
} from "../../../../../types/runtime-condition";

function readConditionExpression(value: unknown) {
  return readPhiRuntimeConditionExpression(value) ?? undefined;
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readTableTagColor(value: unknown): PhiTableTagColor | undefined {
  if (typeof value === "string" && (PHI_TABLE_TAG_COLORS as readonly string[]).includes(value)) {
    return value as PhiTableTagColor;
  }
  if (!isRecord(value) || value.kind !== "custom") return undefined;
  const customValue = readString(value.value);
  return customValue ? { kind: "custom", value: customValue } : undefined;
}

function readTableTagVariant(value: unknown): PhiTableTagVariant {
  return typeof value === "string" && (PHI_TABLE_TAG_VARIANTS as readonly string[]).includes(value)
    ? value as PhiTableTagVariant
    : "outlined";
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

function isPhiTableCoreSummaryFieldKey(value: string): value is PhiTableCoreSummaryFieldKey {
  return (PHI_TABLE_CORE_SUMMARY_FIELD_KEYS as readonly string[]).includes(value);
}

function readTableSummaryItem(value: unknown): PhiTableSummaryItemDefinition | null {
  if (!isRecord(value)) return null;
  const key = readString(value.key);
  const rawValue = isRecord(value.value) ? value.value : {};
  const fieldKey = readString(rawValue.fieldKey);
  if (!key || !fieldKey) return null;
  const source: PhiTableSummaryValueSource | null = rawValue.source === "core" &&
    isPhiTableCoreSummaryFieldKey(fieldKey)
    ? { source: "core", fieldKey }
    : rawValue.source === "provider"
      ? { source: "provider", fieldKey }
      : null;
  if (!source) return null;
  return {
    key,
    value: source,
    label: readString(value.label),
    labelPlacement: value.labelPlacement === "after" ? "after" : "before",
  };
}

function readTableFooter(value: unknown): PhiTableFooterConfig | undefined {
  if (!isRecord(value) || !Array.isArray(value.values)) return undefined;
  const template = readString(value.template);
  const values = value.values.flatMap((item) => {
    const parsed = readTableSummaryItem(item);
    return parsed ? [{ key: parsed.key, value: parsed.value }] : [];
  });
  if (!template || values.length === 0) return undefined;
  return {
    template,
    values,
    align: value.align === "center" || value.align === "end"
      ? value.align
      : "start",
  };
}

function readTableSummary(value: unknown): PhiTableSummaryConfig | undefined {
  if (!isRecord(value) || !Array.isArray(value.rows)) return undefined;
  const rows = value.rows.flatMap<PhiTableSummaryConfig["rows"][number]>((rowValue) => {
    if (!isRecord(rowValue) || !Array.isArray(rowValue.cells)) return [];
    const key = readString(rowValue.key);
    if (!key) return [];
    const cells = rowValue.cells.flatMap<PhiTableSummaryConfig["rows"][number]["cells"][number]>((cellValue) => {
      if (!isRecord(cellValue)) return [];
      const cellKey = readString(cellValue.key);
      const columnKey = readString(cellValue.columnKey);
      const item = readTableSummaryItem(cellValue.item);
      if (!cellKey || !columnKey || !item) return [];
      return [{
        key: cellKey,
        columnKey,
        throughColumnKey: readString(cellValue.throughColumnKey),
        align: cellValue.align === "center" || cellValue.align === "right" ? cellValue.align : "left" as const,
        item,
      }];
    });
    return cells.length > 0 ? [{ key, cells }] : [];
  });
  if (rows.length === 0) return undefined;
  return {
    placement: value.placement === "sticky-top" || value.placement === "sticky-bottom"
      ? value.placement
      : "body-end",
    rows,
  };
}

function readColumns(value: unknown): PhiTableColumnDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }
    const key = readString(item.key);
    const title = readString(item.title);
    if (!key || !title) {
      return [];
    }
    const fieldKey = readString(item.fieldKey);
    if (!fieldKey) {
      return [];
    }
    const renderer = item.renderer === "email" || item.renderer === "date" || item.renderer === "datetime" ||
      item.renderer === "badge" || item.renderer === "tags" || item.renderer === "link" ||
      item.renderer === "code" || item.renderer === "json" || item.renderer === "switch" ||
      item.renderer === "checkbox" || item.renderer === "icon"
      ? item.renderer
      : "text";
    const align = item.align === "center" || item.align === "right" ? item.align : "left";
    const rawSizing = isRecord(item.sizing) ? item.sizing : {};
    const sizing = readTableColumnSizing(rawSizing);
    const valueMap = isRecord(item.valueMap)
      ? Object.fromEntries(
          Object.entries(item.valueMap).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        )
      : undefined;
    const tagColorMap = isRecord(item.tagColorMap)
      ? Object.fromEntries(
          Object.entries(item.tagColorMap).flatMap(([key, value]) => {
            const color = readTableTagColor(value);
            return color == null ? [] : [[key, color]];
          }),
        )
      : undefined;
    const rawEditor = isRecord(item.editor) ? item.editor : undefined;
    const editorControl = readTableColumnEditorControl(rawEditor?.control);
    return [{
      key,
      title,
      fieldKey,
      sortField: readString(item.sortField),
      iconFieldKey: readString(item.iconFieldKey),
      renderer,
      editor: rawEditor && readBoolean(rawEditor.enabled) !== false
        ? { control: editorControl, disabledWhen: readConditionExpression(rawEditor.disabledWhen) }
        : undefined,
      sizing,
      align,
      sticky: item.sticky === "left" || item.sticky === "right" ? item.sticky : undefined,
      sortable: readBoolean(item.sortable),
      hidden: readBoolean(item.hidden),
      ellipsis: readBoolean(item.ellipsis),
      valueMap,
      tagColorMap,
      tagVariant: readTableTagVariant(item.tagVariant),
    }];
  });
}

function readTableColumnEditorControl(value: unknown): PhiTableColumnEditorControl | undefined {
  return value === "switch" || value === "checkbox" || value === "select" || value === "radio" ||
    value === "segmented" || value === "multi-select" || value === "checkbox-group" || value === "icon-picker"
    ? value
    : undefined;
}

function readTableColumnSizing(value: Record<string, unknown>): PhiTableColumnSizing {
  const minWidth = readPhiLengthValue(value.minWidth) ?? undefined;
  const maxWidth = readPhiLengthValue(value.maxWidth) ?? undefined;
  if (value.mode === "content") return { mode: "content", minWidth, maxWidth };
  if (value.mode === "fixed") {
    const width = readPhiLengthValue(value.width);
    return width == null ? { mode: "content" } : { mode: "fixed", width };
  }
  if (value.mode === "fill") return { mode: "fill", minWidth, maxWidth };
  return { mode: "content", minWidth, maxWidth };
}

function readFilterOptions(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }
    const label = readString(item.label);
    const optionValue = readString(item.value);
    return label && optionValue ? [{ label, value: optionValue }] : [];
  });
}

function readFilters(value: unknown): PhiTableFilterDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const result: PhiTableFilterDefinition[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const key = readString(item.key);
    const label = readString(item.label);
    if (!key || !label) {
      continue;
    }
    if (item.type === "select") {
      result.push({
        key,
        type: "select" as const,
        label,
        multiple: readBoolean(item.multiple),
        options: readFilterOptions(item.options),
        optionsProvider: parsePhiControlOptionsProviderConfig(item.optionsProvider),
        defaultValue: typeof item.defaultValue === "string" ||
          (Array.isArray(item.defaultValue) && item.defaultValue.every((entry) => typeof entry === "string"))
          ? item.defaultValue
          : undefined,
      });
      continue;
    }
    if (item.type === "boolean") {
      result.push({ key, type: "boolean", label, defaultValue: readBoolean(item.defaultValue) });
      continue;
    }
    if (item.type === "dateRange") {
      const startKey = readString(item.startKey);
      const endKey = readString(item.endKey);
      if (!startKey || !endKey) {
        continue;
      }
      const defaultValue = isRecord(item.defaultValue)
        ? { start: readString(item.defaultValue.start), end: readString(item.defaultValue.end) }
        : undefined;
      result.push({
        key,
        type: "dateRange" as const,
        label,
        startKey,
        endKey,
        startPlaceholder: readString(item.startPlaceholder),
        endPlaceholder: readString(item.endPlaceholder),
        defaultValue,
      });
      continue;
    }
    result.push({
      key,
      type: "text" as const,
      label,
      placeholder: readString(item.placeholder),
      defaultValue: readString(item.defaultValue),
    });
  }
  return result;
}

function readActions(value: unknown): PhiTableActionDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const result: PhiTableActionDefinition[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const key = readString(item.key);
    const label = readString(item.label);
    const execution = item.execution === "provider" || item.execution === "signal" || item.execution === "link"
      ? item.execution
      : null;
    if (!key || !label || !execution) {
      continue;
    }
    result.push({
      key,
      label,
      execution,
      icon: readString(item.icon),
      display: item.display === "icon" || item.display === "label" || item.display === "icon-label"
        ? item.display
        : undefined,
      mode: item.mode === "primary" || item.mode === "danger" ? item.mode : "normal",
      href: readString(item.href),
      hrefPath: readString(item.hrefPath),
      newTab: readBoolean(item.newTab),
      visibleWhen: readConditionExpression(item.visibleWhen),
      disabledWhen: readConditionExpression(item.disabledWhen),
      confirm: isRecord(item.confirm) && readString(item.confirm.title)
        ? (() => {
            const alertLevel: PhiFeedbackLevel | undefined = isRecord(item.confirm.alert) &&
              (item.confirm.alert.level === "success" || item.confirm.alert.level === "info" ||
                item.confirm.alert.level === "warning" || item.confirm.alert.level === "error")
              ? item.confirm.alert.level
              : undefined;
            const alert = isRecord(item.confirm.alert) && readString(item.confirm.alert.title) && alertLevel
              ? {
                  level: alertLevel,
                  title: readString(item.confirm.alert.title) as string,
                  description: readString(item.confirm.alert.description),
                }
              : undefined;
            return {
              title: readString(item.confirm.title) as string,
              description: readString(item.confirm.description),
              okText: readString(item.confirm.okText),
              cancelText: readString(item.confirm.cancelText),
              alert,
            };
          })()
        : undefined,
    });
  }
  return result;
}

function readSource(value: unknown): PhiTableWidgetConfig["source"] {
  if (!isRecord(value)) {
    return null;
  }
  const providerKey = readString(value.providerKey);
  const resourceKey = readString(value.resourceKey);
  return isPhiRuntimeDataProviderKey(providerKey) && resourceKey
    ? {
        providerKey,
        resourceKey,
        params: isRecord(value.params) ? value.params : undefined,
      }
    : null;
}

export function parsePhiTableWidgetConfig(config: Record<string, unknown>): PhiTableWidgetConfig {
  const presentation = isRecord(config.presentation) ? config.presentation : {};
  const features = isRecord(config.features) ? config.features : {};
  const search = isRecord(features.search) ? features.search : {};
  const pagination = isRecord(features.pagination) ? features.pagination : {};
  const sorting = isRecord(features.sorting) ? features.sorting : {};
  const rowSelection = isRecord(features.rowSelection) ? features.rowSelection : {};
  const rowReordering = isRecord(features.rowReordering) ? features.rowReordering : {};
  const columnReordering = isRecord(features.columnReordering) ? features.columnReordering : {};
  const editing = isRecord(features.editing) ? features.editing : {};
  const tools = isRecord(features.tools) ? features.tools : {};
  const structure = isRecord(features.structure) ? features.structure : {};
  const actions = isRecord(features.actions) ? features.actions : {};
  const emptyState = isRecord(presentation.emptyState) ? presentation.emptyState : {};
  const layout = isRecord(presentation.layout) ? presentation.layout : {};
  const row = isRecord(presentation.row) ? presentation.row : {};
  const initialQuery = readPhiTableQuery(
    isRecord(config.initialQuery) ? config.initialQuery : {},
  ) ?? {};
  const defaultSorts = readPhiTableQuery({ sorts: sorting.defaultSorts })?.sorts ?? [];
  const presentationControls = parsePhiControlPresentationConfig(presentation);
  const toolsMode = tools.mode === "external" ? "external" : "self-contained";
  const toolsReset = readBoolean(tools.reset);
  const treeStructure = structure.mode === "tree" && readString(structure.parentRowIdentityPath)
    ? {
        mode: "tree" as const,
        parentRowIdentityPath: readString(structure.parentRowIdentityPath) as string,
        defaultExpandedRowIdentities: readPhiTableQuery({
          expandedRowIdentities: structure.defaultExpandedRowIdentities,
        })?.expandedRowIdentities,
        expandRowByClick: readBoolean(structure.expandRowByClick),
        indentSize: readNumber(structure.indentSize),
        expandColumnKey: readString(structure.expandColumnKey) as string,
      }
    : { mode: "flat" as const };

  return {
    presentation: {
      ...presentationControls,
      controlSize: presentationControls.controlSize ?? (toolsMode === "self-contained" ? "small" : undefined),
      title: readString(presentation.title),
      description: readString(presentation.description),
      columns: readColumns(presentation.columns),
      layout: {
        mode: layout.mode === "fixed" ? "fixed" : "auto",
        overflowX: layout.overflowX === "visible" ? "visible" : "auto",
      },
      emptyState: {
        title: readString(emptyState.title),
        description: readString(emptyState.description),
      },
      bordered: readBoolean(presentation.bordered),
      showHeader: readBoolean(presentation.showHeader),
      footer: readTableFooter(presentation.footer),
      summary: readTableSummary(presentation.summary),
      row: {
        striped: readBoolean(row.striped),
        mutedWhen: readConditionExpression(row.mutedWhen),
      },
    },
    features: {
      search: {
        enabled: readBoolean(search.enabled),
        placeholder: readString(search.placeholder),
        debounceMs: readNumber(search.debounceMs),
      },
      filters: readFilters(features.filters),
      pagination: {
        enabled: readBoolean(pagination.enabled),
        pageSize: readNumber(pagination.pageSize),
        pageSizeOptions: Array.isArray(pagination.pageSizeOptions)
          ? pagination.pageSizeOptions.filter((value): value is number => typeof value === "number" && Number.isFinite(value))
          : undefined,
        showSizeChanger: readBoolean(pagination.showSizeChanger),
      },
      sorting: {
        mode: sorting.mode === "single" || sorting.mode === "multiple" ? sorting.mode : "none",
        defaultSorts,
      },
      rowSelection: {
        mode: rowSelection.mode === "single" || rowSelection.mode === "multiple" ? rowSelection.mode : "none",
        preserveSelectedRowIdentities: readBoolean(rowSelection.preserveSelectedRowIdentities),
        disabledWhen: readConditionExpression(rowSelection.disabledWhen),
      },
      rowReordering: {
        enabled: readBoolean(rowReordering.enabled),
      },
      columnReordering: {
        enabled: readBoolean(columnReordering.enabled),
      },
      editing: {
        mode: editing.mode === "cell" || editing.mode === "row" ? editing.mode : "none",
        disabledWhen: readConditionExpression(editing.disabledWhen),
      },
      tools: {
        mode: toolsMode,
        bindingFields: Array.isArray(tools.bindingFields)
          ? tools.bindingFields.flatMap((entry) => {
              if (!isRecord(entry) || !readString(entry.key)) return [];
              const rawCreate = isRecord(entry.create) ? entry.create : null;
              const createLabel = readString(rawCreate?.label);
              const disabledWhen = isRecord(entry.disabledWhen) && readString(entry.disabledWhen.fieldKey) &&
                (typeof entry.disabledWhen.equals === "string" ||
                  typeof entry.disabledWhen.equals === "boolean" ||
                  typeof entry.disabledWhen.equals === "number" && Number.isFinite(entry.disabledWhen.equals))
                ? {
                    fieldKey: readString(entry.disabledWhen.fieldKey)!,
                    equals: entry.disabledWhen.equals,
                  }
                : undefined;
              const optionLabels = Array.isArray(entry.optionLabels)
                ? entry.optionLabels.flatMap((option) => {
                    if (!isRecord(option)) return [];
                    const value = typeof option.value === "number" && Number.isFinite(option.value)
                      ? option.value
                      : readString(option.value);
                    const label = readString(option.label);
                    return value !== undefined && label ? [{ value, label }] : [];
                  })
                : [];
              const cascader = isRecord(entry.cascader) ? {
                allowRoot: readBoolean(entry.cascader.allowRoot),
                separator: readString(entry.cascader.separator),
                rootValue: readString(entry.cascader.rootValue),
                normalize: entry.cascader.normalize === "path" ? "path" as const : "raw" as const,
              } : undefined;
              return [{
                key: readString(entry.key)!,
                label: readString(entry.label),
                placeholder: readString(entry.placeholder),
                control: entry.control === "autocomplete" || entry.control === "cascader"
                  ? entry.control
                  : "select" as const,
                ...(disabledWhen ? { disabledWhen } : {}),
                ...(optionLabels.length > 0 ? { optionLabels } : {}),
                ...(cascader ? { cascader } : {}),
                create: rawCreate && createLabel ? {
                  label: createLabel,
                  description: readString(rawCreate.description),
                  icon: readString(rawCreate.icon),
                  display: rawCreate.display === "label" || rawCreate.display === "icon-label"
                    ? rawCreate.display
                    : "icon" as const,
                  placeholder: readString(rawCreate.placeholder),
                  submitLabel: readString(rawCreate.submitLabel),
                } : undefined,
              }];
            })
          : undefined,
        ...(toolsReset === undefined ? {} : { reset: toolsReset }),
        reload: readBoolean(tools.reload),
      },
      structure: treeStructure,
      actions: {
        rowLayout: actions.rowLayout === "spaced" ? "spaced" : "compact",
        toolbar: readActions(actions.toolbar),
        row: readActions(actions.row),
        bulk: readActions(actions.bulk),
      },
    },
    initialQuery: {
      ...initialQuery,
      sorts: initialQuery.sorts as readonly PhiTableSort[] | undefined,
    },
    source: readSource(config.source),
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
        ...buildPhiTableConditionExpressionConfigFields("editor.disabledWhen", "Editor Disabled Conditions", "any", "No disabled conditions").map((field) => ({ ...field, visibleWhen: { field: "editor.enabled", equals: true } })),
        { key: "hidden", type: "boolean", label: "Hidden" },
        { key: "ellipsis", type: "boolean", label: "Ellipsis" },
      ],
    },
    {
      key: "features.filters",
      type: "collection",
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
    { key: "features.pagination.showSizeChanger", type: "boolean", label: "Page Size Changer", visibleWhen: { field: "features.pagination.enabled", equals: true } },
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
    { key: "presentation.bordered", type: "boolean", label: "Bordered" },
    { key: "presentation.showHeader", type: "boolean", label: "Show Header" },
    { key: "presentation.row.striped", type: "boolean", label: "Striped Rows" },
    ...buildPhiTableConditionExpressionConfigFields("presentation.row.mutedWhen", "Muted Row Conditions", "any", "No muted rows"),
  ],
  defaultConfig: {
    presentation: {
      columns: [],
      layout: { mode: "auto", overflowX: "auto" },
      bordered: false,
      showHeader: true,
      row: { striped: false },
    },
    features: {
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

export const PHI_TABLE_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Table;
