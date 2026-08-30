"use client";

import { ReloadOutlined, UndoOutlined } from "@ant-design/icons";
import type { PhiTableWidgetLabels } from "../../../../../components/widgets/label-types/table";
import { PHI_TABLE_WIDGET_DEFAULT_LABELS } from "../../../../../components/widgets/label-types/table";
import { formatPhiTableWidgetLabel } from "../../../../../components/widgets/label-types/table";
import { App, Button, Flex, Space, Tag, Tooltip, Typography } from "antd";
import { useCallback, useEffect, useEffectEvent, useMemo, useState, type ReactNode } from "react";

import { PhiMultiSelectControl } from "../../../../../components/controls/phi-multi-select-control";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiCheckboxControl } from "../../../../../components/controls/phi-checkbox-control";
import { PhiCascaderControl } from "../../../../../components/controls/phi-cascader-control";
import { PhiCollectionHeaderControl } from "../../../../../components/controls/phi-collection-header-control";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiPopoverControl } from "../../../../../components/controls/phi-popover-control";
import { PhiToolbarControl } from "../../../../../components/controls/phi-toolbar-control";
import { PhiConfirmControl } from "../../../../../components/controls/phi-confirm-control";
import { usePhiControlOptionsProvider } from "../../../../../components/controls/phi-options-provider";
import { PhiSelectControl } from "../../../../../components/controls/phi-select-control";
import { PhiSwitchControl } from "../../../../../components/controls/phi-switch-control";
import {
  readPhiTableControlValue,
  type PhiTableControlColumn,
} from "../../../../../components/controls/phi-table-control";
import { PhiTextControl } from "../../../../../components/controls/phi-text-control";
import { PhiLink } from "../../../../../components/navigation/phi-link";
import { PhiIcon } from "../../../../../components/shell/phi-icon";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { usePhiSignalListener } from "../../../../../components/runtime/runtime-signal-bus";
import { usePhiSignalInstancesReady } from "../../../../../components/runtime/runtime-signal-registry";
import { usePhiSignalEmitter, usePhiSignalIdentity } from "../../../../../components/runtime/runtime-signal-identity";
import { usePhiTableBinding } from "../../../../../components/tables/client/phi-table-binding";
import { PhiTableBindingControl } from "../../../../../components/tables/client/phi-table-binding-control";
import { clearPhiDataDragPayload, readPhiDataDragPayload } from "../../../../../components/runtime/client/phi-data-dnd";
import { formatPhiDate, formatPhiDateTime } from "../../../../../helpers/format-date-time";
import { formatPhiTranslation } from "../../../../../helpers/translation-format";
import {
  readPhiTableColumnOrderSignalValue,
  readPhiTableBindingParamsSignalValue,
  readPhiTableExpansionSignalValue,
  readPhiTableFilters,
  readPhiTableQuery,
  readPhiTableActionSignalValue,
  validatePhiTableWidgetBinding,
  type PhiTableActionDefinition,
  type PhiTableBindingToolDefinition,
  type PhiTableColumnDefinition,
  type PhiTableFilterDefinition,
  type PhiTableProviderMutationResult,
  type PhiTableProviderActionCapability,
  type PhiTableProviderBindingFieldDefinition,
  type PhiTableProviderFieldDefinition,
  type PhiTableProviderQueryResult,
  type PhiTableQuery,
  type PhiTableRowIdentity,
  type PhiTableSummaryItemDefinition,
  type PhiTableSummaryValue,
  type PhiTableTagColor,
  type PhiTableWidgetConfig,
  type PhiTableWidgetState,
} from "../../../../../types/table-widget";
import {
  collectPhiRuntimeValueConditions,
  combinePhiRuntimeConditionExpressions,
  evaluatePhiRuntimeConditionExpression,
  readPhiRuntimeConditionStateSignalValue,
  type PhiRuntimeConditionExpression,
} from "../../../../../types/runtime-condition";
import {
  findPhiSignalRoutesByCapabilityId,
  isPhiControllerSignalAddress,
  type PhiSignal,
  type PhiSignalRoute,
  type PhiSignalValue,
} from "../../../../../types/signals";
import { resolvePhiButtonIcon } from "../../../../../components/widgets/client/shared/phi-button-icons";

type TableRow = Record<string, unknown>;
type DateRangeValue = { start?: string; end?: string };
type TableFilterValue = string | boolean | readonly string[] | DateRangeValue | undefined;
type ResolvedTableAction = PhiTableActionDefinition;
const PHI_TABLE_ACTION_BUTTON_STYLE = { whiteSpace: "nowrap" } as const;

export type PhiTableWidgetClientProps = {
  config: PhiTableWidgetConfig;
  externalSearch?: string;
  externalQuery?: PhiTableQuery;
  refreshKey?: string | number;
  onData?: (data: PhiTableProviderQueryResult) => void;
  onMutation?: (result: PhiTableProviderMutationResult) => void;
  onStateChange?: (state: PhiTableWidgetState) => void;
  labels?: PhiTableWidgetLabels;
  onAction?: (event: {
    action: PhiTableActionDefinition;
    row?: TableRow;
    actionValue?: string | number | boolean | readonly string[] | readonly number[] | null;
    selectedRowIdentities?: readonly PhiTableRowIdentity[];
  }) => boolean | void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeTextValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(normalizeTextValue).filter(Boolean).join(", ");
  return isRecord(value) ? JSON.stringify(value) : "";
}

function formatTableActionTemplate(
  value: string | undefined,
  templateValue: PhiTableRowIdentity | null | undefined,
) {
  return value && templateValue != null ? formatPhiTableWidgetLabel(value, templateValue) : value;
}

function resolveTableTagColor(color: PhiTableTagColor | undefined) {
  return typeof color === "object" ? color.value : color;
}

function renderTableValue(value: unknown, column: PhiTableColumnDefinition): ReactNode {
  if (value == null || value === "") return null;
  const normalizedValue = normalizeTextValue(value);
  const displayValue = column.valueMap?.[normalizedValue] ?? normalizedValue;
  if (column.renderer === "email" || column.renderer === "link") {
    const href = String(value);
    return <PhiLink href={column.renderer === "email" ? `mailto:${href}` : href}>{displayValue}</PhiLink>;
  }
  if (column.renderer === "tags") {
    const values = Array.isArray(value) ? value : [value];
    return (
      <Space size={[4, 4]} wrap>
        {values.map((entry, index) => {
          const normalizedEntry = normalizeTextValue(entry);
          return (
            <Tag
              color={resolveTableTagColor(column.tagColorMap?.[normalizedEntry])}
              key={`${normalizedEntry}:${index}`}
              variant={column.tagVariant ?? "outlined"}
            >
              {column.valueMap?.[normalizedEntry] ?? normalizedEntry}
            </Tag>
          );
        })}
      </Space>
    );
  }
  if (column.renderer === "date" || column.renderer === "datetime") {
    return column.renderer === "date" ? formatPhiDate(normalizedValue) : formatPhiDateTime(normalizedValue);
  }
  if (column.renderer === "json" || column.renderer === "code") return <Typography.Text code>{displayValue}</Typography.Text>;
  if (column.renderer === "badge") {
    return (
      <Tag color={resolveTableTagColor(column.tagColorMap?.[normalizedValue])} variant={column.tagVariant ?? "outlined"}>
        {displayValue}
      </Tag>
    );
  }
  if (column.renderer === "switch") return <PhiSwitchControl checked={value === true} readOnly />;
  if (column.renderer === "checkbox") return <PhiCheckboxControl checked={value === true} readOnly />;
  if (column.renderer === "icon") return typeof value === "string" && value.trim() ? <PhiIcon name={value} /> : null;
  return displayValue;
}

function renderTableSummaryItem(item: PhiTableSummaryItemDefinition, value: PhiTableSummaryValue | undefined) {
  const renderedValue = value == null ? "—" : String(value);
  if (!item.label) return renderedValue;
  return item.labelPlacement === "after"
    ? <>{renderedValue} {item.label}</>
    : <>{item.label} {renderedValue}</>;
}

function buildDefaultFilterState(filters: readonly PhiTableFilterDefinition[] | undefined) {
  return Object.fromEntries((filters ?? []).flatMap((filter) =>
    filter.defaultValue === undefined ? [] : [[filter.key, filter.defaultValue]],
  )) as Record<string, TableFilterValue>;
}

function buildQueryFilters(
  filters: readonly PhiTableFilterDefinition[] | undefined,
  values: Record<string, TableFilterValue>,
) {
  const result: Record<string, import("../../../../../types/table-widget").PhiTableQueryValue> = {};
  for (const filter of filters ?? []) {
    const value = values[filter.key];
    if (filter.type === "dateRange") {
      const range = isRecord(value) ? value : null;
      const start = typeof range?.start === "string" ? range.start : "";
      const end = typeof range?.end === "string" ? range.end : "";
      if (start) result[filter.startKey] = start;
      if (end) result[filter.endKey] = end;
    } else if (
      (typeof value === "string" && value !== "") ||
      typeof value === "boolean" ||
      (Array.isArray(value) && value.length > 0)
    ) {
      result[filter.key] = Array.isArray(value) ? [...value] : value;
    }
  }
  return result;
}

function readTableFilterValue(
  filter: PhiTableFilterDefinition,
  filters: PhiTableQuery["filters"],
): TableFilterValue {
  if (filter.type === "dateRange") {
    const start = filters?.[filter.startKey];
    const end = filters?.[filter.endKey];
    return {
      start: typeof start === "string" ? start : "",
      end: typeof end === "string" ? end : "",
    };
  }
  const value = filters?.[filter.key];
  if (filter.type === "boolean") return typeof value === "boolean" ? value : undefined;
  if (filter.type === "select" && filter.multiple) {
    return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
  }
  return typeof value === "string" ? value : undefined;
}

function updateTableQueryFilters(
  current: PhiTableQuery["filters"],
  filter: PhiTableFilterDefinition,
  value: TableFilterValue,
) {
  const next = { ...(current ?? {}) };
  if (filter.type === "dateRange") {
    const range = isRecord(value) ? value : {};
    const start = typeof range.start === "string" ? range.start : "";
    const end = typeof range.end === "string" ? range.end : "";
    if (start) next[filter.startKey] = start;
    else delete next[filter.startKey];
    if (end) next[filter.endKey] = end;
    else delete next[filter.endKey];
    return next;
  }
  if (
    (typeof value === "string" && value !== "") ||
    typeof value === "boolean" ||
    (Array.isArray(value) && value.length > 0)
  ) {
    next[filter.key] = Array.isArray(value) ? [...value] : value;
  } else {
    delete next[filter.key];
  }
  return next;
}

function readRowIdentity(row: TableRow, path: string): PhiTableRowIdentity | null {
  const value = readPhiTableControlValue(row, path);
  return typeof value === "string" || (typeof value === "number" && Number.isFinite(value)) ? value : null;
}

function findMatchingCondition(
  row: TableRow | null,
  expression: PhiRuntimeConditionExpression | undefined,
  controllers: Readonly<Record<string, Record<string, unknown>>>,
) {
  if (!expression) return null;
  const result = evaluatePhiRuntimeConditionExpression(expression, { row, controllers });
  if (result === "not-matched") return null;
  return collectPhiRuntimeValueConditions(expression).find((condition) =>
    condition.reason && evaluatePhiRuntimeConditionExpression(condition, { row, controllers }) === "matched") ?? expression;
}

function matchesAllConditions(
  row: TableRow | null,
  expression: PhiRuntimeConditionExpression | undefined,
  controllers: Readonly<Record<string, Record<string, unknown>>>,
) {
  return !expression || evaluatePhiRuntimeConditionExpression(expression, { row, controllers }) === "matched";
}

function matchesListenRoute(route: PhiSignalRoute, signal: PhiSignal) {
  return route.receiver !== null && route.channel === signal.channel && route.action === signal.action &&
    route.valueType === signal.valueType &&
    (route.valueType !== "json" || route.valueSchema === signal.valueSchema);
}

function resolveTableActions(
  definitions: readonly PhiTableActionDefinition[] | undefined,
  capabilities: readonly PhiTableProviderActionCapability[] | undefined,
): ResolvedTableAction[] {
  const byKey = new Map(capabilities?.map((capability) => [capability.key, capability]) ?? []);
  const result: ResolvedTableAction[] = [];
  for (const definition of definitions ?? []) {
    if (definition.execution !== "provider") { result.push(definition); continue; }
    const capability = byKey.get(definition.key);
    if (!capability) continue;
    result.push({
      ...definition,
      visibleWhen: combinePhiRuntimeConditionExpressions("all", [capability.visibleWhen, definition.visibleWhen]),
      disabledWhen: combinePhiRuntimeConditionExpressions("any", [capability.disabledWhen, definition.disabledWhen]),
    });
  }
  return result;
}

export function PhiTableWidgetClient({
  config: inputConfig,
  externalSearch,
  externalQuery,
  refreshKey,
  onData,
  onMutation,
  onStateChange,
  labels = PHI_TABLE_WIDGET_DEFAULT_LABELS,
  onAction,
}: PhiTableWidgetClientProps) {
  const { modal } = App.useApp();
  const { token } = usePhiConfig();
  const configKey = JSON.stringify(inputConfig);
  const config = useMemo(() => JSON.parse(configKey) as PhiTableWidgetConfig, [configKey]);
  const { presentation, features, source } = config;
  const [bindingParams, setBindingParams] = useState<Record<string, unknown>>(
    () => isRecord(source?.params) ? source.params : {},
  );
  const resolvedSource = useMemo(() => source ? { ...source, params: bindingParams } : null, [bindingParams, source]);
  const resolvedControlSize = presentation.controlSize ??
    (features.tools?.mode !== "external" ? "small" : undefined);
  const initialQuery = config.initialQuery ?? {};
  const defaultSorts = initialQuery.sorts ?? features.sorting?.defaultSorts ?? [];
  const initialFilters = {
    ...buildQueryFilters(features.filters, buildDefaultFilterState(features.filters)),
    ...(initialQuery.filters ?? {}),
  };
  const [searchDraft, setSearchDraft] = useState(initialQuery.search ?? "");
  const [conditionControllerStates, setConditionControllerStates] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [columnOrder, setColumnOrder] = useState<readonly string[]>(() =>
    presentation.columns.filter((column) => !column.hidden).map((column) => column.key));
  const signalIdentity = usePhiSignalIdentity();
  const emitSignal = usePhiSignalEmitter(signalIdentity.sender);
  const emitRoutes = useMemo(() => config.signalRoutes?.emits ?? [], [config.signalRoutes?.emits]);
  const listenRoutes = useMemo(() => config.signalRoutes?.listens ?? [], [config.signalRoutes?.listens]);
  const emitCapability = useCallback((capabilityId: string, value: PhiSignalValue) => {
    for (const route of findPhiSignalRoutesByCapabilityId(emitRoutes, capabilityId)) {
      if (route.receiver == null || (route.valueType === "json" && !route.valueSchema)) continue;
      emitSignal({
        scope: route.scope,
        channel: route.channel,
        action: route.action,
        value: route.valueType === "none" ? null : value,
        valueType: route.valueType,
        valueSchema: route.valueSchema ?? null,
        receiver: route.receiver,
      });
    }
  }, [emitRoutes, emitSignal]);
  const validateResource = useCallback((candidate: import("../../../../../types/table-widget").PhiTableProviderResourceDescriptor) => {
    const contractError = validatePhiTableWidgetBinding(config, candidate)[0];
    if (contractError) return contractError;
    const iconAction = [
      ...(config.features.actions?.toolbar ?? []),
      ...(config.features.actions?.row ?? []),
      ...(config.features.actions?.bulk ?? []),
    ].find((action) => action.display !== "label" && action.icon && !resolvePhiButtonIcon(action.icon));
    if (iconAction) return `Table action "${iconAction.key}" references an unavailable icon.`;
    const iconBindingTool = config.features.tools?.bindingFields?.find((tool) =>
      tool.create?.display !== "label" && tool.create?.icon && !resolvePhiButtonIcon(tool.create.icon));
    return iconBindingTool
      ? `Table binding field "${iconBindingTool.key}" create tool references an unavailable icon.`
      : null;
  }, [config]);
  const binding = usePhiTableBinding({
    source: resolvedSource,
    initialQuery: { ...initialQuery, sorts: defaultSorts, filters: initialFilters },
    externalQuery,
    externalSearch,
    defaultPageSize: features.pagination?.pageSize ?? 20,
    refreshKey,
    preserveSelectedRowIdentities: features.rowSelection?.preserveSelectedRowIdentities,
    initialExpandedRowIdentities: features.structure?.mode === "tree"
      ? features.structure.defaultExpandedRowIdentities ?? initialQuery.expandedRowIdentities ?? []
      : [],
    onData,
    onMutation: (result) => {
      onMutation?.(result);
      emitCapability("mutationChange", result as unknown as Record<string, unknown>);
    },
    validateResource,
  });
  const {
    resource,
    bindingError,
    contractError,
    rows,
    total,
    summary,
    loading,
    error,
    query,
    resolvedQuery,
    setQuery,
    selectedRowIdentities,
    setSelectedRowIdentities,
    expandedRowIdentities,
    setExpandedRowIdentities,
    reload,
    executeAction,
    commitField,
    commitRow,
    isFieldMutationPending,
    moveRow,
    drop,
  } = binding;
  const toolbarActions = useMemo(() => resolveTableActions(features.actions?.toolbar, resource?.actions), [features.actions?.toolbar, resource?.actions]);
  const rowActions = useMemo(() => resolveTableActions(features.actions?.row, resource?.actions), [features.actions?.row, resource?.actions]);
  const bulkActions = useMemo(() => resolveTableActions(features.actions?.bulk, resource?.actions), [features.actions?.bulk, resource?.actions]);
  const configuredBindingFields = useMemo(() => (features.tools?.bindingFields ?? []).flatMap((tool) => {
    const field = resource?.bindingFields?.find((candidate) => candidate.key === tool.key);
    return field ? [{ field, tool }] : [];
  }), [features.tools?.bindingFields, resource?.bindingFields]);
  const emitStateChange = useEffectEvent((state: PhiTableWidgetState) => onStateChange?.(state));
  const conditionControllerAddresses = useMemo(() => new Set(
    [
      ...toolbarActions,
      ...rowActions,
      ...bulkActions,
    ].flatMap((action) => [action.visibleWhen, action.disabledWhen])
      .concat(presentation.columns.map((column) => column.editor?.disabledWhen))
      .concat(resource?.fields.map((field) => field.mutableWhen) ?? [])
      .concat([features.rowSelection?.disabledWhen])
      .concat([features.editing?.disabledWhen])
      .concat([presentation.row?.mutedWhen])
      .flatMap(collectPhiRuntimeValueConditions)
      .flatMap((condition) => condition.source === "controller" && condition.controllerAddress
        ? [condition.controllerAddress]
        : []),
  ), [bulkActions, features.editing?.disabledWhen, features.rowSelection?.disabledWhen, presentation.columns, presentation.row?.mutedWhen, resource?.fields, rowActions, toolbarActions]);
  const conditionControllerAddressList = useMemo(
    () => [...conditionControllerAddresses],
    [conditionControllerAddresses],
  );
  const conditionControllersReady = usePhiSignalInstancesReady(conditionControllerAddressList);

  const effectiveLoading = loading && !bindingError && !contractError;

  useEffect(() => {
    if (features.search?.enabled !== true || query.search === searchDraft) return undefined;
    const timer = window.setTimeout(() => {
      setQuery((current) => ({ ...current, page: 1, cursor: null, search: searchDraft }));
    }, features.search.debounceMs ?? 250);
    return () => window.clearTimeout(timer);
  }, [features.search?.debounceMs, features.search?.enabled, query.search, searchDraft, setQuery]);

  const updateColumnOrder = useCallback((next: readonly string[]) => {
    const known = new Set(presentation.columns.filter((column) => !column.hidden).map((column) => column.key));
    if (next.length !== known.size || next.some((key) => !known.has(key)) || new Set(next).size !== next.length) return;
    setColumnOrder(next);
    emitCapability("columnsChange", { columnOrder: [...next] });
  }, [emitCapability, presentation.columns]);

  const updateExpandedRows = useCallback((next: readonly PhiTableRowIdentity[]) => {
    setExpandedRowIdentities(next);
    emitCapability("expansionChange", { expandedRowIdentities: [...next] });
  }, [emitCapability, setExpandedRowIdentities]);

  const updateSelection = useCallback((next: readonly PhiTableRowIdentity[]) => {
    setSelectedRowIdentities(next);
    emitCapability("selectionChange", { selectedRowIdentities: [...next] });
  }, [emitCapability, setSelectedRowIdentities]);

  const updateBindingParams = useCallback((next: Record<string, unknown>) => {
    setBindingParams(next);
    setQuery((current) => ({ ...current, page: 1, cursor: null }));
    setSelectedRowIdentities([]);
    setExpandedRowIdentities([]);
    emitCapability("bindingParamsChange", {
      params: Object.fromEntries(configuredBindingFields.flatMap(({ field }) => {
        const value = next[field.key];
        return value == null || typeof value === "string" || typeof value === "boolean" ||
          typeof value === "number" && Number.isFinite(value) ||
          Array.isArray(value) && value.every((entry) => typeof entry === "string" || typeof entry === "number" && Number.isFinite(entry))
          ? [[field.key, value]]
          : [];
      })),
    });
  }, [configuredBindingFields, emitCapability, setExpandedRowIdentities, setQuery, setSelectedRowIdentities]);

  useEffect(() => {
    if (!resource?.bindingFields?.length) return;
    const next = { ...bindingParams };
    let changed = false;
    for (const field of resource.bindingFields) {
      if (next[field.key] === undefined && field.defaultValue !== undefined) {
        next[field.key] = field.defaultValue;
        changed = true;
      }
    }
    if (!changed) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) updateBindingParams(next);
    });
    return () => { cancelled = true; };
  }, [bindingParams, resource?.bindingFields, updateBindingParams]);

  const activateAction = useCallback((
    action: ResolvedTableAction,
    row?: TableRow,
    identities: readonly PhiTableRowIdentity[] = [],
    actionValue?: string | number | boolean | readonly string[] | readonly number[] | null,
  ) => {
    if (onAction?.({ action: action as PhiTableActionDefinition, row, actionValue, selectedRowIdentities: identities }) === true) return;
    const rowIdentity = row && resource ? readRowIdentity(row, resource.rowIdentityPath) : null;
    const signalValue = {
      actionKey: action.key,
      rowIdentity,
      selectedRowIdentities: [...identities],
      ...(actionValue === undefined ? null : { actionValue }),
    };
    if (action.execution === "signal") {
      emitCapability("actionActivate", signalValue);
      return;
    }
    if (action.execution === "link") return;
    if (!resource) return;
    void executeAction({
      kind: "action",
      actionKey: action.key,
      rowIdentity,
      selectedRowIdentities: identities,
      actionValue,
      query: resolvedQuery,
    }).catch(() => undefined);
  }, [emitCapability, executeAction, onAction, resolvedQuery, resource]);

  usePhiSignalListener(useCallback((signal) => {
    const route = listenRoutes.find((candidate) => matchesListenRoute(candidate, signal));
    if (!route || (signal.receiver !== "broadcast" && signal.receiver !== signalIdentity.receiver)) return;
    if (route.capabilityId === "searchChange" && typeof signal.value === "string") {
      setSearchDraft(signal.value);
      setQuery((current) => ({ ...current, page: 1, cursor: null, search: signal.value as string }));
    } else if (route.capabilityId === "searchClear") {
      setSearchDraft("");
      setQuery((current) => ({ ...current, page: 1, cursor: null, search: "" }));
    } else if (route.capabilityId === "queryChange") {
      const next = readPhiTableQuery(signal.value);
      if (next) setQuery(next);
    } else if (route.capabilityId === "filtersChange") {
      const filters = readPhiTableFilters(signal.value);
      if (filters) setQuery((current) => ({ ...current, page: 1, cursor: null, filters }));
    } else if (route.capabilityId === "bindingParamsChange") {
      const next = readPhiTableBindingParamsSignalValue(signal.value);
      if (next) updateBindingParams({ ...bindingParams, ...next.params });
    } else if (route.capabilityId === "reload") {
      reload();
    } else if (route.capabilityId === "selectionClear") {
      updateSelection([]);
    } else if (route.capabilityId === "columnsChange") {
      const next = readPhiTableColumnOrderSignalValue(signal.value);
      if (next) updateColumnOrder(next.columnOrder);
    } else if (route.capabilityId === "expansionChange") {
      const next = readPhiTableExpansionSignalValue(signal.value);
      if (next) updateExpandedRows(next.expandedRowIdentities);
    } else if (route.capabilityId === "actionActivate") {
      const request = readPhiTableActionSignalValue(signal.value);
      if (!request) return;
      const action = [
        ...toolbarActions,
        ...rowActions,
        ...bulkActions,
      ].find((candidate) => candidate.key === request.actionKey);
      if (!action) return;
      const row = request.rowIdentity == null || !resource
        ? undefined
        : rows.find((candidate) => String(readPhiTableControlValue(candidate, resource.rowIdentityPath)) === String(request.rowIdentity));
      const execute = () => activateAction(action, row, request.selectedRowIdentities ?? [], request.actionValue);
      if (action.confirm) {
        const templateValue = request.rowIdentity ?? request.selectedRowIdentities.length;
        modal.confirm({
          title: formatTableActionTemplate(action.confirm.title, templateValue),
          content: formatTableActionTemplate(action.confirm.description, templateValue),
          okText: action.confirm.okText,
          cancelText: action.confirm.cancelText,
          okButtonProps: { danger: action.mode === "danger" },
          onOk: execute,
        });
      } else {
        execute();
      }
    } else if (
      route.capabilityId === "conditionStateChange" &&
      isPhiControllerSignalAddress(signal.sender) &&
      conditionControllerAddresses.has(signal.sender)
    ) {
      const next = readPhiRuntimeConditionStateSignalValue(signal.value);
      if (next) {
        setConditionControllerStates((current) => ({ ...current, [signal.sender!]: next.state }));
      }
    }
  }, [activateAction, bindingParams, bulkActions, conditionControllerAddresses, listenRoutes, modal, reload, resource, rowActions, rows, setQuery, signalIdentity.receiver, toolbarActions, updateBindingParams, updateColumnOrder, updateExpandedRows, updateSelection]), useMemo(() => {
    if (listenRoutes.length === 0) return null;
    return {
      scopes: Array.from(new Set(listenRoutes.map((route) => route.scope))),
      channels: Array.from(new Set(listenRoutes.map((route) => route.channel))),
      // Only a route set where every route names a schema can filter by schema: a route that names
      // none accepts a signal that carries none, and listing the others would drop exactly those.
      ...(listenRoutes.every((route) => route.valueSchema)
        ? { valueSchemas: Array.from(new Set(listenRoutes.map((route) => route.valueSchema!))) }
        : {}),
    };
  }, [listenRoutes]), signalIdentity.receiver);

  useEffect(() => {
    if (conditionControllerAddresses.size > 0 && conditionControllersReady) {
      emitCapability("conditionStateRequest", null);
    }
  }, [conditionControllerAddresses, conditionControllersReady, emitCapability]);

  useEffect(() => {
    emitCapability("queryChange", resolvedQuery as Record<string, unknown>);
  }, [emitCapability, resolvedQuery]);

  useEffect(() => {
    const state: PhiTableWidgetState = {
      total,
      page: resolvedQuery.page,
      pageSize: resolvedQuery.pageSize,
      loading: effectiveLoading,
      errorCode: error?.code ?? null,
      query: resolvedQuery,
      bindingParams,
      selectedRowIdentities,
      columnOrder,
      expandedRowIdentities,
    };
    emitStateChange(state);
    emitCapability("stateChange", state as unknown as Record<string, unknown>);
  }, [bindingParams, columnOrder, effectiveLoading, emitCapability, error?.code, expandedRowIdentities, resolvedQuery, selectedRowIdentities, total]);

  const columns = useMemo<PhiTableControlColumn<TableRow>[]>(() => {
    const result: PhiTableControlColumn<TableRow>[] = presentation.columns.filter((column) => !column.hidden).map((column) => ({
      key: column.key,
      title: column.title,
      fieldPath: column.fieldKey,
      sortField: column.sortField,
      sizing: column.sizing,
      align: column.align,
      fixed: column.sticky,
      ellipsis: column.ellipsis,
      sortable: column.sortable,
      editor: column.editor && features.editing?.mode === "cell"
        ? (() => {
            const field = resource?.fields.find((candidate) => candidate.key === column.fieldKey);
            return field && field.type !== "json"
              ? {
                  type: field.type,
                  control: column.editor?.control,
                  required: field.required,
                  disabled: loading,
                  constraints: field.constraints,
                  options: field.options,
                }
              : undefined;
          })()
        : undefined,
      isEditorDisabled: column.editor && features.editing?.mode === "cell"
        ? (row) => {
            const field = resource?.fields.find((candidate) => candidate.key === column.fieldKey);
            return Boolean(findMatchingCondition(
              row,
              combinePhiRuntimeConditionExpressions("any", [
                features.editing?.disabledWhen,
                column.editor?.disabledWhen,
              ]),
              conditionControllerStates,
            )) || !matchesAllConditions(row, field?.mutableWhen, conditionControllerStates);
          }
        : undefined,
      isEditorLoading: column.editor && features.editing?.mode === "cell" && resource
        ? (row) => {
            const rowIdentity = readRowIdentity(row, resource.rowIdentityPath);
            return rowIdentity != null && isFieldMutationPending(rowIdentity, column.fieldKey);
          }
        : undefined,
      onCommit: column.editor && features.editing?.mode === "cell" && resource ? (row, originalValue, proposedValue) => {
        const rowIdentity = readRowIdentity(row, resource.rowIdentityPath);
        if (rowIdentity == null) return;
        void commitField({
          kind: "field",
          rowIdentity,
          fieldKey: column.fieldKey,
          originalValue,
          proposedValue,
        }).catch(() => undefined);
      } : undefined,
      render: (value: unknown) => renderTableValue(value, column),
    }));
    if (rowActions.length || features.rowReordering?.enabled) {
      result.push({
        key: "__actions__",
        role: "actions",
        fieldPath: resource?.rowIdentityPath ?? "id",
        title: labels.actions,
        fixed: "right",
        sizing: { mode: "content" },
        render: (_value, row) => {
          const renderedActions = rowActions.map((action) => {
              if (!matchesAllConditions(row, action.visibleWhen, conditionControllerStates)) return null;
              const disabled = findMatchingCondition(row, action.disabledWhen, conditionControllerStates);
              const rowHref = action.hrefPath ? readPhiTableControlValue(row, action.hrefPath) : action.href;
              return (
                <TableAction
                  key={action.key}
                  action={typeof rowHref === "string" ? { ...action, href: rowHref } : action}
                  disabled={Boolean(disabled)}
                  disabledReason={disabled && "reason" in disabled ? disabled.reason : undefined}
                  templateValue={resource ? readRowIdentity(row, resource.rowIdentityPath) : null}
                  size={resolvedControlSize}
                  onActivate={() => activateAction(action, row)}
                />
              );
            });
          return features.actions?.rowLayout === "spaced"
            ? <Space size="small">{renderedActions}</Space>
            : <Space.Compact>{renderedActions}</Space.Compact>;
        },
      });
    }
    return result;
  }, [activateAction, commitField, conditionControllerStates, features.actions?.rowLayout, features.editing?.disabledWhen, features.editing?.mode, features.rowReordering?.enabled, isFieldMutationPending, labels.actions, loading, presentation.columns, resolvedControlSize, resource, rowActions]);

  const resolveSummaryValue = useCallback((item: PhiTableSummaryItemDefinition): PhiTableSummaryValue | undefined => {
    if (item.value.source === "provider") return summary[item.value.fieldKey];
    if (item.value.fieldKey === "totalRows") return total;
    if (item.value.fieldKey === "pageRows") return rows.length;
    if (item.value.fieldKey === "selectedRows") return selectedRowIdentities.length;
    if (item.value.fieldKey === "page") return resolvedQuery.page ?? 1;
    const pageSize = resolvedQuery.pageSize ?? rows.length;
    return pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  }, [resolvedQuery.page, resolvedQuery.pageSize, rows.length, selectedRowIdentities.length, summary, total]);
  const footer = useMemo(() => presentation.footer ? {
    align: presentation.footer.align,
    content: formatPhiTranslation(
      presentation.footer.template,
      presentation.footer.values.map((binding) => {
        const value = resolveSummaryValue({ key: binding.key, value: binding.value });
        return typeof value === "number" ? value : value == null ? "—" : String(value);
      }),
    ),
  } : undefined, [presentation.footer, resolveSummaryValue]);
  const tableSummary = useMemo(() => presentation.summary ? {
    ...presentation.summary,
    rows: presentation.summary.rows.map((row) => ({
      key: row.key,
      cells: row.cells.map((cell) => ({
        key: cell.key,
        columnKey: cell.columnKey,
        throughColumnKey: cell.throughColumnKey,
        align: cell.align,
        content: renderTableSummaryItem(cell.item, resolveSummaryValue(cell.item)),
      })),
    })),
  } : undefined, [presentation.summary, resolveSummaryValue]);

  const structure = features.structure?.mode === "tree" ? features.structure : null;
  const childAcceptanceField = resource?.hierarchy?.canAcceptChildrenField;
  const selfContainedTools = features.tools?.mode !== "external";
  const hasQueryTools = (features.search?.enabled ?? false) || (features.filters?.length ?? 0) > 0;
  const hasSelfContainedTools = selfContainedTools && (
    configuredBindingFields.length > 0 ||
    hasQueryTools ||
    features.tools?.reload === true ||
    (features.actions?.toolbar?.length ?? 0) > 0 ||
    (features.actions?.bulk?.length ?? 0) > 0
  );
  const resetQuery = () => {
    setSearchDraft(externalSearch ?? "");
    setQuery((current) => ({
      ...current,
      page: 1,
      cursor: null,
      search: externalSearch ?? "",
      sorts: [],
      filters: initialFilters,
    }));
  };
  const collectionFilters = hasSelfContainedTools && (configuredBindingFields.length > 0 || hasQueryTools) ? (
    <Flex align="end" gap={token.paddingSM} wrap>
      {configuredBindingFields.map(({ field, tool }) => (
        <TableBindingTool
          key={field.key}
          field={field}
          tool={tool}
          sourceConfig={bindingParams}
          value={bindingParams[field.key]}
          size={resolvedControlSize}
          onChange={(value) => updateBindingParams({ ...bindingParams, [field.key]: value })}
          onCreate={field.create && tool.create ? async (value) => {
            const result = await executeAction({
              kind: "action",
              actionKey: field.create!.actionKey,
              selectedRowIdentities: [],
              actionValue: value,
              query: resolvedQuery,
            });
            if (result.status !== "accepted" ||
              (typeof result.canonicalValue !== "string" && typeof result.canonicalValue !== "number")) {
              return null;
            }
            updateBindingParams({ ...bindingParams, [field.key]: result.canonicalValue });
            return result.canonicalValue;
          } : undefined}
        />
      ))}
      {features.filters?.map((filter) => (
        <Space key={filter.key} orientation="vertical" size="small">
          <Typography.Text type="secondary">{filter.label}</Typography.Text>
          <TableFilter
            filter={filter}
            field={resource?.fields.find((field) => field.key === filter.key)}
            sourceConfig={bindingParams}
            value={readTableFilterValue(filter, resolvedQuery.filters)}
            labels={labels}
            size={resolvedControlSize}
            onChange={(value) => {
              setQuery((current) => ({
                ...current,
                page: 1,
                cursor: null,
                filters: updateTableQueryFilters(current.filters, filter, value),
              }));
            }}
          />
        </Space>
      ))}
      {features.search?.enabled ? (
        <PhiTextControl inputType="search" allowClear placeholder={features.search.placeholder ?? labels.search}
          value={searchDraft} size={resolvedControlSize}
          onChange={(value) => setSearchDraft(value ?? "")} style={{ width: 260 }} />
      ) : null}
    </Flex>
  ) : null;
  const collectionToolbar = hasSelfContainedTools && (
    toolbarActions.length > 0 ||
    bulkActions.length > 0 ||
    (hasQueryTools && features.tools?.reset !== false) ||
    features.tools?.reload === true
  ) ? (
    <PhiToolbarControl size={resolvedControlSize} compact>
      {toolbarActions.map((action) => {
        if (!matchesAllConditions(null, action.visibleWhen, conditionControllerStates)) return null;
        const disabled = findMatchingCondition(null, action.disabledWhen, conditionControllerStates);
        return <TableAction key={action.key} action={action} size={resolvedControlSize}
          disabled={Boolean(disabled)} disabledReason={disabled && "reason" in disabled ? disabled.reason : undefined}
          onActivate={() => activateAction(action, undefined, selectedRowIdentities)} />;
      })}
      {bulkActions.map((action) => {
        if (!matchesAllConditions(null, action.visibleWhen, conditionControllerStates)) return null;
        const disabled = findMatchingCondition(null, action.disabledWhen, conditionControllerStates);
        return <TableAction key={action.key} action={action} size={resolvedControlSize}
          disabled={selectedRowIdentities.length === 0 || Boolean(disabled)}
          disabledReason={disabled && "reason" in disabled ? disabled.reason : undefined}
          templateValue={selectedRowIdentities.length}
          onActivate={() => activateAction(action, undefined, selectedRowIdentities)} />;
      })}
      {hasQueryTools && features.tools?.reset !== false ? (
        <PhiButtonControl icon={<UndoOutlined />} ariaLabel={labels.reset} size={resolvedControlSize} onClick={resetQuery} />
      ) : null}
      {features.tools?.reload ? (
        <PhiButtonControl icon={<ReloadOutlined />} ariaLabel={labels.reload} tooltip={labels.reload} size={resolvedControlSize} onClick={reload} />
      ) : null}
    </PhiToolbarControl>
  ) : null;

  return (
    <Space
      orientation="vertical"
      size={selfContainedTools ? token.paddingSM : token.padding}
      style={{ minWidth: 0, width: "100%" }}
    >
      <PhiCollectionHeaderControl
        title={presentation.title}
        description={presentation.description}
        filters={collectionFilters}
        toolbar={collectionToolbar}
      />
      {!selfContainedTools && bulkActions.length && selectedRowIdentities.length > 0 ? (
        <PhiAlertControl level="info" title={(
          <Flex align="center" justify="space-between" gap="small" wrap>
            <span>{formatPhiTableWidgetLabel(labels.selected, selectedRowIdentities.length)}</span>
            <Space size="small">{bulkActions.map((action) => {
              if (!matchesAllConditions(null, action.visibleWhen, conditionControllerStates)) return null;
              const disabled = findMatchingCondition(null, action.disabledWhen, conditionControllerStates);
              return <TableAction key={action.key} action={action} size={resolvedControlSize}
                disabled={Boolean(disabled)} disabledReason={disabled && "reason" in disabled ? disabled.reason : undefined}
                onActivate={() => activateAction(action, undefined, selectedRowIdentities)} />;
            })}</Space>
          </Flex>
        )} />
      ) : null}
      {bindingError || contractError || error ? (
        <PhiAlertControl level="error" showIcon title={bindingError ?? contractError ?? error?.message} />
      ) : null}
      <PhiTableBindingControl
        rows={rows}
        fields={resource?.fields ?? []}
        sourceConfig={bindingParams}
        renderDiagnostics={(warnings) => warnings.map((warning) =>
          <PhiAlertControl key={warning} level="error" showIcon title={warning} />)}
        rowIdentityPath={resource?.rowIdentityPath ?? "id"}
        columns={columns}
        columnOrder={columnOrder}
        sortingMode={features.sorting?.mode ?? "none"}
        sorts={resolvedQuery.sorts ?? []}
        onSortsChange={(sorts) => setQuery((current) => ({ ...current, page: 1, cursor: null, sorts }))}
        columnReordering={features.columnReordering?.enabled === true}
        onColumnOrderChange={updateColumnOrder}
        rowSelection={features.rowSelection?.mode && features.rowSelection.mode !== "none" ? {
          mode: features.rowSelection.mode,
          selectedRowIdentities,
          preserveSelectedRowIdentities: features.rowSelection.preserveSelectedRowIdentities,
          isRowDisabled: (row) => Boolean(findMatchingCondition(
            row,
            features.rowSelection?.disabledWhen,
            conditionControllerStates,
          )),
          onChange: updateSelection,
        } : undefined}
        pagination={features.pagination?.enabled === false ? false : {
          page: resolvedQuery.page ?? 1,
          pageSize: resolvedQuery.pageSize ?? 20,
          total,
          pageSizeOptions: features.pagination?.pageSizeOptions,
          showSizeChanger: features.pagination?.showSizeChanger ?? true,
          onChange: (page, pageSize) => setQuery((current) => ({ ...current, page, pageSize, cursor: null })),
        }}
        tree={structure ? {
          parentRowIdentityPath: structure.parentRowIdentityPath,
          expandColumnKey: structure.expandColumnKey,
          expandedRowIdentities,
          expandRowByClick: structure.expandRowByClick,
          indentSize: structure.indentSize,
          onExpandedRowIdentitiesChange: updateExpandedRows,
        } : undefined}
        rowReordering={features.rowReordering?.enabled &&
          !(resolvedQuery.search?.trim()) &&
          (resolvedQuery.sorts?.length ?? 0) === 0 &&
          !Object.values(resolvedQuery.filters ?? {}).some((value) =>
            value !== undefined && value !== null && value !== "" && (!Array.isArray(value) || value.length > 0)) ? {
            enabled: true,
            dragLabel: labels.dragRow,
            moveUpLabel: labels.moveRowUp,
            moveDownLabel: labels.moveRowDown,
            canAcceptChildren: childAcceptanceField
              ? (row) => readPhiTableControlValue(row, childAcceptanceField) === true
              : undefined,
            onMove: (move) => { void moveRow({ kind: "row-move", ...move }).catch(() => undefined); },
          } : undefined}
        rowStyle={presentation.row?.mutedWhen ? (row) => ({
          opacity: findMatchingCondition(row, presentation.row?.mutedWhen, conditionControllerStates) ? 0.5 : 1,
          transition: `opacity ${token.motionDurationMid}`,
        }) : undefined}
        editing={features.editing?.mode === "row" && resource ? {
          mode: "row",
          editLabel: labels.editRow,
          saveLabel: labels.saveRow,
          cancelLabel: labels.cancelRow,
          isRowDisabled: (row) => Boolean(findMatchingCondition(
            row,
            features.editing?.disabledWhen,
            conditionControllerStates,
          )),
          onCommit: (row, originalValues, patch) => {
            const rowIdentity = readRowIdentity(row, resource.rowIdentityPath);
            if (rowIdentity == null || Object.keys(patch).length === 0) return;
            void commitRow({ kind: "row", rowIdentity, originalValues, patch }).catch(() => undefined);
          },
        } : undefined}
        onExternalRowDragOver={resource?.dropTargets?.length ? (event) => {
          const payload = readPhiDataDragPayload(event.dataTransfer);
          if (!payload || !resource.dropTargets?.some((target) => target.payloadType === payload.payloadType)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        } : undefined}
        onExternalRowDrop={resource?.dropTargets?.length ? (event, row, placement) => {
          const payload = readPhiDataDragPayload(event.dataTransfer);
          if (!payload || !resource.dropTargets?.some((target) =>
            target.payloadType === payload.payloadType && (!target.modes || target.modes.includes(placement)))) return;
          const rowIdentity = readRowIdentity(row, resource.rowIdentityPath);
          if (rowIdentity == null) return;
          const parentIdentity = resource.hierarchy
            ? readPhiTableControlValue(row, resource.hierarchy.parentRowIdentityPath)
            : null;
          void drop({
            kind: "drop",
            ...payload,
            dropMode: placement,
            targetParentRowIdentity: placement === "child"
              ? rowIdentity
              : typeof parentIdentity === "string" || typeof parentIdentity === "number" ? parentIdentity : null,
            beforeRowIdentity: placement === "before" ? rowIdentity : null,
            afterRowIdentity: placement === "after" ? rowIdentity : null,
          }).catch(() => undefined).finally(clearPhiDataDragPayload);
        } : undefined}
        onExternalDragOver={resource?.dropTargets?.some((target) => !target.modes || target.modes.includes("append"))
          ? (event) => {
              const payload = readPhiDataDragPayload(event.dataTransfer);
              if (!payload || !resource.dropTargets?.some((target) => target.payloadType === payload.payloadType &&
                (!target.modes || target.modes.includes("append")))) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }
          : undefined}
        onExternalDrop={resource?.dropTargets?.some((target) => !target.modes || target.modes.includes("append"))
          ? (event) => {
              const payload = readPhiDataDragPayload(event.dataTransfer);
              if (!payload || !resource.dropTargets?.some((target) => target.payloadType === payload.payloadType &&
                (!target.modes || target.modes.includes("append")))) return;
              event.preventDefault();
              void drop({
                kind: "drop",
                ...payload,
                dropMode: "append",
                targetParentRowIdentity: null,
                beforeRowIdentity: null,
                afterRowIdentity: null,
              }).catch(() => undefined).finally(clearPhiDataDragPayload);
            }
          : undefined}
        loading={effectiveLoading}
        bordered={presentation.bordered}
        striped={presentation.row?.striped}
        showHeader={presentation.showHeader}
        size={resolvedControlSize}
        emptyText={(
          <Space orientation="vertical" size="small">
            <Typography.Text strong>{presentation.emptyState?.title ?? labels.emptyTitle}</Typography.Text>
            <Typography.Text type="secondary">{presentation.emptyState?.description ?? labels.emptyDescription}</Typography.Text>
          </Space>
        )}
        layout={presentation.layout}
        footer={footer}
        summary={tableSummary}
      />
    </Space>
  );
}

function TableAction({ action, disabled = false, disabledReason, templateValue, size, onActivate }: {
  action: ResolvedTableAction;
  disabled?: boolean;
  disabledReason?: string;
  templateValue?: PhiTableRowIdentity | null;
  size?: import("../../../../../types/control").PhiControlSize;
  onActivate: () => void;
}) {
  const icon = action.icon ? resolvePhiButtonIcon(action.icon) : null;
  const display = action.display ?? "label";
  const showIcon = display !== "label";
  const showLabel = display !== "icon";
  const buttonType = action.mode === "primary" ? "primary" : "default";
  const danger = action.mode === "danger";
  const content = (
    <Button
      size={size}
      type={buttonType}
      danger={danger}
      disabled={disabled}
      style={PHI_TABLE_ACTION_BUTTON_STYLE}
      icon={showIcon ? icon ?? undefined : undefined}
      aria-label={action.label}
      onClick={(event) => {
        event.stopPropagation();
        if (!action.confirm) onActivate();
      }}
    >
      {showLabel ? action.label : null}
    </Button>
  );
  if (action.execution === "link" && action.href) {
    const labelled = display === "icon" || disabledReason
      ? <Tooltip title={disabledReason ?? action.label}>{content}</Tooltip>
      : content;
    return disabled ? labelled : <PhiLink href={action.href} external={action.newTab} newTab={action.newTab}>{labelled}</PhiLink>;
  }
  const confirmed = action.confirm && !disabled ? (
    <PhiConfirmControl title={formatTableActionTemplate(action.confirm.title, templateValue)}
      description={action.confirm.alert ? (
        <Space orientation="vertical" size="small">
          {action.confirm.description ? (
            <span>{formatTableActionTemplate(action.confirm.description, templateValue)}</span>
          ) : null}
          <PhiAlertControl
            level={action.confirm.alert.level}
            title={formatTableActionTemplate(action.confirm.alert.title, templateValue)}
            description={formatTableActionTemplate(action.confirm.alert.description, templateValue)}
          />
        </Space>
      ) : formatTableActionTemplate(action.confirm.description, templateValue)}
      confirmLabel={action.confirm.okText} cancelLabel={action.confirm.cancelText}
      danger={danger} placement="left" onConfirm={onActivate}>
      {content}
    </PhiConfirmControl>
  ) : content;
  return display === "icon" || disabledReason
    ? <Tooltip title={disabledReason ?? action.label}>{confirmed}</Tooltip>
    : confirmed;
}

function TableBindingTool({ field, tool, sourceConfig, value, size, onChange, onCreate }: {
  field: PhiTableProviderBindingFieldDefinition;
  tool: PhiTableBindingToolDefinition;
  sourceConfig: Record<string, unknown>;
  value: unknown;
  size?: import("../../../../../types/control").PhiControlSize;
  onChange: (value: string | number) => void;
  onCreate?: (value: string) => Promise<string | number | null>;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [creating, setCreating] = useState(false);
  const resolvedOptions = usePhiControlOptionsProvider<string | number>({
    options: field.options,
    optionsProvider: field.optionsProvider,
    sourceConfig,
  });
  const createConfig = tool.create;
  const createIcon = createConfig?.icon ? resolvePhiButtonIcon(createConfig.icon) : null;
  const createDisplay = createConfig?.display ?? "label";
  const disabled = Boolean(resolvedOptions.warning) || Boolean(
    tool.disabledWhen && sourceConfig[tool.disabledWhen.fieldKey] === tool.disabledWhen.equals,
  );
  const optionValues = useMemo(
    () => new Set(resolvedOptions.options.map((option) => option.value)),
    [resolvedOptions.options],
  );
  const displayOptions = useMemo(() => {
    const labels = new Map<string | number, string>(
      tool.optionLabels?.map((option) => [option.value, option.label] as const),
    );
    return resolvedOptions.options.map((option) => ({
      ...option,
      label: labels.get(option.value) ?? option.label,
    }));
  }, [resolvedOptions.options, tool.optionLabels]);
  useEffect(() => {
    if (
      resolvedOptions.value === undefined ||
      value === resolvedOptions.value ||
      resolvedOptions.valueMode !== "authoritative" && optionValues.has(value as string | number)
    ) {
      return;
    }
    onChange(resolvedOptions.value);
  }, [onChange, optionValues, resolvedOptions.value, resolvedOptions.valueMode, value]);
  const create = field.create && createConfig && onCreate ? (
    <PhiPopoverControl
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      trigger="click"
      content={(
        <Space.Compact>
          <PhiTextControl
            value={draft}
            placeholder={createConfig.placeholder}
            size={size}
            onChange={(next) => setDraft(next ?? "")}
            onPressEnter={() => {
              if (!draft.trim() || creating) return;
              setCreating(true);
              void onCreate(draft.trim()).then((canonical) => {
                if (canonical != null) {
                  setDraft("");
                  setPopoverOpen(false);
                }
              }).finally(() => setCreating(false));
            }}
          />
          <PhiButtonControl
            size={size}
            type="primary"
            loading={creating}
            disabled={!draft.trim()}
            label={createConfig.submitLabel ?? createConfig.label}
            onClick={() => {
              if (!draft.trim()) return;
              setCreating(true);
              void onCreate(draft.trim()).then((canonical) => {
                if (canonical != null) {
                  setDraft("");
                  setPopoverOpen(false);
                }
              }).finally(() => setCreating(false));
            }}
          />
        </Space.Compact>
      )}
    >
      <span style={{ display: "inline-flex" }}>
        <PhiButtonControl
          size={size}
          ariaLabel={createConfig.label}
          tooltip={createConfig.description}
          icon={createDisplay === "label" ? undefined : createIcon ?? undefined}
          label={createDisplay === "icon" ? undefined : createConfig.label}
          onClick={() => setPopoverOpen((current) => !current)}
        />
      </span>
    </PhiPopoverControl>
  ) : null;
  return (
    <Space.Compact>
      {tool.control === "cascader" ? (
        <PhiCascaderControl
          label={tool.label}
          value={typeof value === "string" ? value : undefined}
          placeholder={tool.placeholder}
            disabled={disabled}
          options={displayOptions.map((option) => ({
            value: String(option.value),
            label: option.label,
          }))}
          allowRoot={tool.cascader?.allowRoot !== false}
          separator={tool.cascader?.separator ?? "/"}
          rootValue={tool.cascader?.rootValue ?? "/"}
          normalize={tool.cascader?.normalize ?? "raw"}
          size={size}
          style={{ minWidth: 280 }}
          onChange={(nextValue) => onChange(nextValue)}
        />
      ) : (
        <PhiSelectControl<string | number>
          label={tool.label}
          value={typeof value === "string" || typeof value === "number" ? value : undefined}
          placeholder={tool.placeholder}
          presentation={tool.control === "autocomplete" ? "autocomplete" : "select"}
          disabled={disabled}
          options={displayOptions}
          size={size}
          onChange={onChange}
          style={{ minWidth: 180 }}
        />
      )}
      {create}
    </Space.Compact>
  );
}

function TableFilter({ filter, field, sourceConfig, value, size, onChange, labels = PHI_TABLE_WIDGET_DEFAULT_LABELS }: {
  filter: PhiTableFilterDefinition;
  field?: PhiTableProviderFieldDefinition;
  sourceConfig?: Record<string, unknown>;
  value: TableFilterValue;
  size?: import("../../../../../types/control").PhiControlSize;
  onChange: (value: TableFilterValue) => void;
  labels?: PhiTableWidgetLabels;
}) {
  const fieldWithOptions = field?.type === "enum" || field?.type === "enum[]" ? field : null;
  const resolvedOptions = usePhiControlOptionsProvider<string>({
    options: filter.type === "select" && (filter.options?.length ?? 0) > 0
      ? filter.options
      : fieldWithOptions?.options as readonly import("../../../../../components/controls/phi-control-options").PhiControlOption<string>[] | undefined,
    optionsProvider: filter.type === "select"
      ? filter.optionsProvider ?? fieldWithOptions?.optionsProvider
      : undefined,
    sourceConfig,
  });
  if (filter.type === "select") {
    return filter.multiple ? (
      <PhiMultiSelectControl allowClear value={Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : []}
        disabled={Boolean(resolvedOptions.warning)} options={resolvedOptions.options} size={size}
        onChange={onChange} style={{ minWidth: 180 }} />
    ) : (
      <PhiSelectControl allowClear value={typeof value === "string" ? value : undefined}
        disabled={Boolean(resolvedOptions.warning)} options={resolvedOptions.options} size={size}
        onChange={onChange} style={{ minWidth: 180 }} />
    );
  }
  if (filter.type === "boolean") {
    return <PhiSelectControl allowClear value={typeof value === "boolean" ? String(value) : undefined}
      options={[{ value: "true", label: labels.yes }, { value: "false", label: labels.no }]}
      size={size} onChange={(next) => onChange(next === undefined ? undefined : next === "true")}
      style={{ minWidth: 140 }} />;
  }
  if (filter.type === "dateRange") {
    const range = isRecord(value) ? value : {};
    return <Space.Compact>
      <PhiTextControl value={typeof range.start === "string" ? range.start : ""} placeholder={filter.startPlaceholder}
        size={size} onChange={(next) => onChange({ ...range, start: next ?? "" })} />
      <PhiTextControl value={typeof range.end === "string" ? range.end : ""} placeholder={filter.endPlaceholder}
        size={size} onChange={(next) => onChange({ ...range, end: next ?? "" })} />
    </Space.Compact>;
  }
  return <PhiTextControl value={typeof value === "string" ? value : ""} placeholder={filter.placeholder}
    size={size} onChange={(next) => onChange(next ?? "")} />;
}
