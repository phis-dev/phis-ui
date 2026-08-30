"use client";

import { ReloadOutlined, UndoOutlined } from "@ant-design/icons";
import type { PhiTreeWidgetLabels } from "../../../../../components/widgets/label-types/tree";
import { Typography } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  PhiTreeActionDefinition,
  PhiTreeNodeIdentity,
  PhiTreeProviderBindingFieldDefinition,
  PhiTreeWidgetConfig,
} from "../../../../../types/tree-widget";
import { validatePhiTreeWidgetBinding } from "../../../../../types/tree-widget";
import type { PhiControlSize } from "../../../../../types/control";
import { usePhiTreeBinding } from "../../../../../components/trees/client/phi-tree-binding";
import { PhiTreeActionButton, PhiTreeControl } from "../../../../../components/controls/phi-tree-control";
import { PhiTextControl } from "../../../../../components/controls/phi-text-control";
import { PhiSelectControl } from "../../../../../components/controls/phi-select-control";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiCollectionHeaderControl } from "../../../../../components/controls/phi-collection-header-control";
import { PhiToolbarControl } from "../../../../../components/controls/phi-toolbar-control";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { usePhiControlOptionsProvider } from "../../../../../components/controls/phi-options-provider";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import {
  clearPhiDataDragPayload,
  readPhiDataDragPayload,
  startPhiDataDragAutoScroll,
  writePhiDataDragPayload,
} from "../../../../../components/runtime/client/phi-data-dnd";
import { usePhiSignalListener } from "../../../../../components/runtime/runtime-signal-bus";
import { usePhiSignalEmitter, usePhiSignalIdentity } from "../../../../../components/runtime/runtime-signal-identity";
import { findPhiSignalRoutesByCapabilityId, type PhiSignalValue } from "../../../../../types/signals";

function readPath(value: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) =>
    current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, value);
}

function TreeBindingTool({
  field,
  label,
  placeholder,
  presentation,
  width,
  sourceConfig,
  controlSize,
  value,
  onChange,
}: {
  field: PhiTreeProviderBindingFieldDefinition;
  label?: string;
  placeholder?: string;
  presentation?: "select" | "autocomplete";
  width?: import("../../../../../types/length").PhiCssLength;
  sourceConfig: Record<string, unknown>;
  controlSize: PhiControlSize;
  value: unknown;
  onChange: (value: string | number) => void;
}) {
  const options = usePhiControlOptionsProvider<string | number>({
    options: field.options,
    optionsProvider: field.optionsProvider,
    sourceConfig,
  });
  return (
    <PhiSelectControl<string | number>
      label={label}
      placeholder={placeholder}
      presentation={presentation}
      value={typeof value === "string" || typeof value === "number" ? value : undefined}
      options={options.options}
      disabled={Boolean(options.warning)}
      size={controlSize}
      onChange={onChange}
      style={{ width: width ?? 180, minWidth: 0 }}
    />
  );
}

export function PhiTreeWidgetClient({ config, labels }: { config: PhiTreeWidgetConfig; labels: PhiTreeWidgetLabels }) {
  const { token } = usePhiConfig();
  const [bindingParams, setBindingParams] = useState<Record<string, unknown>>(() => ({ ...(config.source?.params ?? {}) }));
  const [searchDraft, setSearchDraft] = useState(config.initialQuery?.search ?? "");
  const signalIdentity = usePhiSignalIdentity();
  const emitSignal = usePhiSignalEmitter(signalIdentity.sender);
  const emitRoutes = useMemo(() => config.signalRoutes?.emits ?? [], [config.signalRoutes?.emits]);
  const listenRoutes = useMemo(() => config.signalRoutes?.listens ?? [], [config.signalRoutes?.listens]);
  const emitCapability = useCallback((capabilityId: string, value: PhiSignalValue) => {
    for (const route of findPhiSignalRoutesByCapabilityId(emitRoutes, capabilityId)) {
      if (route.receiver == null || route.valueType === "json" && !route.valueSchema) continue;
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
  const source = useMemo(() => config.source ? { ...config.source, params: bindingParams } : null, [bindingParams, config.source]);
  const binding = usePhiTreeBinding({
    source,
    initialQuery: config.initialQuery,
    defaultExpandAll: config.features.expansion?.defaultExpandAll,
    defaultExpandedNodeIdentities: config.features.expansion?.defaultExpandedNodeIdentities,
  });
  const tools = config.features.tools;
  const selfContained = tools?.mode !== "external";
  const dndMode = config.features.dnd?.mode ?? "none";
  const canSourceDrag = dndMode === "source" || dndMode === "source-reorder";
  const canReorder = dndMode === "reorder" || dndMode === "source-reorder";
  const dragSource = config.features.dnd?.payloadType
    ? binding.resource?.dragSources?.find((candidate) => candidate.payloadType === config.features.dnd?.payloadType)
    : binding.resource?.dragSources?.[0];
  const controlSize = config.presentation.controlSize ?? "small";
  const resetTools = useCallback(() => {
    const nextParams = { ...(config.source?.params ?? {}) };
    setBindingParams(nextParams);
    setSearchDraft(config.initialQuery?.search ?? "");
    binding.setQuery({ ...(config.initialQuery ?? {}) });
    emitCapability("bindingParamsChange", { params: nextParams });
  }, [binding, config.initialQuery, config.source?.params, emitCapability]);
  const contractError = binding.resource ? validatePhiTreeWidgetBinding(config, binding.resource)[0] ?? null : null;
  const treeQuery = binding.query;
  const setTreeQuery = binding.setQuery;
  const activate = useCallback((action: PhiTreeActionDefinition, identity?: PhiTreeNodeIdentity | null) => {
    if (action.execution === "signal") {
      emitCapability("actionActivate", {
        actionKey: action.key,
        nodeIdentity: identity ?? null,
        selectedNodeIdentities: binding.selectedNodeIdentities,
      });
    } else if (action.execution === "provider") {
      void binding.executeAction(action.key, identity).then((result) => {
        emitCapability("mutationChange", result as unknown as Record<string, unknown>);
      }).catch(() => undefined);
    }
  }, [binding, emitCapability]);

  usePhiSignalListener(useCallback((signal) => {
    const route = listenRoutes.find((candidate) => candidate.receiver !== null &&
      candidate.channel === signal.channel && candidate.action === signal.action &&
      candidate.valueType === signal.valueType &&
      (candidate.valueType !== "json" || candidate.valueSchema === signal.valueSchema));
    if (!route || signal.receiver !== "broadcast" && signal.receiver !== signalIdentity.receiver) return;
    if (route.capabilityId === "searchChange" && typeof signal.value === "string") {
      setSearchDraft(signal.value);
      binding.setQuery({ ...binding.query, search: signal.value });
    } else if (route.capabilityId === "searchClear") {
      setSearchDraft("");
      binding.setQuery({ ...binding.query, search: "" });
    } else if (route.capabilityId === "reload") {
      binding.reload();
    } else if (route.capabilityId === "bindingParamsChange" && signal.value && typeof signal.value === "object" && !Array.isArray(signal.value)) {
      const params = (signal.value as Record<string, unknown>).params;
      if (params && typeof params === "object" && !Array.isArray(params)) {
        setBindingParams((current) => ({ ...current, ...params as Record<string, unknown> }));
      }
    } else if (route.capabilityId === "selectionChange" && Array.isArray(signal.value)) {
      binding.setSelectedNodeIdentities(signal.value.filter((value): value is string => typeof value === "string"));
    } else if (route.capabilityId === "checkingChange" && Array.isArray(signal.value)) {
      binding.setCheckedNodeIdentities(signal.value.filter((value): value is string => typeof value === "string"));
    } else if (route.capabilityId === "expansionChange" && Array.isArray(signal.value)) {
      binding.setExpandedNodeIdentities(signal.value.filter((value): value is string => typeof value === "string"));
    } else if (route.capabilityId === "actionActivate" && signal.value && typeof signal.value === "object" && !Array.isArray(signal.value)) {
      const request = signal.value as Record<string, unknown>;
      const action = [...(config.features.actions?.toolbar ?? []), ...(config.features.actions?.node ?? []), ...(config.features.actions?.selection ?? [])]
        .find((candidate) => candidate.key === request.actionKey);
      if (action) activate(action, typeof request.nodeIdentity === "string" || typeof request.nodeIdentity === "number" ? request.nodeIdentity : null);
    }
  }, [activate, binding, config.features.actions, listenRoutes, signalIdentity.receiver]), useMemo(() => {
    if (!listenRoutes.length) return null;
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
    emitCapability("stateChange", {
      loading: binding.loading,
      errorCode: binding.error?.code ?? null,
      query: binding.query,
      bindingParams,
      selectedNodeIdentities: binding.selectedNodeIdentities,
      checkedNodeIdentities: binding.checkedNodeIdentities,
      expandedNodeIdentities: binding.expandedNodeIdentities,
    });
  }, [binding.checkedNodeIdentities, binding.error?.code, binding.expandedNodeIdentities, binding.loading, binding.query, binding.selectedNodeIdentities, bindingParams, emitCapability]);

  useEffect(() => {
    if (config.features.search?.enabled !== true || treeQuery.search === searchDraft) return undefined;
    const timer = window.setTimeout(() => {
      setTreeQuery({ ...treeQuery, search: searchDraft });
    }, config.features.search.debounceMs ?? 250);
    return () => window.clearTimeout(timer);
  }, [config.features.search?.debounceMs, config.features.search?.enabled, searchDraft, setTreeQuery, treeQuery]);

  const hasQueryControls = selfContained && (
    (tools?.bindingFields?.length ?? 0) > 0 || config.features.search?.enabled === true
  );
  const queryControls = hasQueryControls ? (
    <>
      {(tools?.bindingFields ?? []).flatMap((tool) => {
        const field = binding.resource?.bindingFields?.find((candidate) => candidate.key === tool.key);
        if (!field) return [];
        return [(
          <TreeBindingTool
            key={tool.key}
            field={field}
            label={tool.label}
            placeholder={tool.placeholder}
            presentation={tool.control === "autocomplete" ? "autocomplete" : "select"}
            width={tool.width}
            sourceConfig={bindingParams}
            controlSize={controlSize}
            value={bindingParams[tool.key] ?? field.defaultValue}
            onChange={(value) => {
              setBindingParams((current) => ({ ...current, [tool.key]: value }));
              emitCapability("bindingParamsChange", { params: { ...bindingParams, [tool.key]: value } });
            }}
          />
        )];
      })}
      {config.features.search?.enabled ? (
        <div style={{ flex: "1 1 10rem", minWidth: "10rem" }}>
          <PhiTextControl
            inputType="search"
            value={searchDraft}
            placeholder={config.features.search.placeholder ?? labels.search}
            size={controlSize}
            onChange={(value) => setSearchDraft(value ?? "")}
            style={{ width: "100%" }}
          />
        </div>
      ) : null}
    </>
  ) : null;
  const hasResettableQuery = config.features.search?.enabled === true || (tools?.bindingFields?.length ?? 0) > 0;
  const toolbar = selfContained && (
    (config.features.actions?.selection?.length ?? 0) > 0 ||
    (config.features.actions?.toolbar?.length ?? 0) > 0 ||
    hasResettableQuery && tools?.reset !== false ||
    tools?.reload === true
  ) ? (
    <PhiToolbarControl size={controlSize} compact>
      {(config.features.actions?.toolbar ?? []).map((action) => (
        <PhiTreeActionButton key={action.key} action={action} size={controlSize} onActivate={() => activate(action)} />
      ))}
      {(config.features.actions?.selection ?? []).map((action) => (
        <PhiTreeActionButton
          key={action.key}
          action={action}
          size={controlSize}
          disabled={binding.selectedNodeIdentities.length === 0}
          onActivate={() => activate(action)}
        />
      ))}
      {hasResettableQuery && tools?.reset !== false ? (
        <PhiButtonControl icon={<UndoOutlined />} ariaLabel={labels.reset} size={controlSize} onClick={resetTools} />
      ) : null}
      {tools?.reload ? (
        <PhiButtonControl icon={<ReloadOutlined />} ariaLabel={labels.reload} tooltip={labels.reload}
          size={controlSize} onClick={binding.reload} />
      ) : null}
    </PhiToolbarControl>
  ) : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: token.paddingSM,
        width: config.presentation.width ?? "100%",
        minWidth: config.presentation.minWidth,
        maxWidth: config.presentation.maxWidth,
      }}
    >
      <PhiCollectionHeaderControl
        title={config.presentation.title}
        description={config.presentation.description}
        filters={queryControls}
        toolbar={toolbar}
      />
      {binding.bindingError || binding.error || contractError ? (
        <PhiAlertControl
          level="error"
          title={binding.bindingError ?? binding.error?.message ?? contractError ?? undefined}
        />
      ) : null}
      {!binding.loading && !binding.bindingError && !binding.error && !contractError && binding.nodes.length === 0 ? (
        <Typography.Text type="secondary">{labels.empty}</Typography.Text>
      ) : null}
      <PhiTreeControl
        nodes={binding.nodes}
        nodeIdentityPath={binding.resource?.nodeIdentityPath ?? "id"}
        parentNodeIdentityPath={binding.resource?.parentNodeIdentityPath ?? "parentId"}
        presentation={config.presentation}
        loading={binding.loading}
        controlSize={controlSize}
        selectionMode={config.features.selection?.mode}
        selectedNodeIdentities={binding.selectedNodeIdentities}
        checkedNodeIdentities={binding.checkedNodeIdentities}
        checking={config.features.checking?.enabled}
        checkStrictly={config.features.checking?.strict}
        expandedNodeIdentities={binding.expandedNodeIdentities}
        editing={config.features.editing?.enabled}
        nodeActions={config.features.actions?.node}
        draggable={canSourceDrag || canReorder}
        onSelectionChange={(identities) => {
          binding.setSelectedNodeIdentities(identities);
          emitCapability("selectionChange", identities.map(String));
        }}
        onCheckingChange={(identities) => {
          binding.setCheckedNodeIdentities(identities);
          emitCapability("checkingChange", identities.map(String));
        }}
        onExpansionChange={(identities) => {
          binding.setExpandedNodeIdentities(identities);
          emitCapability("expansionChange", identities.map(String));
        }}
        onCommitField={(...args) => binding.commitField(...args).then((result) => {
          emitCapability("mutationChange", result as unknown as Record<string, unknown>);
        })}
        onAction={activate}
        onExternalDragOver={binding.resource?.dropTargets?.length ? (request) => {
          const payload = readPhiDataDragPayload(request.event.dataTransfer);
          return Boolean(payload && binding.resource?.dropTargets?.some((target) =>
            target.payloadType === payload.payloadType && (!target.modes || target.modes.includes(request.dropMode))));
        } : undefined}
        onExternalDrop={binding.resource?.dropTargets?.length ? (request) => {
          const payload = readPhiDataDragPayload(request.event.dataTransfer);
          if (!payload || !binding.resource?.dropTargets?.some((target) =>
            target.payloadType === payload.payloadType && (!target.modes || target.modes.includes(request.dropMode)))) return;
          void binding.drop({
            ...payload,
            dropMode: request.dropMode,
            targetParentNodeIdentity: request.targetParentNodeIdentity,
            beforeNodeIdentity: request.beforeNodeIdentity,
            afterNodeIdentity: request.afterNodeIdentity,
          }).catch(() => undefined).finally(clearPhiDataDragPayload);
        } : undefined}
        onDragStart={canSourceDrag || canReorder ? (identity, event) => {
          startPhiDataDragAutoScroll();
          if (!canSourceDrag || !dragSource) return;
          const node = binding.nodes.find((candidate) => String(readPath(candidate, binding.resource!.nodeIdentityPath)) === String(identity));
          const sourceObjectIdentity = node ? readPath(node, dragSource.sourceObjectIdentityPath) : null;
          if (typeof sourceObjectIdentity !== "string" || !sourceObjectIdentity) return;
          event.dataTransfer.effectAllowed = canReorder ? "copyMove" : "copy";
          writePhiDataDragPayload(event.dataTransfer, { payloadType: dragSource.payloadType, sourceObjectIdentity });
        } : undefined}
        onDragEnd={canSourceDrag || canReorder ? () => clearPhiDataDragPayload() : undefined}
        onDrop={canReorder && binding.resource?.nodeOrdering === "tree" ? (request) => {
          void binding.moveNode(request).catch(() => undefined);
        } : undefined}
      />
    </div>
  );
}
