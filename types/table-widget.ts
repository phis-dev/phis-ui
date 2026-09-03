import type { PhiControlPresentationConfig, PhiFeedbackLevel } from "./control";
import type { PhiCssLength } from "./length";
import type { PhiControlOption, PhiControlOptionsProviderConfig } from "../components/controls/phi-control-options";
import type {
  PhiRuntimeDataProviderKey,
} from "./runtime-data-provider";
import type { PhiSignalRouteSet } from "./signals";
import type { PhiRuntimeConditionExpression } from "./runtime-condition";

export type PhiTableRowIdentity = string | number;
export type PhiTableSortDirection = "ascending" | "descending";
export const PHI_TABLE_TAG_COLORS = [
  "default",
  "success",
  "processing",
  "warning",
  "error",
  "magenta",
  "red",
  "volcano",
  "orange",
  "gold",
  "lime",
  "green",
  "cyan",
  "blue",
  "geekblue",
  "purple",
] as const;
export const PHI_TABLE_TAG_VARIANTS = ["outlined", "filled", "solid"] as const;
export type PhiTablePresetTagColor = (typeof PHI_TABLE_TAG_COLORS)[number];
export type PhiTableTagColor = PhiTablePresetTagColor | { kind: "custom"; value: string };
export type PhiTableTagVariant = (typeof PHI_TABLE_TAG_VARIANTS)[number];

export type PhiTableQueryValue =
  | string
  | number
  | boolean
  | readonly string[]
  | readonly number[]
  | null
  | undefined;

export type PhiTableSort = {
  key: string;
  direction: PhiTableSortDirection;
};

export type PhiTableColumnSizing =
  | {
      mode: "content";
      minWidth?: PhiCssLength;
      maxWidth?: PhiCssLength;
    }
  | {
      mode: "fixed";
      width: PhiCssLength;
    }
  | {
      mode: "fill";
      minWidth?: PhiCssLength;
      maxWidth?: PhiCssLength;
    };

export type PhiTableLayoutConfig = {
  mode: "auto" | "fixed";
  overflowX: "auto" | "visible";
};

export type PhiTableQuery = {
  page?: number;
  pageSize?: number;
  cursor?: string | null;
  search?: string;
  sorts?: readonly PhiTableSort[];
  filters?: Readonly<Record<string, PhiTableQueryValue>>;
  expandedRowIdentities?: readonly PhiTableRowIdentity[];
};

export type PhiTableColumnDefinition = {
  key: string;
  title: string;
  fieldKey: string;
  sortField?: string;
  /**
   * An icon field rendered ahead of this column's own value, so that a name and the icon standing for
   * it read as one thing rather than as two columns that happen to be adjacent. Mirrors the Tree
   * Control's node `iconFieldKey`.
   */
  iconFieldKey?: string;
  renderer?: "text" | "email" | "date" | "datetime" | "badge" | "tags" | "link" | "code" | "json" | "switch" | "checkbox" | "icon";
  editor?: {
    control?: PhiTableColumnEditorControl;
    disabledWhen?: PhiRuntimeConditionExpression;
  };
  sizing?: PhiTableColumnSizing;
  align?: "left" | "center" | "right";
  sticky?: "left" | "right";
  sortable?: boolean;
  hidden?: boolean;
  ellipsis?: boolean;
  valueMap?: Readonly<Record<string, string>>;
  tagColorMap?: Readonly<Record<string, PhiTableTagColor>>;
  tagVariant?: PhiTableTagVariant;
};

export type PhiTableColumnEditorControl =
  | "switch"
  | "checkbox"
  | "select"
  | "radio"
  | "segmented"
  | "multi-select"
  | "checkbox-group"
  | "icon-picker";

export type PhiTableFilterDefinition =
  | {
      key: string;
      type: "text";
      label: string;
      placeholder?: string;
      defaultValue?: string;
    }
  | {
      key: string;
      type: "select";
      label: string;
      multiple?: boolean;
      options?: readonly { label: string; value: string }[];
      optionsProvider?: PhiControlOptionsProviderConfig | null;
      defaultValue?: string | readonly string[];
    }
  | {
      key: string;
      type: "boolean";
      label: string;
      defaultValue?: boolean;
    }
  | {
      key: string;
      type: "dateRange";
      label: string;
      startKey: string;
      endKey: string;
      startPlaceholder?: string;
      endPlaceholder?: string;
      defaultValue?: {
        start?: string;
        end?: string;
      };
    };

export type PhiTableActionExecution = "provider" | "signal" | "link";

export type PhiTableActionDefinition = {
  key: string;
  execution: PhiTableActionExecution;
  label: string;
  icon?: string;
  display?: "icon" | "label" | "icon-label";
  mode?: "normal" | "primary" | "danger";
  href?: string;
  hrefPath?: string;
  newTab?: boolean;
  visibleWhen?: PhiRuntimeConditionExpression;
  disabledWhen?: PhiRuntimeConditionExpression;
  confirm?: {
    title: string;
    description?: string;
    okText?: string;
    cancelText?: string;
    alert?: {
      level: PhiFeedbackLevel;
      title: string;
      description?: string;
    };
  };
};

export type PhiTableSearchConfig = {
  enabled?: boolean;
  placeholder?: string;
  debounceMs?: number;
};

export type PhiTablePaginationConfig = {
  enabled?: boolean;
  pageSize?: number;
  pageSizeOptions?: readonly number[];
  showSizeChanger?: boolean;
};

export type PhiTableSortingConfig = {
  mode?: "none" | "single" | "multiple";
  defaultSorts?: readonly PhiTableSort[];
};

export type PhiTableRowSelectionConfig = {
  mode?: "none" | "single" | "multiple";
  preserveSelectedRowIdentities?: boolean;
  disabledWhen?: PhiRuntimeConditionExpression;
};

export type PhiTableColumnReorderingConfig = {
  enabled?: boolean;
};

export type PhiTableRowReorderingConfig = {
  enabled?: boolean;
};

export type PhiTableEditingConfig = {
  mode?: "none" | "cell" | "row";
  disabledWhen?: PhiRuntimeConditionExpression;
};

export type PhiTableToolsConfig = {
  mode?: "self-contained" | "external";
  bindingFields?: readonly PhiTableBindingToolDefinition[];
  reset?: boolean;
  reload?: boolean;
};

export type PhiTableBindingToolDefinition = {
  key: string;
  label?: string;
  placeholder?: string;
  control?: "select" | "autocomplete" | "cascader";
  disabledWhen?: {
    fieldKey: string;
    equals: string | number | boolean;
  };
  optionLabels?: readonly {
    value: string | number;
    label: string;
  }[];
  cascader?: {
    allowRoot?: boolean;
    separator?: string;
    rootValue?: string;
    normalize?: "raw" | "path";
  };
  create?: {
    label: string;
    description?: string;
    icon?: string;
    display?: "icon" | "label" | "icon-label";
    placeholder?: string;
    submitLabel?: string;
  };
};

export type PhiTableStructureConfig =
  | { mode: "flat" }
  | {
      mode: "tree";
      parentRowIdentityPath: string;
      defaultExpandedRowIdentities?: readonly PhiTableRowIdentity[];
      expandRowByClick?: boolean;
      indentSize?: number;
      expandColumnKey: string;
    };

export type PhiTableSourceBinding = {
  providerKey: PhiRuntimeDataProviderKey;
  resourceKey: string;
  params?: Record<string, unknown>;
};

export type PhiTableSummaryValue = string | number | boolean | null;

export type PhiTableSummaryValueSource =
  | { source: "provider"; fieldKey: string }
  | {
      source: "core";
      fieldKey: "totalRows" | "pageRows" | "selectedRows" | "page" | "pageCount";
    };

export type PhiTableSummaryItemDefinition = {
  key: string;
  value: PhiTableSummaryValueSource;
  label?: string;
  labelPlacement?: "before" | "after";
};

export type PhiTableFooterValueBinding = {
  key: string;
  value: PhiTableSummaryValueSource;
};

export type PhiTableFooterConfig = {
  template: string;
  values: readonly PhiTableFooterValueBinding[];
  align?: "start" | "center" | "end";
};

export type PhiTableSummaryConfig = {
  placement?: "body-end" | "sticky-top" | "sticky-bottom";
  rows: readonly {
    key: string;
    cells: readonly {
      key: string;
      columnKey: string;
      throughColumnKey?: string;
      align?: "left" | "center" | "right";
      item: PhiTableSummaryItemDefinition;
    }[];
  }[];
};

export type PhiTableWidgetPresentation = PhiControlPresentationConfig & {
  title?: string;
  description?: string;
  columns: readonly PhiTableColumnDefinition[];
  layout: PhiTableLayoutConfig;
  emptyState?: {
    title?: string;
    description?: string;
  };
  bordered?: boolean;
  showHeader?: boolean;
  footer?: PhiTableFooterConfig;
  summary?: PhiTableSummaryConfig;
  row?: {
    striped?: boolean;
    mutedWhen?: PhiRuntimeConditionExpression;
  };
};

export type PhiTableWidgetFeatures = {
  search?: PhiTableSearchConfig;
  filters?: readonly PhiTableFilterDefinition[];
  pagination?: PhiTablePaginationConfig;
  sorting?: PhiTableSortingConfig;
  rowSelection?: PhiTableRowSelectionConfig;
  rowReordering?: PhiTableRowReorderingConfig;
  columnReordering?: PhiTableColumnReorderingConfig;
  editing?: PhiTableEditingConfig;
  tools?: PhiTableToolsConfig;
  structure?: PhiTableStructureConfig;
  actions?: {
    rowLayout?: "spaced" | "compact";
    toolbar?: readonly PhiTableActionDefinition[];
    row?: readonly PhiTableActionDefinition[];
    bulk?: readonly PhiTableActionDefinition[];
  };
};

export type PhiTableWidgetConfig = {
  presentation: PhiTableWidgetPresentation;
  features: PhiTableWidgetFeatures;
  initialQuery?: PhiTableQuery;
  source: PhiTableSourceBinding | null;
  signalRoutes?: PhiSignalRouteSet | null;
};

export type PhiTableWidgetState = {
  total?: number;
  page?: number;
  pageSize?: number;
  loading: boolean;
  errorCode?: string | null;
  query: PhiTableQuery;
  bindingParams: Readonly<Record<string, unknown>>;
  selectedRowIdentities: readonly PhiTableRowIdentity[];
  columnOrder: readonly string[];
  expandedRowIdentities: readonly PhiTableRowIdentity[];
};

export type PhiTableSelectionSignalValue = {
  selectedRowIdentities: readonly PhiTableRowIdentity[];
};

export type PhiTableColumnOrderSignalValue = {
  columnOrder: readonly string[];
};

export type PhiTableExpansionSignalValue = {
  expandedRowIdentities: readonly PhiTableRowIdentity[];
};

export type PhiTableActionSignalValue = {
  actionKey: string;
  rowIdentity?: PhiTableRowIdentity | null;
  selectedRowIdentities: readonly PhiTableRowIdentity[];
  actionValue?: PhiTableQueryValue;
};

export type PhiTableBindingParamsSignalValue = {
  params: Readonly<Record<string, PhiTableQueryValue>>;
};

export type PhiTableProviderFieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "color"
  | "icon"
  | "enum"
  | "enum[]"
  | "json";

export type PhiTableProviderFieldDefinition = {
  key: string;
  title: string;
  type: PhiTableProviderFieldType;
  required?: boolean;
  mutable?: boolean;
  mutableWhen?: PhiRuntimeConditionExpression;
  constraints?: {
    min?: number | string;
    max?: number | string;
    step?: number;
    precision?: number;
  };
  options?: readonly PhiControlOption<string | number>[];
  optionsProvider?: PhiControlOptionsProviderConfig;
  editor?: {
    fieldProviderKey?: `${string}/${string}`;
    config?: Record<string, unknown>;
  };
};

export type PhiTableProviderSummaryFieldDefinition = {
  key: string;
  title: string;
  type: "string" | "number" | "boolean" | "date" | "datetime";
};

export type PhiTableProviderQueryCapabilities = {
  search?: boolean;
  filterFields?: readonly string[];
  sorting?: "none" | "single" | "multiple";
  pagination?: "none" | "offset" | "cursor";
  facets?: readonly string[];
  expansion?: boolean;
};

export type PhiTableProviderActionCapability = {
  key: string;
  title: string;
  scope: "resource" | "row" | "selection";
  valueType?: "none" | "boolean" | "string" | "number" | "string[]" | "number[]" | "json";
  intent?: "read" | "write" | "destructive";
  confirmation?: "none" | "required";
  visibleWhen?: PhiRuntimeConditionExpression;
  disabledWhen?: PhiRuntimeConditionExpression;
};

export type PhiTableProviderBindingFieldDefinition = {
  key: string;
  title: string;
  type: "string" | "enum";
  required?: boolean;
  defaultValue?: string | number;
  options?: readonly PhiControlOption<string | number>[];
  optionsProvider?: PhiControlOptionsProviderConfig;
  create?: {
    actionKey: string;
  };
};

export type PhiTableProviderRowOrdering = "none" | "flat" | "tree";

export type PhiTableProviderDragDropCapability = {
  payloadType: `${string}/${string}`;
  modes?: readonly ("before" | "after" | "child" | "replace" | "append")[];
};

export type PhiTableProviderResourceDescriptor = {
  resourceKey: string;
  title: string;
  description?: string;
  rowIdentityPath: string;
  fields: readonly PhiTableProviderFieldDefinition[];
  summaryFields?: readonly PhiTableProviderSummaryFieldDefinition[];
  bindingFields?: readonly PhiTableProviderBindingFieldDefinition[];
  query: PhiTableProviderQueryCapabilities;
  recordRead?: boolean;
  actions?: readonly PhiTableProviderActionCapability[];
  rowOrdering?: PhiTableProviderRowOrdering;
  dragSources?: readonly PhiTableProviderDragDropCapability[];
  dropTargets?: readonly PhiTableProviderDragDropCapability[];
  hierarchy?: {
    parentRowIdentityPath: string;
    canAcceptChildrenField?: string;
  };
};

export type PhiTableProviderQueryResult = {
  rows: readonly Record<string, unknown>[];
  total?: number;
  page?: number;
  pageSize?: number;
  nextCursor?: string | null;
  facets?: Readonly<Record<string, unknown>>;
  summary?: Readonly<Record<string, PhiTableSummaryValue>>;
  resolvedQuery?: PhiTableQuery;
};

export type PhiTableProviderQueryRequest = {
  resourceKey: string;
  query: PhiTableQuery;
  params?: Record<string, unknown>;
  signal: AbortSignal;
};

export type PhiTableProviderRecordRequest = {
  resourceKey: string;
  rowIdentity: PhiTableRowIdentity | null;
  params?: Record<string, unknown>;
  signal: AbortSignal;
};

export type PhiTableProviderMutationInvalidation = "none" | "view" | "resource";

export type PhiTableProviderMutationResult = {
  status: "accepted" | "rejected";
  invalidation: PhiTableProviderMutationInvalidation;
  canonicalValue?: unknown;
  rowPatch?: Record<string, unknown>;
  summaryPatch?: Readonly<Record<string, PhiTableSummaryValue>>;
  value?: Record<string, unknown> | null;
  errorCode?: string;
  message?: string;
};

type PhiTableProviderMutationRequestBase = {
  resourceKey: string;
  params?: Record<string, unknown>;
  signal: AbortSignal;
};

export type PhiTableProviderActionMutationRequest = PhiTableProviderMutationRequestBase & {
  kind: "action";
  actionKey: string;
  rowIdentity?: PhiTableRowIdentity | null;
  selectedRowIdentities?: readonly PhiTableRowIdentity[];
  actionValue?: PhiTableQueryValue | Record<string, unknown>;
  query: PhiTableQuery;
};

export type PhiTableProviderFieldMutationRequest = PhiTableProviderMutationRequestBase & {
  kind: "field";
  rowIdentity: PhiTableRowIdentity;
  fieldKey: string;
  originalValue: unknown;
  proposedValue: unknown;
  concurrencyToken?: string | number | null;
};

export type PhiTableProviderRowPatchMutationRequest = PhiTableProviderMutationRequestBase & {
  kind: "row";
  rowIdentity: PhiTableRowIdentity;
  originalValues?: Readonly<Record<string, unknown>>;
  patch: Readonly<Record<string, unknown>>;
  concurrencyToken?: string | number | null;
};

export type PhiTableProviderRowMoveMutationRequest = PhiTableProviderMutationRequestBase & {
  kind: "row-move";
  movedRowIdentity: PhiTableRowIdentity;
  targetParentRowIdentity: PhiTableRowIdentity | null;
  beforeRowIdentity: PhiTableRowIdentity | null;
  afterRowIdentity: PhiTableRowIdentity | null;
  concurrencyToken?: string | number | null;
};

export type PhiTableProviderDropMutationRequest = PhiTableProviderMutationRequestBase & {
  kind: "drop";
  payloadType: `${string}/${string}`;
  sourceObjectIdentity: string;
  source?: {
    providerKey: PhiRuntimeDataProviderKey;
    resourceKey: string;
    objectIdentities: readonly PhiTableRowIdentity[];
  };
  dropMode: "before" | "after" | "child" | "replace" | "append";
  targetParentRowIdentity: PhiTableRowIdentity | null;
  beforeRowIdentity: PhiTableRowIdentity | null;
  afterRowIdentity: PhiTableRowIdentity | null;
};

export type PhiTableProviderMutationRequest =
  | PhiTableProviderActionMutationRequest
  | PhiTableProviderFieldMutationRequest
  | PhiTableProviderRowPatchMutationRequest
  | PhiTableProviderRowMoveMutationRequest
  | PhiTableProviderDropMutationRequest;

export class PhiTableProviderError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PhiTableProviderError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readPositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function readRowIdentities(value: unknown): PhiTableRowIdentity[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.every((entry) =>
    typeof entry === "string" || (typeof entry === "number" && Number.isFinite(entry)))
    ? value as PhiTableRowIdentity[]
    : undefined;
}

function isPhiTableQueryValue(value: unknown): value is PhiTableQueryValue {
  return value == null ||
    typeof value === "string" ||
    typeof value === "number" && Number.isFinite(value) ||
    typeof value === "boolean" ||
    Array.isArray(value) && value.every((entry) =>
      typeof entry === "string" || typeof entry === "number" && Number.isFinite(entry));
}

export function readPhiTableQuery(value: unknown): PhiTableQuery | null {
  if (!isRecord(value)) return null;
  const allowedKeys = new Set([
    "page", "pageSize", "cursor", "search", "sorts", "filters", "expandedRowIdentities",
  ]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null;
  if (value.filters !== undefined &&
    (!isRecord(value.filters) || Object.values(value.filters).some((filterValue) => !isPhiTableQueryValue(filterValue)))) {
    return null;
  }
  const filters = value.filters as Record<string, PhiTableQueryValue> | undefined;
  if (value.sorts !== undefined && (!Array.isArray(value.sorts) || value.sorts.some((entry) =>
    !isRecord(entry) || Object.keys(entry).some((key) => key !== "key" && key !== "direction") ||
    typeof entry.key !== "string" || !entry.key.trim() ||
    (entry.direction !== "ascending" && entry.direction !== "descending")))) {
    return null;
  }
  const sorts = value.sorts as PhiTableSort[] | undefined;
  const expandedRowIdentities = readRowIdentities(value.expandedRowIdentities);
  if (value.expandedRowIdentities !== undefined && expandedRowIdentities === undefined) return null;
  if (value.page !== undefined && readPositiveInteger(value.page) === undefined) return null;
  if (value.pageSize !== undefined && readPositiveInteger(value.pageSize) === undefined) return null;
  if (value.cursor !== undefined && value.cursor !== null && typeof value.cursor !== "string") return null;
  if (value.search !== undefined && typeof value.search !== "string") return null;
  return {
    page: readPositiveInteger(value.page),
    pageSize: readPositiveInteger(value.pageSize),
    cursor: typeof value.cursor === "string" || value.cursor === null ? value.cursor : undefined,
    search: typeof value.search === "string" ? value.search : undefined,
    sorts,
    filters,
    expandedRowIdentities,
  };
}

export function readPhiTableFilters(value: unknown): PhiTableQuery["filters"] | null {
  if (!isRecord(value)) return null;
  return readPhiTableQuery({ filters: value })?.filters ?? null;
}

export function readPhiTableBindingParamsSignalValue(value: unknown): PhiTableBindingParamsSignalValue | null {
  if (!isRecord(value) || !isRecord(value.params) ||
    Object.values(value.params).some((paramValue) => !isPhiTableQueryValue(paramValue))) {
    return null;
  }
  return { params: value.params as Record<string, PhiTableQueryValue> };
}

export function readPhiTableSelectionSignalValue(value: unknown): PhiTableSelectionSignalValue | null {
  const selectedRowIdentities = isRecord(value)
    ? readRowIdentities(value.selectedRowIdentities)
    : undefined;
  return selectedRowIdentities ? { selectedRowIdentities } : null;
}

export function readPhiTableColumnOrderSignalValue(value: unknown): PhiTableColumnOrderSignalValue | null {
  if (!isRecord(value) || !Array.isArray(value.columnOrder) ||
    !value.columnOrder.every((entry) => typeof entry === "string" && entry.trim().length > 0)) {
    return null;
  }
  const columnOrder = value.columnOrder as string[];
  return new Set(columnOrder).size === columnOrder.length ? { columnOrder } : null;
}

export function readPhiTableExpansionSignalValue(value: unknown): PhiTableExpansionSignalValue | null {
  const expandedRowIdentities = isRecord(value)
    ? readRowIdentities(value.expandedRowIdentities)
    : undefined;
  return expandedRowIdentities ? { expandedRowIdentities } : null;
}

export function readPhiTableActionSignalValue(value: unknown): PhiTableActionSignalValue | null {
  if (!isRecord(value) || typeof value.actionKey !== "string" || !value.actionKey.trim()) {
    return null;
  }
  const selectedRowIdentities = readRowIdentities(value.selectedRowIdentities);
  if (!selectedRowIdentities) return null;
  const rowIdentity = value.rowIdentity;
  if (rowIdentity !== undefined && rowIdentity !== null &&
    typeof rowIdentity !== "string" &&
    (typeof rowIdentity !== "number" || !Number.isFinite(rowIdentity))) {
    return null;
  }
  if (value.actionValue !== undefined && !isPhiTableQueryValue(value.actionValue)) {
    return null;
  }
  return {
    actionKey: value.actionKey.trim(),
    rowIdentity: rowIdentity as PhiTableRowIdentity | null | undefined,
    selectedRowIdentities,
    actionValue: value.actionValue as PhiTableQueryValue,
  };
}

export function readPhiTableProviderQueryResult(value: unknown): PhiTableProviderQueryResult | null {
  if (!isRecord(value) || !Array.isArray(value.rows) || !value.rows.every(isRecord)) return null;
  if ("loading" in value || "error" in value || "meta" in value || "resourceKey" in value || "tableKey" in value) {
    return null;
  }
  const total = value.total;
  const page = value.page;
  const pageSize = value.pageSize;
  const resolvedQuery = value.resolvedQuery === undefined
    ? undefined
    : readPhiTableQuery(value.resolvedQuery);
  const summary = value.summary === undefined
    ? undefined
    : readPhiTableSummaryValues(value.summary);
  if ((total !== undefined && (typeof total !== "number" || !Number.isFinite(total) || total < 0)) ||
    (page !== undefined && readPositiveInteger(page) === undefined) ||
    (pageSize !== undefined && readPositiveInteger(pageSize) === undefined) ||
    (value.nextCursor !== undefined && value.nextCursor !== null && typeof value.nextCursor !== "string") ||
    (value.facets !== undefined && !isRecord(value.facets)) ||
    summary === null ||
    (value.resolvedQuery !== undefined && resolvedQuery === null)) {
    return null;
  }
  return {
    rows: value.rows as Record<string, unknown>[],
    total: total as number | undefined,
    page: page as number | undefined,
    pageSize: pageSize as number | undefined,
    nextCursor: value.nextCursor as string | null | undefined,
    facets: value.facets as Record<string, unknown> | undefined,
    summary,
    resolvedQuery: resolvedQuery ?? undefined,
  };
}

function readPhiTableSummaryValues(value: unknown) {
  return isRecord(value) && Object.values(value).every((entry) =>
    entry === null || typeof entry === "string" || typeof entry === "boolean" ||
    typeof entry === "number" && Number.isFinite(entry))
    ? value as Record<string, PhiTableSummaryValue>
    : null;
}

export function readPhiTableProviderMutationResult(value: unknown): PhiTableProviderMutationResult | null {
  const allowedKeys = new Set([
    "status", "invalidation", "canonicalValue", "rowPatch", "summaryPatch", "value", "errorCode", "message",
  ]);
  const summaryPatch = value && isRecord(value) && value.summaryPatch !== undefined
    ? readPhiTableSummaryValues(value.summaryPatch)
    : undefined;
  if (!isRecord(value) ||
    Object.keys(value).some((key) => !allowedKeys.has(key)) ||
    (value.status !== "accepted" && value.status !== "rejected") ||
    (value.invalidation !== "none" && value.invalidation !== "view" && value.invalidation !== "resource") ||
    (value.rowPatch !== undefined && !isRecord(value.rowPatch)) ||
    summaryPatch === null ||
    (value.value !== undefined && value.value !== null && !isRecord(value.value)) ||
    (value.errorCode !== undefined && typeof value.errorCode !== "string") ||
    (value.message !== undefined && typeof value.message !== "string") ||
    (value.status === "rejected" && (
      typeof value.errorCode !== "string" || !value.errorCode.trim() ||
      value.canonicalValue !== undefined || value.rowPatch !== undefined || value.summaryPatch !== undefined || value.value !== undefined
    )) ||
    (value.status === "accepted" && value.errorCode !== undefined)) {
    return null;
  }
  return {
    status: value.status,
    invalidation: value.invalidation,
    canonicalValue: value.canonicalValue,
    rowPatch: value.rowPatch as Record<string, unknown> | undefined,
    summaryPatch: summaryPatch ?? undefined,
    value: value.value as Record<string, unknown> | null | undefined,
    errorCode: value.errorCode as string | undefined,
    message: value.message as string | undefined,
  };
}

export function validatePhiTableProviderFieldValue(
  field: PhiTableProviderFieldDefinition,
  value: unknown,
): string | null {
  if (value == null) return field.required ? `Table field "${field.key}" is required.` : null;
  if (field.type === "string" || field.type === "color" || field.type === "icon") {
    return typeof value === "string" ? null : `Table field "${field.key}" requires a string value.`;
  }
  if (field.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) return `Table field "${field.key}" requires a finite number.`;
    if (typeof field.constraints?.min === "number" && value < field.constraints.min) {
      return `Table field "${field.key}" is below its minimum.`;
    }
    if (typeof field.constraints?.max === "number" && value > field.constraints.max) {
      return `Table field "${field.key}" is above its maximum.`;
    }
    if (field.constraints?.precision !== undefined) {
      const decimals = String(value).split(".")[1]?.length ?? 0;
      if (decimals > field.constraints.precision) return `Table field "${field.key}" exceeds its precision.`;
    }
    return null;
  }
  if (field.type === "boolean") {
    return typeof value === "boolean" ? null : `Table field "${field.key}" requires a boolean value.`;
  }
  if (field.type === "date") {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return `Table field "${field.key}" requires a YYYY-MM-DD value.`;
    }
    if (typeof field.constraints?.min === "string" && value < field.constraints.min) {
      return `Table field "${field.key}" is before its minimum date.`;
    }
    if (typeof field.constraints?.max === "string" && value > field.constraints.max) {
      return `Table field "${field.key}" is after its maximum date.`;
    }
    return null;
  }
  if (field.type === "datetime") {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
      !Number.isFinite(Date.parse(value))) {
      return `Table field "${field.key}" requires an ISO timestamp with an explicit offset.`;
    }
    if (typeof field.constraints?.min === "string" && Date.parse(value) < Date.parse(field.constraints.min)) {
      return `Table field "${field.key}" is before its minimum timestamp.`;
    }
    if (typeof field.constraints?.max === "string" && Date.parse(value) > Date.parse(field.constraints.max)) {
      return `Table field "${field.key}" is after its maximum timestamp.`;
    }
    return null;
  }
  if (field.type === "enum" || field.type === "enum[]") {
    const values = field.type === "enum[]" ? value : [value];
    if (!Array.isArray(values) || values.some((entry) => typeof entry !== "string" && typeof entry !== "number")) {
      return `Table field "${field.key}" has an invalid option value.`;
    }
    if (field.type === "enum[]" && new Set(values.map((entry) => `${typeof entry}:${String(entry)}`)).size !== values.length) {
      return `Table field "${field.key}" contains duplicate option values.`;
    }
    if (field.options) {
      const allowed = new Set(field.options.map((option) => `${typeof option.value}:${String(option.value)}`));
      if (values.some((entry) => !allowed.has(`${typeof entry}:${String(entry)}`))) {
        return `Table field "${field.key}" contains an undeclared option value.`;
      }
    }
    return null;
  }
  try {
    return JSON.stringify(value) === undefined
      ? `Table field "${field.key}" requires a serializable JSON value.`
      : null;
  } catch {
    return `Table field "${field.key}" requires a serializable JSON value.`;
  }
}

export function validatePhiTableWidgetBinding(
  config: PhiTableWidgetConfig,
  resource: PhiTableProviderResourceDescriptor,
) {
  const errors: string[] = [];
  const fields = new Set(resource.fields.map((field) => field.key));
  const fieldsByKey = new Map(resource.fields.map((field) => [field.key, field]));
  const columns = config.presentation.columns;
  const columnKeys = new Set<string>();
  for (const column of columns) {
    if (!column.key.trim() || columnKeys.has(column.key)) {
      errors.push("Table columns require unique non-empty keys.");
      break;
    }
    columnKeys.add(column.key);
    if (!column.fieldKey.trim() || !fields.has(column.fieldKey)) {
      errors.push(`Table column "${column.key}" references undeclared field "${column.fieldKey}".`);
    }
    if (column.sortable && !fields.has(column.sortField ?? column.fieldKey)) {
      errors.push(`Table column "${column.key}" references an undeclared sort field.`);
    }
    const field = fieldsByKey.get(column.fieldKey);
    if (column.editor && !field?.mutable) {
      errors.push(`Table column "${column.key}" cannot edit read-only field "${column.fieldKey}".`);
    }
    if (column.iconFieldKey !== undefined) {
      const iconField = fieldsByKey.get(column.iconFieldKey);
      if (!iconField) {
        errors.push(`Table column "${column.key}" references undeclared icon field "${column.iconFieldKey}".`);
      } else if (iconField.type !== "icon") {
        errors.push(`Table column "${column.key}" icon field "${column.iconFieldKey}" must be an icon field.`);
      }
    }
    if (column.editor && field?.type === "json") {
      errors.push(`Table column "${column.key}" cannot use an implicit JSON editor.`);
    }
    const editorControlCompatible = !column.editor?.control ||
      (field?.type === "boolean" && (column.editor.control === "switch" || column.editor.control === "checkbox")) ||
      (field?.type === "icon" && column.editor.control === "icon-picker") ||
      (field?.type === "enum" && (column.editor.control === "select" || column.editor.control === "radio" ||
        column.editor.control === "segmented")) ||
      (field?.type === "enum[]" && (column.editor.control === "multi-select" ||
        column.editor.control === "checkbox-group"));
    if (column.editor && !editorControlCompatible) {
      errors.push(`Table column "${column.key}" editor is incompatible with field "${column.fieldKey}".`);
    }
    const rendererCompatible = !column.renderer || column.renderer === "text" ||
      (column.renderer === "switch" && field?.type === "boolean") ||
      (column.renderer === "checkbox" && field?.type === "boolean") ||
      (column.renderer === "icon" && field?.type === "icon") ||
      ((column.renderer === "date" || column.renderer === "datetime") && field?.type === column.renderer) ||
      (column.renderer === "json" && field?.type === "json") ||
      (column.renderer === "tags" && (field?.type === "json" || field?.type === "enum[]")) ||
      ((column.renderer === "email" || column.renderer === "link" || column.renderer === "code" ||
        column.renderer === "badge") && (field?.type === "string" || field?.type === "enum"));
    if (!rendererCompatible) {
      errors.push(`Table column "${column.key}" renderer is incompatible with field "${column.fieldKey}".`);
    }
    if (config.presentation.layout.mode === "fixed" && column.sizing?.mode === "content") {
      errors.push(`Table column "${column.key}" cannot use content sizing with fixed Table layout.`);
    }
    if (!column.hidden && column.sticky && config.presentation.layout.overflowX !== "auto") {
      errors.push(`Sticky Table column "${column.key}" requires automatic horizontal overflow.`);
    }
  }
  const summaryFields = new Set(resource.summaryFields?.map((field) => field.key) ?? []);
  const validateSummaryItem = (item: PhiTableSummaryItemDefinition, owner: string) => {
    if (!item.key.trim()) errors.push(`${owner} requires a non-empty item key.`);
    if (item.value.source === "provider" && !summaryFields.has(item.value.fieldKey)) {
      errors.push(`${owner} references undeclared Provider summary field "${item.value.fieldKey}".`);
    }
  };
  const footerValueKeys = new Set<string>();
  const footer = config.presentation.footer;
  for (const binding of footer?.values ?? []) {
    if (footerValueKeys.has(binding.key)) errors.push("Table footer value keys must be unique.");
    footerValueKeys.add(binding.key);
    validateSummaryItem({ key: binding.key, value: binding.value }, `Table footer value "${binding.key}"`);
  }
  if (footer) {
    const placeholderIndexes = new Set(
      [...footer.template.matchAll(/%([1-9]\d*)/g)].map((match) => Number(match[1])),
    );
    if (!footer.template.trim() || footer.values.length === 0 ||
      footer.values.some((_value, index) => !placeholderIndexes.has(index + 1)) ||
      [...placeholderIndexes].some((index) => index > footer.values.length)) {
      errors.push("Table footer template placeholders must match its ordered values.");
    }
  }
  const summaryRowKeys = new Set<string>();
  for (const row of config.presentation.summary?.rows ?? []) {
    if (!row.key.trim() || summaryRowKeys.has(row.key)) {
      errors.push("Table summary rows require unique non-empty keys.");
    }
    summaryRowKeys.add(row.key);
    const cellKeys = new Set<string>();
    const occupiedColumns = new Set<string>();
    for (const cell of row.cells) {
      if (!cell.key.trim() || cellKeys.has(cell.key)) {
        errors.push(`Table summary row "${row.key}" requires unique non-empty cell keys.`);
      }
      cellKeys.add(cell.key);
      if (!columnKeys.has(cell.columnKey) || cell.throughColumnKey && !columnKeys.has(cell.throughColumnKey)) {
        errors.push(`Table summary cell "${cell.key}" references an undeclared column.`);
      } else {
        const start = columns.findIndex((column) => column.key === cell.columnKey);
        const end = cell.throughColumnKey
          ? columns.findIndex((column) => column.key === cell.throughColumnKey)
          : start;
        if (end < start) {
          errors.push(`Table summary cell "${cell.key}" has a backwards column span.`);
        } else {
          for (const column of columns.slice(start, end + 1)) {
            if (occupiedColumns.has(column.key)) {
              errors.push(`Table summary row "${row.key}" contains overlapping cells.`);
              break;
            }
            occupiedColumns.add(column.key);
          }
        }
      }
      validateSummaryItem(cell.item, `Table summary cell "${cell.key}"`);
    }
  }
  if (config.presentation.layout.mode === "fixed" &&
    columns.every((column) => column.hidden || (column.sizing?.mode ?? "content") !== "fill")) {
    errors.push("Fixed Table layout requires at least one visible fill column.");
  }
  if (config.presentation.layout.mode !== "fixed" && columns.some((column) => column.ellipsis)) {
    errors.push("Ellipsis requires fixed Table layout.");
  }
  const sortingMode = config.features.sorting?.mode ?? "none";
  const providerSorting = resource.query.sorting ?? "none";
  if (sortingMode !== "none" && providerSorting === "none") {
    errors.push(`Table resource "${resource.resourceKey}" does not support sorting.`);
  } else if (sortingMode === "multiple" && providerSorting !== "multiple") {
    errors.push(`Table resource "${resource.resourceKey}" does not support multiple sorting.`);
  }
  if (config.features.search?.enabled && resource.query.search !== true) {
    errors.push(`Table resource "${resource.resourceKey}" does not support search.`);
  }
  if (config.features.pagination?.enabled !== false && resource.query.pagination === "none") {
    errors.push(`Table resource "${resource.resourceKey}" does not support pagination.`);
  }
  for (const sort of config.features.sorting?.defaultSorts ?? []) {
    if (!fields.has(sort.key)) errors.push(`Table default sort "${sort.key}" is not declared by the resource.`);
  }
  const filterFields = new Set(resource.query.filterFields ?? []);
  for (const filter of config.features.filters ?? []) {
    const keys = filter.type === "dateRange" ? [filter.startKey, filter.endKey] : [filter.key];
    for (const key of keys) {
      if (!filterFields.has(key)) errors.push(`Table filter "${key}" is not declared by the resource.`);
    }
  }
  const structure = config.features.structure;
  if (structure?.mode === "tree" &&
    resource.hierarchy?.parentRowIdentityPath !== structure.parentRowIdentityPath) {
    errors.push(`Table resource "${resource.resourceKey}" does not declare the selected hierarchy.`);
  }
  if (structure?.mode === "tree" && !columns.some((column) =>
    column.key === structure.expandColumnKey && !column.hidden)) {
    errors.push(`Table tree expand column "${structure.expandColumnKey}" is not a visible configured column.`);
  }
  if (resource.hierarchy?.canAcceptChildrenField) {
    const acceptanceField = fieldsByKey.get(resource.hierarchy.canAcceptChildrenField);
    if (acceptanceField?.type !== "boolean") {
      errors.push(`Table resource "${resource.resourceKey}" child-acceptance field must be a declared boolean field.`);
    }
  }
  if (config.features.editing?.mode === "none" && columns.some((column) => column.editor)) {
    errors.push("Editable Table columns require cell editing mode.");
  }
  if (config.features.rowReordering?.enabled) {
    const requiredOrdering = structure?.mode === "tree" ? "tree" : "flat";
    if (resource.rowOrdering !== requiredOrdering) {
      errors.push(`Table resource "${resource.resourceKey}" does not support ${requiredOrdering} row ordering.`);
    }
  }
  const providerActions = new Map(resource.actions?.map((action) => [action.key, action]) ?? []);
  const bindingFields = new Map(resource.bindingFields?.map((field) => [field.key, field]) ?? []);
  const configuredBindingKeys = new Set<string>();
  for (const bindingTool of config.features.tools?.bindingFields ?? []) {
    if (configuredBindingKeys.has(bindingTool.key)) {
      errors.push(`Table binding field "${bindingTool.key}" is configured more than once.`);
      continue;
    }
    configuredBindingKeys.add(bindingTool.key);
    const bindingField = bindingFields.get(bindingTool.key);
    if (!bindingField) {
      errors.push(`Table binding field "${bindingTool.key}" is not declared by resource "${resource.resourceKey}".`);
      continue;
    }
    if (bindingField.create) {
      const action = providerActions.get(bindingField.create.actionKey);
      if (!action || action.scope !== "resource" || action.valueType !== "string") {
        errors.push(`Table binding field "${bindingTool.key}" create action must be a declared string-valued resource action.`);
      }
      if (!bindingTool.create) errors.push(`Table binding field "${bindingTool.key}" needs Widget create-tool presentation.`);
      else if (!bindingTool.create.display) {
        errors.push(`Table binding field "${bindingTool.key}" create tool requires explicit display presentation.`);
      }
    } else if (bindingTool.create) {
      errors.push(`Table binding field "${bindingTool.key}" configures create presentation without a Provider create capability.`);
    }
    if (bindingTool.create && (bindingTool.create.display === "icon" || bindingTool.create.display === "icon-label") &&
      !bindingTool.create.icon?.trim()) {
      errors.push(`Table binding field "${bindingTool.key}" create tool needs an icon for display "${bindingTool.create.display}".`);
    }
  }
  for (const [scope, actions] of [
    ["resource", config.features.actions?.toolbar ?? []],
    ["row", config.features.actions?.row ?? []],
    ["selection", config.features.actions?.bulk ?? []],
  ] as const) {
    for (const action of actions) {
      if (!action.display) {
        errors.push(`Table action "${action.key}" requires explicit display presentation.`);
      }
      if ((action.display === "icon" || action.display === "icon-label") && !action.icon?.trim()) {
        errors.push(`Table action "${action.key}" needs an icon for display "${action.display}".`);
      }
      if (action.execution !== "provider") continue;
      const capability = providerActions.get(action.key);
      if (!capability) {
        errors.push(`Table action "${action.key}" is not declared by resource "${resource.resourceKey}".`);
      } else if (capability.scope !== scope) {
        errors.push(`Table action "${action.key}" cannot be placed in the ${scope} action scope.`);
      } else {
        if (capability.confirmation === "required" && !action.confirm?.title.trim()) {
          errors.push(`Table action "${action.key}" requires Widget confirmation presentation.`);
        }
        if (capability.intent === "destructive" && action.mode !== "danger") {
          errors.push(`Destructive Table action "${action.key}" requires danger presentation.`);
        }
      }
    }
  }
  return errors;
}

export function readPhiTableProviderError(error: unknown) {
  return error instanceof PhiTableProviderError
    ? error
    : new PhiTableProviderError(
        "provider-failed",
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? { cause: error } : undefined,
      );
}
