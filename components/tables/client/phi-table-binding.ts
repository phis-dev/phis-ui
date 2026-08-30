"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  PhiTableProviderActionMutationRequest,
  PhiTableProviderDropMutationRequest,
  PhiTableProviderFieldMutationRequest,
  PhiTableProviderMutationRequest,
  PhiTableProviderMutationResult,
  PhiTableProviderQueryResult,
  PhiTableProviderResourceDescriptor,
  PhiTableProviderRowMoveMutationRequest,
  PhiTableProviderRowPatchMutationRequest,
  PhiTableQuery,
  PhiTableRowIdentity,
  PhiTableSourceBinding,
  PhiTableSummaryValue,
} from "../../../types/table-widget";
import {
  PhiTableProviderError,
  readPhiTableProviderError,
  readPhiTableProviderMutationResult,
  readPhiTableProviderQueryResult,
  validatePhiTableProviderFieldValue,
} from "../../../types/table-widget";
import {
  movePhiTableBindingRows,
  movePhiTableBindingTreeRows,
  patchPhiTableBindingRows,
  readPhiTableRowIdentity,
  readPhiTableRowValue,
  restorePhiTableBindingRowOrder,
} from "../../../helpers/table-binding";
import { usePhiTableProvider } from "../../widgets/client/shared/phi-table-provider";

type TableRow = Record<string, unknown>;

function validateProviderSummary(
  resource: PhiTableProviderResourceDescriptor,
  summary: Readonly<Record<string, PhiTableSummaryValue>> | undefined,
) {
  if (!summary) return null;
  const fields = new Map((resource.summaryFields ?? []).map((field) => [field.key, field]));
  for (const [key, value] of Object.entries(summary)) {
    const field = fields.get(key);
    if (!field) return `Table Provider returned undeclared summary field "${key}".`;
    if (value === null) continue;
    if (field.type === "number" && typeof value !== "number" ||
      field.type === "boolean" && typeof value !== "boolean" ||
      (field.type === "string" || field.type === "date" || field.type === "datetime") && typeof value !== "string") {
      return `Table Provider summary field "${key}" has an invalid value.`;
    }
    if (field.type === "date" && typeof value === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return `Table Provider summary field "${key}" has an invalid date value.`;
    }
    if (field.type === "datetime" && typeof value === "string" && !Number.isFinite(Date.parse(value))) {
      return `Table Provider summary field "${key}" has an invalid datetime value.`;
    }
  }
  return null;
}

function mergePhiTableQuery(
  query: PhiTableQuery,
  patch: PhiTableQuery,
): PhiTableQuery {
  return {
    page: patch.page ?? query.page,
    pageSize: patch.pageSize ?? query.pageSize,
    cursor: patch.cursor !== undefined ? patch.cursor : query.cursor,
    search: patch.search ?? query.search,
    sorts: patch.sorts ?? query.sorts,
    filters: patch.filters === undefined
      ? query.filters
      : { ...(query.filters ?? {}), ...patch.filters },
    expandedRowIdentities: patch.expandedRowIdentities ?? query.expandedRowIdentities,
  };
}

function createPhiTableQueryKey(query: PhiTableQuery) {
  const filters = Object.fromEntries(
    Object.entries(query.filters ?? {}).sort(([left], [right]) => left.localeCompare(right)),
  );
  return JSON.stringify({
    page: query.page ?? null,
    pageSize: query.pageSize ?? null,
    cursor: query.cursor ?? null,
    search: query.search ?? "",
    sorts: query.sorts ?? [],
    filters,
    expandedRowIdentities: query.expandedRowIdentities ?? [],
  });
}

function resolvePhiTableQuery(
  query: PhiTableQuery,
  externalQuery: PhiTableQuery | undefined,
  externalSearch: string | undefined,
  expandedRowIdentities: readonly PhiTableRowIdentity[],
): PhiTableQuery {
  return {
    ...query,
    ...externalQuery,
    search: externalSearch ?? externalQuery?.search ?? query.search,
    sorts: externalQuery?.sorts ?? query.sorts,
    filters: {
      ...(query.filters ?? {}),
      ...(externalQuery?.filters ?? {}),
    },
    expandedRowIdentities,
  };
}

type MutationInput<TRequest extends PhiTableProviderMutationRequest> = TRequest extends unknown
  ? Omit<TRequest, "resourceKey" | "params" | "signal">
  : never;

export type PhiTableBindingInput = {
  source: PhiTableSourceBinding | null;
  initialQuery?: PhiTableQuery;
  externalQuery?: PhiTableQuery;
  externalSearch?: string;
  defaultPageSize?: number;
  refreshKey?: string | number;
  preserveSelectedRowIdentities?: boolean;
  initialExpandedRowIdentities?: readonly PhiTableRowIdentity[];
  onData?: (data: PhiTableProviderQueryResult) => void;
  onMutation?: (result: PhiTableProviderMutationResult) => void;
  validateResource?: (resource: PhiTableProviderResourceDescriptor) => string | null;
};

export function usePhiTableBinding({
  source,
  initialQuery = {},
  externalQuery,
  externalSearch,
  defaultPageSize = 20,
  refreshKey,
  preserveSelectedRowIdentities = false,
  initialExpandedRowIdentities = [],
  onData,
  onMutation,
  validateResource,
}: PhiTableBindingInput) {
  const { provider, resource, bindingError } = usePhiTableProvider(source);
  const resourceError = resource ? validateResource?.(resource) ?? null : null;
  const [query, setQuery] = useState<PhiTableQuery>(() => ({
    page: initialQuery.page ?? 1,
    pageSize: initialQuery.pageSize ?? defaultPageSize,
    cursor: initialQuery.cursor,
    search: initialQuery.search ?? "",
    sorts: initialQuery.sorts ?? [],
    filters: initialQuery.filters,
    expandedRowIdentities: initialQuery.expandedRowIdentities,
  }));
  const [rows, setRows] = useState<readonly TableRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Readonly<Record<string, PhiTableSummaryValue>>>({});
  const [queryLoading, setQueryLoading] = useState(Boolean(source));
  const [pendingMutationTargets, setPendingMutationTargets] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [error, setError] = useState<PhiTableProviderError | null>(null);
  const [selectedRowIdentities, setSelectedRowIdentities] = useState<readonly PhiTableRowIdentity[]>([]);
  const [expandedRowIdentities, setExpandedRowIdentities] = useState<readonly PhiTableRowIdentity[]>(
    initialExpandedRowIdentities,
  );
  const [refreshRequest, setRefreshRequest] = useState({ revision: 0, background: false });
  const mutationSequence = useRef(0);
  const latestMutationByTarget = useRef(new Map<string, number>());
  const pendingMutationCountsByTarget = useRef(new Map<string, number>());
  const mutationControllers = useRef(new Set<AbortController>());
  const previousQueryInputs = useRef<{
    provider: unknown;
    resource: unknown;
    source: unknown;
    resourceError: unknown;
    resolvedQueryKey: string;
    refreshKey: unknown;
  } | null>(null);
  const acceptedResolvedQuery = useRef<{
    queryKey: string;
    refreshRevision: number;
  } | null>(null);
  const rowsRef = useRef(rows);
  const onDataRef = useRef(onData);
  const onMutationRef = useRef(onMutation);
  const sourceKey = useMemo(() => JSON.stringify(source), [source]);

  useEffect(() => { onDataRef.current = onData; }, [onData]);
  useEffect(() => { onMutationRef.current = onMutation; }, [onMutation]);
  useEffect(() => { rowsRef.current = rows; }, [rows]);
  useEffect(() => () => {
    for (const controller of mutationControllers.current) controller.abort();
    mutationControllers.current.clear();
  }, []);
  useEffect(() => {
    for (const controller of mutationControllers.current) controller.abort();
    mutationControllers.current.clear();
    latestMutationByTarget.current.clear();
    pendingMutationCountsByTarget.current.clear();
    rowsRef.current = [];
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setPendingMutationTargets(new Set());
      setRows([]);
      setTotal(0);
      setSummary({});
      setSelectedRowIdentities([]);
      setExpandedRowIdentities([]);
      setQuery((current) => ({ ...current, page: 1, cursor: null }));
      setQueryLoading(sourceKey !== "null");
      setError(null);
    });
    return () => { cancelled = true; };
  }, [sourceKey]);

  const resolvedQuery = useMemo<PhiTableQuery>(
    () => resolvePhiTableQuery(query, externalQuery, externalSearch, expandedRowIdentities),
    [expandedRowIdentities, externalQuery, externalSearch, query],
  );
  const resolvedQueryKey = useMemo(
    () => createPhiTableQueryKey(resolvedQuery),
    [resolvedQuery],
  );

  const updateMutationTargetPending = useCallback((targetKey: string, pending: boolean) => {
    const current = pendingMutationCountsByTarget.current.get(targetKey) ?? 0;
    const next = pending ? current + 1 : Math.max(0, current - 1);
    if (next > 0) {
      pendingMutationCountsByTarget.current.set(targetKey, next);
      if (current === 0) {
        setPendingMutationTargets((targets) => new Set(targets).add(targetKey));
      }
      return;
    }
    pendingMutationCountsByTarget.current.delete(targetKey);
    if (current > 0) {
      setPendingMutationTargets((targets) => {
        const nextTargets = new Set(targets);
        nextTargets.delete(targetKey);
        return nextTargets;
      });
    }
  }, []);

  const applyData = useCallback((data: PhiTableProviderQueryResult) => {
    if (!resource) return;
    if (data.rows.some((row) => readPhiTableRowIdentity(row, resource.rowIdentityPath) == null)) {
      setRows([]);
      rowsRef.current = [];
      setTotal(0);
      setSummary({});
      setQueryLoading(false);
      setError(new PhiTableProviderError(
        "missing-row-identity",
        `Table Provider row is missing identity field "${resource.rowIdentityPath}".`,
      ));
      return;
    }
    const summaryError = validateProviderSummary(resource, data.summary);
    if (summaryError) {
      setRows([]);
      rowsRef.current = [];
      setTotal(0);
      setSummary({});
      setQueryLoading(false);
      setError(new PhiTableProviderError("invalid-summary", summaryError));
      return;
    }
    rowsRef.current = data.rows;
    setRows(data.rows);
    setTotal(data.total ?? data.rows.length);
    setSummary(data.summary ?? {});
    setQueryLoading(false);
    setError(null);
    if (!preserveSelectedRowIdentities) {
      const available = new Set(data.rows.flatMap((row) => {
        const identity = readPhiTableRowIdentity(row, resource.rowIdentityPath);
        return identity == null ? [] : [String(identity)];
      }));
      setSelectedRowIdentities((current) => current.filter((identity) => available.has(String(identity))));
    }
    onDataRef.current?.(data);
  }, [preserveSelectedRowIdentities, resource]);

  useEffect(() => {
    if (!source || !provider || !resource || resourceError) return;
    if (
      acceptedResolvedQuery.current?.queryKey === resolvedQueryKey &&
      acceptedResolvedQuery.current.refreshRevision === refreshRequest.revision
    ) {
      acceptedResolvedQuery.current = null;
      previousQueryInputs.current = {
        provider,
        resource,
        source,
        resourceError,
        resolvedQueryKey,
        refreshKey,
      };
      return;
    }
    const previous = previousQueryInputs.current;
    const sameQueryInputs = previous != null &&
      previous.provider === provider &&
      previous.resource === resource &&
      previous.source === source &&
      previous.resourceError === resourceError &&
      previous.resolvedQueryKey === resolvedQueryKey &&
      previous.refreshKey === refreshKey;
    const background = refreshRequest.background && sameQueryInputs && rowsRef.current.length > 0;
    previousQueryInputs.current = { provider, resource, source, resourceError, resolvedQueryKey, refreshKey };
    const abortController = new AbortController();
    queueMicrotask(() => {
      if (!abortController.signal.aborted) {
        if (!background) setQueryLoading(true);
        setError(null);
      }
    });
    void provider.query({
      resourceKey: source.resourceKey,
      query: resolvedQuery,
      params: source.params,
      signal: abortController.signal,
    }).then((value) => {
      const data = readPhiTableProviderQueryResult(value);
      if (!data) {
        throw new PhiTableProviderError("invalid-query-result", "Table Provider returned an invalid query result.");
      }
      if (!abortController.signal.aborted) {
        const resolvedQueryPatch = data.resolvedQuery;
        if (resolvedQueryPatch) {
          const canonicalInternalQuery = mergePhiTableQuery(query, resolvedQueryPatch);
          const canonicalQuery = resolvePhiTableQuery(
            canonicalInternalQuery,
            externalQuery,
            externalSearch,
            expandedRowIdentities,
          );
          const canonicalQueryKey = createPhiTableQueryKey(canonicalQuery);
          if (canonicalQueryKey !== resolvedQueryKey) {
            acceptedResolvedQuery.current = {
              queryKey: canonicalQueryKey,
              refreshRevision: refreshRequest.revision,
            };
            setQuery((current) => mergePhiTableQuery(current, resolvedQueryPatch));
          }
        }
        applyData(data);
      }
    }).catch((queryError: unknown) => {
      if (!abortController.signal.aborted) {
        if (!background) {
          setRows([]);
          rowsRef.current = [];
          setTotal(0);
          setSummary({});
        }
        setQueryLoading(false);
        setError(readPhiTableProviderError(queryError));
      }
    });
    return () => abortController.abort();
  }, [applyData, expandedRowIdentities, externalQuery, externalSearch, provider, query, refreshKey, refreshRequest, resolvedQuery, resolvedQueryKey, resource, resourceError, source]);

  const reload = useCallback(() => setRefreshRequest((current) => ({
    revision: current.revision + 1,
    background: false,
  })), []);
  const revalidate = useCallback(() => setRefreshRequest((current) => ({
    revision: current.revision + 1,
    background: true,
  })), []);

  const runMutation = useCallback(async (
    request: MutationInput<PhiTableProviderMutationRequest>,
    targetKey: string,
    optimisticRows?: readonly TableRow[],
  ) => {
    if (bindingError || !provider || !resource || !source) {
      throw new PhiTableProviderError("provider-unavailable", bindingError ?? "Table Provider is unavailable.");
    }
    if (!provider.mutate) {
      throw new PhiTableProviderError("provider-read-only", `Table Provider "${source.providerKey}" is read-only.`);
    }
    const requestId = ++mutationSequence.current;
    latestMutationByTarget.current.set(targetKey, requestId);
    const previousRows = rowsRef.current;
    if (optimisticRows) {
      rowsRef.current = optimisticRows;
      setRows(optimisticRows);
    }
    updateMutationTargetPending(targetKey, true);
    setError(null);
    const abortController = new AbortController();
    mutationControllers.current.add(abortController);
    const restoreOptimisticRows = () => {
      if (!optimisticRows) return;
      if (request.kind === "field") {
        const restored = patchPhiTableBindingRows(
          rowsRef.current,
          resource.rowIdentityPath,
          request.rowIdentity,
          { [request.fieldKey]: request.originalValue },
        );
        rowsRef.current = restored;
        setRows(restored);
        return;
      }
      if (request.kind === "row") {
        const previousRow = previousRows.find((row) =>
          String(readPhiTableRowIdentity(row, resource.rowIdentityPath)) === String(request.rowIdentity));
        const restoredValues = Object.fromEntries(
          Object.keys(request.patch).map((key) => [key, previousRow ? readPhiTableRowValue(previousRow, key) : undefined]),
        );
        const restored = patchPhiTableBindingRows(
          rowsRef.current,
          resource.rowIdentityPath,
          request.rowIdentity,
          restoredValues,
        );
        rowsRef.current = restored;
        setRows(restored);
        return;
      }
      let restored = restorePhiTableBindingRowOrder(rowsRef.current, previousRows, resource.rowIdentityPath);
      if (request.kind === "row-move" && resource.hierarchy) {
        const previousRow = previousRows.find((row) =>
          String(readPhiTableRowIdentity(row, resource.rowIdentityPath)) === String(request.movedRowIdentity));
        restored = patchPhiTableBindingRows(restored, resource.rowIdentityPath, request.movedRowIdentity, {
          [resource.hierarchy.parentRowIdentityPath]: previousRow
            ? readPhiTableRowValue(previousRow, resource.hierarchy.parentRowIdentityPath)
            : null,
        });
      }
      rowsRef.current = restored;
      setRows(restored);
    };
    try {
      const rawResult = await provider.mutate({
        ...request,
        resourceKey: source.resourceKey,
        params: source.params,
        signal: abortController.signal,
      } as unknown as PhiTableProviderMutationRequest);
      const result = readPhiTableProviderMutationResult(rawResult);
      if (!result) {
        throw new PhiTableProviderError("invalid-mutation-result", "Table Provider returned an invalid mutation result.");
      }
      const summaryError = validateProviderSummary(resource, result.summaryPatch);
      if (summaryError) {
        throw new PhiTableProviderError("invalid-summary-patch", summaryError);
      }
      if (latestMutationByTarget.current.get(targetKey) !== requestId) return result;
      latestMutationByTarget.current.delete(targetKey);
      if (result.status === "rejected") {
        restoreOptimisticRows();
        setError(new PhiTableProviderError(result.errorCode ?? "mutation-rejected", result.message ?? "Table change was rejected."));
        onMutationRef.current?.(result);
        return result;
      }
      if (request.kind === "field") {
        const canonicalValue = result.canonicalValue === undefined ? request.proposedValue : result.canonicalValue;
        setRows((current) => {
          const next = patchPhiTableBindingRows(
            current,
          resource.rowIdentityPath,
          request.rowIdentity,
          { [request.fieldKey]: canonicalValue, ...(result.rowPatch ?? {}) },
          );
          rowsRef.current = next;
          return next;
        });
      } else if (request.kind === "row" && result.rowPatch) {
        setRows((current) => {
          const next = patchPhiTableBindingRows(
            current,
          resource.rowIdentityPath,
          request.rowIdentity,
          result.rowPatch ?? {},
          );
          rowsRef.current = next;
          return next;
        });
      } else if (request.kind === "action" && request.rowIdentity != null && result.rowPatch) {
        setRows((current) => {
          const next = patchPhiTableBindingRows(
            current,
            resource.rowIdentityPath,
            request.rowIdentity!,
            result.rowPatch ?? {},
          );
          rowsRef.current = next;
          return next;
        });
      }
      if (result.summaryPatch) {
        setSummary((current) => ({ ...current, ...result.summaryPatch }));
      }
      setError(null);
      onMutationRef.current?.(result);
      const mutatedFieldKeys = request.kind === "field"
        ? [request.fieldKey]
        : request.kind === "row"
          ? Object.keys(request.patch)
          : [];
      const activeFilterKeys = new Set(Object.entries(resolvedQuery.filters ?? {}).flatMap(([key, value]) =>
        value === undefined || value === null || value === "" || Array.isArray(value) && value.length === 0
          ? []
          : [key],
      ));
      const activeSortKeys = new Set((resolvedQuery.sorts ?? []).map((sort) => sort.key));
      const touchesActiveQuery = mutatedFieldKeys.some((key) =>
        activeFilterKeys.has(key) || activeSortKeys.has(key));
      if (result.invalidation !== "none" || touchesActiveQuery) revalidate();
      return result;
    } catch (mutationError) {
      if (latestMutationByTarget.current.get(targetKey) === requestId) {
        latestMutationByTarget.current.delete(targetKey);
        restoreOptimisticRows();
        setError(readPhiTableProviderError(mutationError));
      }
      throw mutationError;
    } finally {
      mutationControllers.current.delete(abortController);
      updateMutationTargetPending(targetKey, false);
    }
  }, [bindingError, provider, resolvedQuery.filters, resolvedQuery.sorts, resource, revalidate, source, updateMutationTargetPending]);

  const executeAction = useCallback((request: MutationInput<PhiTableProviderActionMutationRequest>) => {
    const action = resource?.actions?.find((candidate) => candidate.key === request.actionKey);
    if (!action) {
      const actionError = new PhiTableProviderError(
        "action-not-declared",
        `Table action "${request.actionKey}" is not declared by resource "${resource?.resourceKey ?? "unknown"}".`,
      );
      setError(actionError);
      return Promise.reject(actionError);
    }
    const hasRow = request.rowIdentity != null;
    const hasSelection = (request.selectedRowIdentities?.length ?? 0) > 0;
    if ((action.scope === "row" && !hasRow) || (action.scope === "selection" && !hasSelection)) {
      const scopeError = new PhiTableProviderError(
        "action-scope-invalid",
        `Table action "${request.actionKey}" requires ${action.scope} identity context.`,
      );
      setError(scopeError);
      return Promise.reject(scopeError);
    }
    const value = request.actionValue;
    const valueValid = action.valueType === undefined || action.valueType === "none"
      ? value === undefined || value === null
      : action.valueType === "string"
        ? typeof value === "string"
        : action.valueType === "number"
          ? typeof value === "number" && Number.isFinite(value)
          : action.valueType === "boolean"
            ? typeof value === "boolean"
            : action.valueType === "string[]"
              ? Array.isArray(value) && value.every((entry) => typeof entry === "string")
              : action.valueType === "number[]"
                ? Array.isArray(value) && value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
                : Boolean(value) && typeof value === "object" && !Array.isArray(value);
    if (!valueValid) {
      const valueError = new PhiTableProviderError(
        "action-value-invalid",
        `Table action "${request.actionKey}" received an incompatible value.`,
      );
      setError(valueError);
      return Promise.reject(valueError);
    }
    return runMutation(
      request,
      `action:${request.actionKey}:${String(request.rowIdentity ?? "")}:${(request.selectedRowIdentities ?? []).map(String).join(",")}`,
    );
  }, [resource, runMutation]);

  const commitField = useCallback((request: MutationInput<PhiTableProviderFieldMutationRequest>) => {
    if (!resource) return Promise.reject(new PhiTableProviderError("provider-unavailable", "Table resource is unavailable."));
    const field = resource.fields.find((candidate) => candidate.key === request.fieldKey);
    if (!field?.mutable) {
      return Promise.reject(new PhiTableProviderError(
        "field-read-only",
        `Table field "${request.fieldKey}" is not mutable.`,
      ));
    }
    const validationError = validatePhiTableProviderFieldValue(field, request.proposedValue);
    if (validationError) {
      const fieldError = new PhiTableProviderError("field-value-invalid", validationError);
      setError(fieldError);
      return Promise.reject(fieldError);
    }
    const optimisticRows = patchPhiTableBindingRows(
      rowsRef.current,
      resource.rowIdentityPath,
      request.rowIdentity,
      { [request.fieldKey]: request.proposedValue },
    );
    return runMutation(request, `field:${String(request.rowIdentity)}:${request.fieldKey}`, optimisticRows);
  }, [resource, runMutation]);

  const commitRow = useCallback((request: MutationInput<PhiTableProviderRowPatchMutationRequest>) => {
    if (!resource) return Promise.reject(new PhiTableProviderError("provider-unavailable", "Table resource is unavailable."));
    for (const [fieldKey, proposedValue] of Object.entries(request.patch)) {
      const field = resource.fields.find((candidate) => candidate.key === fieldKey);
      if (!field?.mutable) {
        const fieldError = new PhiTableProviderError("field-read-only", `Table field "${fieldKey}" is not mutable.`);
        setError(fieldError);
        return Promise.reject(fieldError);
      }
      const validationError = validatePhiTableProviderFieldValue(field, proposedValue);
      if (validationError) {
        const fieldError = new PhiTableProviderError("field-value-invalid", validationError);
        setError(fieldError);
        return Promise.reject(fieldError);
      }
    }
    const optimisticRows = patchPhiTableBindingRows(rowsRef.current, resource.rowIdentityPath, request.rowIdentity, request.patch);
    return runMutation(request, `row:${String(request.rowIdentity)}`, optimisticRows);
  }, [resource, runMutation]);

  const moveRow = useCallback((request: MutationInput<PhiTableProviderRowMoveMutationRequest>) => {
    if (!resource || resource.rowOrdering === undefined || resource.rowOrdering === "none") {
      return Promise.reject(new PhiTableProviderError("row-ordering-disabled", "Table resource does not support row ordering."));
    }
    const hasActiveFilter = Object.values(resolvedQuery.filters ?? {}).some((value) =>
      value !== undefined && value !== null && value !== "" && (!Array.isArray(value) || value.length > 0));
    if (resolvedQuery.search?.trim() || (resolvedQuery.sorts?.length ?? 0) > 0 || hasActiveFilter) {
      const orderingError = new PhiTableProviderError(
        "row-ordering-query-active",
        "Table rows cannot be reordered while search, filters, or sorting are active.",
      );
      setError(orderingError);
      return Promise.reject(orderingError);
    }
    const optimisticRows = resource.rowOrdering === "flat"
      ? movePhiTableBindingRows(rowsRef.current, resource.rowIdentityPath, request)
      : resource.hierarchy
        ? movePhiTableBindingTreeRows(
            rowsRef.current,
            resource.rowIdentityPath,
            resource.hierarchy.parentRowIdentityPath,
            request,
          )
        : undefined;
    return runMutation(request, `row-move:${String(request.movedRowIdentity)}`, optimisticRows);
  }, [resolvedQuery.filters, resolvedQuery.search, resolvedQuery.sorts, resource, runMutation]);

  const drop = useCallback((request: MutationInput<PhiTableProviderDropMutationRequest>) => {
    const target = resource?.dropTargets?.find((capability) => capability.payloadType === request.payloadType);
    if (!target || target.modes && !target.modes.includes(request.dropMode)) {
      const dropError = new PhiTableProviderError(
        "drop-not-supported",
        `Table resource does not accept "${request.payloadType}" with mode "${request.dropMode}".`,
      );
      setError(dropError);
      return Promise.reject(dropError);
    }
    return runMutation(request, `drop:${request.payloadType}:${request.sourceObjectIdentity}`);
  }, [resource, runMutation]);

  const isFieldMutationPending = useCallback(
    (rowIdentity: PhiTableRowIdentity, fieldKey: string) =>
      pendingMutationTargets.has(`field:${String(rowIdentity)}:${fieldKey}`),
    [pendingMutationTargets],
  );

  return {
    resource,
    bindingError,
    rows,
    total,
    summary,
    contractError: resourceError,
    loading: queryLoading && !bindingError && !resourceError,
    error,
    query,
    resolvedQuery,
    setQuery,
    selectedRowIdentities,
    setSelectedRowIdentities,
    expandedRowIdentities,
    setExpandedRowIdentities,
    reload,
    isFieldMutationPending,
    executeAction,
    commitField,
    commitRow,
    moveRow,
    drop,
  };
}
