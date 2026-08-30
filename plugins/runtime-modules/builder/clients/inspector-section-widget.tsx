"use client";

import { useCallback } from "react";
import type { PhiBackgroundControlProps } from "../../../../components/controls/phi-background-control";
import { PhiMediaPickerBinding } from "../../../../components/media/phi-media-picker-binding";
import { PHI_MEDIA_WIDGET_DEFAULT_LABELS } from "../../../../components/media/media-widget-labels";
import { PHI_SEARCH_WIDGET_DEFAULT_LABELS } from "../../../../components/widgets/label-types/search";
import { PhiMediaKind } from "../../../../constants/media";

import type { PhiBuilderContainerMeta } from "../../../../types/builder";
import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  type PhiSignalRouteSet,
  type PhiSignalScope,
} from "../../../../types/signals";
import {
  resolvePhiBuilderPluginDefaultConfig,
} from "../plugin-metas";
import type { PhiBackgroundWidgetLabels } from "../../../../components/widgets/label-types/background";
import type { PhiBorderWidgetLabels } from "../../../../components/widgets/label-types/border";
import type { PhiGeometryWidgetLabels } from "../../../../components/widgets/label-types/geometry";
import type { PhiPaddingWidgetLabels } from "../../../../components/widgets/label-types/padding";
import type { PhiColorPickerLabels } from "../../../../components/widgets/label-types/color-picker";
import type { PhiSignalsWidgetLabels } from "../../../../components/widgets/label-types/signals";
import {
  isPhiAnchorWidgetPlacement,
  resolvePhiAnchorWidgetPlacement as resolvePhiAnchorPlacement,
} from "../../../../components/controls/phi-anchor-control-contract";
import {
  usePhiSignalDispatcher,
} from "../../../../components/runtime/runtime-signal-bus";
import { resolveRegionDraftKey } from "../developer-region-drafts";
import {
  usePhiDeveloperBuilderStateValue,
  usePhiDeveloperRegionDrafts,
} from "../developer-workspace-store";
import type {
  PhiDeveloperBuilderRegionDraft,
} from "../developer-workspace-types";
import { isPhiBuilderPageScopedRegion } from "../region-keys";
import { PhiDeveloperBuilderRegionInspectorWidgetClient } from "./region-inspector";
import { PhiDeveloperBuilderLayoutInspectorWidgetClient } from "./layout-inspector";
import { PhiDeveloperBuilderWidgetInspectorWidgetClient } from "./widget-inspector";
import type { PhiInspectorWidgetReferenceOption } from "./inspector-config-field";
import type { PhiRenderableBlockAnchor } from "../../../../types";
import { readPhiShadow } from "../../../../types/layout-style";
import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode } from "../../../../types/cms";
import type {
  PhiCmsBorderWidgetConfig,
  PhiCmsPaddingWidgetConfig,
} from "../../../../types/cms-config";
import type { PhiCmsBackgroundWidgetConfig } from "../../../../components/widgets/config/background";
import type { PhiCmsGeometryWidgetConfig } from "../../../../components/widgets/config/geometry";
import { mergePhiCmsConfigValues } from "../../../../types/cms-config";
import { normalizePhiPaddingWidgetConfig } from "../../../../types/cms-config";
import {
  resolvePhiBuilderRootNodeDefaultsFromConfig,
} from "../root-node-normalization";
import {
  usePhiBuilderModuleMetas,
} from "../plugin-meta-store";
import {
  findPhiBuilderLayoutNodeById,
  findPhiBuilderWidgetNodeByIdInLayouts,
  findPhiBuilderWidgetNodeByIdInWidgets,
} from "../node-finders";
import { createPhiMediaPickerAssetControllerRoutes } from "../../../../components/media/asset-controller-routes";

const PHI_BUILDER_BACKGROUND_MEDIA_ROUTES = {
  preview: createPhiMediaPickerAssetControllerRoutes("builder-background-preview-media", "area"),
  field: createPhiMediaPickerAssetControllerRoutes("builder-background-field-media", "area"),
} as const;

function collectWidgetReferenceOptionsFromWidgets(
  widgets: PhiCmsContentWidgetNode[] | undefined,
  options: PhiInspectorWidgetReferenceOption[],
) {
  for (const widget of widgets ?? []) {
    options.push({
      value: String(widget.id),
      label: widget.label?.trim() || `Widget ${widget.id}`,
      widgetType: widget.widgetType,
    });
  }
}

function collectWidgetReferenceOptionsFromLayouts(
  layouts: PhiCmsLayoutRenderNode[] | undefined,
  options: PhiInspectorWidgetReferenceOption[],
) {
  for (const layout of layouts ?? []) {
    collectWidgetReferenceOptionsFromWidgets(layout.childWidgets, options);
    collectWidgetReferenceOptionsFromLayouts(layout.childLayouts, options);
  }
}

function collectWidgetReferenceOptionsFromDrafts(
  drafts: Record<string, PhiDeveloperBuilderRegionDraft>,
  area: string,
  pageKey: string,
) {
  const options: PhiInspectorWidgetReferenceOption[] = [];
  const draftKeyPrefix = `${area}:`;
  const pageDraftKeySegment = `:${pageKey}:`;

  for (const [draftKey, draft] of Object.entries(drafts)) {
    if (!draftKey.startsWith(draftKeyPrefix) || !draftKey.includes(pageDraftKeySegment)) {
      continue;
    }

    if (draft.rootNodeKind === "widget" && draft.rootNodeId != null && draft.rootNodeTypeKey) {
      options.push({
        value: String(draft.rootNodeId),
        label: draft.rootNodeTitle?.trim() || `Widget ${draft.rootNodeId}`,
        widgetType: draft.rootNodeTypeKey,
      });
    }
    collectWidgetReferenceOptionsFromWidgets(draft.rootNodeChildWidgets, options);
    collectWidgetReferenceOptionsFromLayouts(draft.rootNodeChildLayouts, options);
  }

  return options;
}

function resolveDraftFromLayoutNode(
  node: PhiCmsLayoutRenderNode | null,
  meta?: PhiBuilderContainerMeta | null,
): PhiDeveloperBuilderRegionDraft | null {
  if (!node) {
    return null;
  }

  const parsedConfig = {
    ...(meta?.defaultConfig ?? {}),
    ...(node.config ?? {}),
  };
  const rootNodeDefaults = resolvePhiBuilderRootNodeDefaultsFromConfig(parsedConfig);

  return {
    ...(parsedConfig as Record<string, unknown>),
    rootNodeId: node.id,
    rootNodeTypeKey: node.widgetType,
    rootNodeKind: "layout",
    rootNodeTitle: node.label,
    background: {
      base: {
        kind: "color",
        color: "#ffffff",
      },
      overlay: null,
      effect: null,
    },
    rootNodePadding: mergePhiCmsConfigValues<PhiCmsPaddingWidgetConfig>(
      rootNodeDefaults.rootNodePadding,
      normalizePhiPaddingWidgetConfig(parsedConfig),
    ),
    rootNodeAnchor:
      (typeof parsedConfig.anchor === "string" && isPhiAnchorWidgetPlacement(parsedConfig.anchor)
        ? parsedConfig.anchor
        : resolvePhiAnchorPlacement(parsedConfig.anchor as PhiRenderableBlockAnchor | null | undefined)) ?? null,
    rootNodeBackground:
      typeof parsedConfig.background === "object" && parsedConfig.background != null
        ? (parsedConfig.background as PhiCmsBackgroundWidgetConfig)
        : rootNodeDefaults.rootNodeBackground,
    rootNodeBorder:
      typeof parsedConfig.border === "object" && parsedConfig.border != null
        ? (parsedConfig.border as PhiCmsBorderWidgetConfig)
        : rootNodeDefaults.rootNodeBorder,
    rootNodeShadow: readPhiShadow(parsedConfig.rootNodeShadow) ?? null,
  };
}

function resolveDraftFromRootNodeDraft(
  draft: PhiDeveloperBuilderRegionDraft | null,
  meta?: PhiBuilderContainerMeta | null,
): PhiDeveloperBuilderRegionDraft | null {
  if (!draft) {
    return null;
  }

  const parsedRootConfig = {
    ...(meta?.defaultConfig ?? {}),
    ...(draft.rootNodeConfig ?? (draft as Record<string, unknown>)),
  };
  const rootNodeDefaults = resolvePhiBuilderRootNodeDefaultsFromConfig(parsedRootConfig);

  return {
    ...(parsedRootConfig as Record<string, unknown>),
    ...(draft.rootNodeGeometry ?? {}),
    rootNodeId: draft.rootNodeId ?? null,
    rootNodeTypeKey: draft.rootNodeTypeKey ?? null,
    rootNodeKind: draft.rootNodeKind ?? null,
    rootNodeTitle: draft.rootNodeTitle ?? null,
    background: {
      base: {
        kind: "color",
        color: "#ffffff",
      },
      overlay: null,
      effect: null,
    },
    rootNodeAnchor:
      draft.rootNodeAnchor ??
      resolvePhiAnchorPlacement(parsedRootConfig.anchor as PhiRenderableBlockAnchor | null | undefined) ??
      null,
    rootNodePadding: mergePhiCmsConfigValues<PhiCmsPaddingWidgetConfig>(
      rootNodeDefaults.rootNodePadding,
      draft.rootNodePadding ?? normalizePhiPaddingWidgetConfig(parsedRootConfig),
    ),
    rootNodeBackground:
      draft.rootNodeBackground ??
      (typeof parsedRootConfig.background === "object" && parsedRootConfig.background != null
        ? (parsedRootConfig.background as PhiCmsBackgroundWidgetConfig)
        : rootNodeDefaults.rootNodeBackground),
    rootNodeBorder:
      draft.rootNodeBorder ??
      (typeof parsedRootConfig.border === "object" && parsedRootConfig.border != null
        ? (parsedRootConfig.border as PhiCmsBorderWidgetConfig)
        : rootNodeDefaults.rootNodeBorder),
    rootNodeShadow:
      draft.rootNodeShadow ??
      readPhiShadow(parsedRootConfig.rootNodeShadow) ?? null,
  };
}

type PhiBuilderInspectorSectionWidgetClientProps = {
  section?: string;
  signalRoutes?: PhiSignalRouteSet;
  geometryLabels?: PhiGeometryWidgetLabels;
  signalsLabels?: PhiSignalsWidgetLabels;
  paddingLabels?: PhiPaddingWidgetLabels;
  backgroundLabels?: PhiBackgroundWidgetLabels;
  borderLabels?: PhiBorderWidgetLabels;
  colorPickerLabels?: PhiColorPickerLabels;
};

function usePhiBuilderInspectorSectionState(signalRoutes?: PhiSignalRouteSet) {
  const dispatchSignal = usePhiSignalDispatcher();
  const area = usePhiDeveloperBuilderStateValue("public", (state) => state.area);
  const pageKey = usePhiDeveloperBuilderStateValue("public", (state) => state.pageKey);
  const builderMode = usePhiDeveloperBuilderStateValue("public", (state) => state.builderMode);
  const nodeId = usePhiDeveloperBuilderStateValue("public", (state) => state.nodeId);
  const nodeKey = usePhiDeveloperBuilderStateValue("public", (state) => state.nodeKey);
  const nodeKind = usePhiDeveloperBuilderStateValue("public", (state) => state.nodeKind);
  const selectedLayoutAnchor = usePhiDeveloperBuilderStateValue(
    "public",
    (state) => state.selectedLayoutAnchor,
  );
  const selectedRootRegionKey = usePhiDeveloperBuilderStateValue(
    "public",
    (state) => state.selectedRootRegionKey,
  );
  const activeModuleMetas = usePhiBuilderModuleMetas(area);
  const activeBuilderPlugins = activeModuleMetas.plugins;
  const activeDataProviderDescriptors = activeModuleMetas.dataProviders;
  const activeCalendarAdapterDescriptors = activeModuleMetas.calendarAdapters;
  const regionDrafts = usePhiDeveloperRegionDrafts();
  const selectedRegionKey =
    nodeKind === "region" ? nodeKey.replace(/^region:/, "") : null;
  const currentRegionDraft = selectedRegionKey
    ? resolveRegionDraftKey(regionDrafts, area, selectedRegionKey, pageKey)
    : null;
  const selectedRootDraft = selectedRootRegionKey
    ? resolveRegionDraftKey(regionDrafts, area, selectedRootRegionKey, pageKey)
    : null;
  const selectedRootNodeId = selectedRootDraft?.rootNodeId ?? null;
  const selectedNestedLayoutNode =
    selectedRootDraft && nodeId != null && nodeId !== selectedRootNodeId
      ? findPhiBuilderLayoutNodeById(selectedRootDraft.rootNodeChildLayouts ?? [], nodeId)
      : null;
  const selectedWidgetNode =
    selectedRootDraft && nodeId != null
      ? findPhiBuilderWidgetNodeByIdInWidgets(selectedRootDraft.rootNodeChildWidgets ?? [], nodeId) ??
        findPhiBuilderWidgetNodeByIdInLayouts(selectedRootDraft.rootNodeChildLayouts ?? [], nodeId)
      : null;
  const selectedStructureTypeKey =
    nodeKind === "widget"
      ? selectedWidgetNode?.widgetType ?? nodeKey
      : nodeKind === "layout"
        ? selectedNestedLayoutNode?.widgetType ?? selectedRootDraft?.rootNodeTypeKey ?? nodeKey
        : nodeKey;
  const selectedStructurePlugin = activeBuilderPlugins.find((plugin) =>
    plugin.kind === nodeKind &&
    (plugin.typeKey === selectedStructureTypeKey ||
      `${plugin.pluginKey}/${plugin.typeKey}` === selectedStructureTypeKey)
  );
  const selectedStructureNodeTitle = selectedStructurePlugin?.title ?? null;
  const selectedStructureNodeDefaultAnchor =
    (selectedStructurePlugin && selectedStructurePlugin.kind !== "widget"
      ? resolvePhiAnchorPlacement(
          selectedStructurePlugin.defaultAnchor ??
            selectedStructurePlugin.slots.find((slot) => slot.defaultAnchor != null)?.defaultAnchor ??
            null,
        )
      : null) ?? selectedLayoutAnchor;
  const selectedSignalRouteScope: PhiSignalScope =
    selectedRootRegionKey && isPhiBuilderPageScopedRegion(selectedRootRegionKey) ? "page" : "area";
  const selectedStructureDraft =
    resolveDraftFromLayoutNode(
      selectedNestedLayoutNode,
      selectedStructurePlugin?.kind !== "widget" ? selectedStructurePlugin : null,
    ) ??
    resolveDraftFromRootNodeDraft(
      selectedRootDraft,
      selectedStructurePlugin?.kind !== "widget" ? selectedStructurePlugin : null,
    );
  const widgetReferenceOptions = collectWidgetReferenceOptionsFromDrafts(regionDrafts, area, pageKey);
  const emitInspectorControllerAction = (value: Record<string, unknown>) => {
    const routes = signalRoutes?.emits?.filter((route) => route.capabilityId === "change") ?? [];
    if (routes.length === 0) return;
    for (const route of routes) {
      if (route.receiver == null) continue;
      dispatchSignal({ scope: route.scope, channel: route.channel, action: route.action, value, valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.builderInspector, receiver: route.receiver, timestamp: Date.now() });
    }
  };
  const renderBackgroundMediaPicker = useCallback<NonNullable<PhiBackgroundControlProps["renderMediaPicker"]>>((props) => (
    <PhiMediaPickerBinding
      config={{
        mediaType: PhiMediaKind.Image,
        pageSize: 12,
        showPagination: true,
        showGroupFilter: true,
        showSearchBar: true,
        signalRoutes: PHI_BUILDER_BACKGROUND_MEDIA_ROUTES[props.purpose],
      }}
      labels={PHI_MEDIA_WIDGET_DEFAULT_LABELS}
      searchLabels={PHI_SEARCH_WIDGET_DEFAULT_LABELS}
      value={props.value}
      open={props.open}
      trigger={props.trigger}
      onOpenChange={props.onOpenChange}
      onCommit={props.onCommit}
      onDiscard={props.onDiscard}
      onAssetSelect={props.onAssetSelect}
      onAssetClear={props.onAssetClear}
    />
  ), []);
  return {
    activeCalendarAdapterDescriptors,
    activeDataProviderDescriptors,
    builderMode,
    currentRegionDraft,
    emitInspectorControllerAction,
    nodeKey,
    nodeKind,
    renderBackgroundMediaPicker,
    selectedLayoutAnchor: selectedStructureNodeDefaultAnchor,
    selectedRegionKey,
    selectedRootRegionKey,
    selectedSignalRouteScope,
    selectedStructureDraft,
    selectedStructureNodeTitle,
    selectedStructurePlugin,
    selectedWidgetNode,
    widgetReferenceOptions,
  };
}

export function PhiBuilderRegionInspectorSectionWidgetClient({
  section,
  signalRoutes,
  geometryLabels,
  paddingLabels,
  backgroundLabels,
  borderLabels,
  colorPickerLabels,
}: PhiBuilderInspectorSectionWidgetClientProps) {
  const state = usePhiBuilderInspectorSectionState(signalRoutes);
  return <PhiDeveloperBuilderRegionInspectorWidgetClient section={section} builderMode={state.builderMode} selectedStructureNodeKey={state.nodeKey} selectedStructureNodeKind={state.nodeKind} selectedRegionKey={state.selectedRegionKey} selectedRootRegionKey={state.selectedRootRegionKey} currentDraft={state.currentRegionDraft} onDraftChange={(patch) => state.emitInspectorControllerAction({ kind: "patchSelectedRegionDraft", patch })} geometryLabels={geometryLabels} backgroundLabels={backgroundLabels} borderLabels={borderLabels} colorPickerLabels={colorPickerLabels} paddingLabels={paddingLabels} renderMediaPicker={state.renderBackgroundMediaPicker} />;
}

export function PhiBuilderLayoutInspectorSectionWidgetClient({
  section,
  signalRoutes,
  signalsLabels,
  paddingLabels,
  backgroundLabels,
  borderLabels,
  colorPickerLabels,
}: PhiBuilderInspectorSectionWidgetClientProps) {
  const state = usePhiBuilderInspectorSectionState(signalRoutes);
  return <PhiDeveloperBuilderLayoutInspectorWidgetClient section={section} builderMode={state.builderMode} selectedStructureNodeKind={state.nodeKind} selectedStructureNodeTitle={state.selectedStructureNodeTitle} selectedStructurePlugin={state.selectedStructurePlugin?.kind !== "widget" ? state.selectedStructurePlugin : null} selectedStructureDefaultConfig={resolvePhiBuilderPluginDefaultConfig(state.selectedStructurePlugin) ?? null} currentDraft={state.selectedStructureDraft} currentShadow={state.selectedStructureDraft?.rootNodeShadow ?? null} signalRouteScope={state.selectedSignalRouteScope} selectedLayoutAnchor={state.selectedLayoutAnchor} onLayoutAnchorChange={(selectedLayoutAnchor) => state.emitInspectorControllerAction({ kind: "patchSelectedLayoutAnchor", selectedLayoutAnchor })} onPaddingChange={(padding) => state.emitInspectorControllerAction({ kind: "patchSelectedLayoutPadding", padding })} onBackgroundChange={(background) => state.emitInspectorControllerAction({ kind: "patchSelectedLayoutBackground", background })} onBorderChange={(border) => state.emitInspectorControllerAction({ kind: "patchSelectedLayoutBorder", border })} onShadowChange={(shadow) => state.emitInspectorControllerAction({ kind: "patchSelectedLayoutShadow", shadow })} onConfigChange={(key, value) => state.emitInspectorControllerAction({ kind: "patchSelectedLayoutConfig", key, value: value ?? undefined })} borderLabels={borderLabels} paddingLabels={paddingLabels} backgroundLabels={backgroundLabels} signalsLabels={signalsLabels} colorPickerLabels={colorPickerLabels} dataProviderDescriptors={state.activeDataProviderDescriptors} calendarAdapterDescriptors={state.activeCalendarAdapterDescriptors} renderMediaPicker={state.renderBackgroundMediaPicker} />;
}

export function PhiBuilderWidgetInspectorSectionWidgetClient({
  section,
  signalRoutes,
  geometryLabels,
  signalsLabels,
  colorPickerLabels,
}: PhiBuilderInspectorSectionWidgetClientProps) {
  const state = usePhiBuilderInspectorSectionState(signalRoutes);
  return <PhiDeveloperBuilderWidgetInspectorWidgetClient section={section} builderMode={state.builderMode} selectedStructureNodeKey={state.nodeKey} selectedStructureNodeKind={state.nodeKind} selectedStructureNodeTitle={state.selectedStructureNodeTitle} selectedStructureWidgetMeta={state.selectedStructurePlugin?.kind === "widget" ? state.selectedStructurePlugin : null} currentDraft={state.selectedWidgetNode} widgetReferenceOptions={state.widgetReferenceOptions} signalRouteScope={state.selectedSignalRouteScope} onConfigChange={(nextConfig) => state.emitInspectorControllerAction({ kind: "patchSelectedWidgetConfig", patch: nextConfig })} geometryLabels={geometryLabels} signalsLabels={signalsLabels} colorPickerLabels={colorPickerLabels} dataProviderDescriptors={state.activeDataProviderDescriptors} calendarAdapterDescriptors={state.activeCalendarAdapterDescriptors} onGeometryChange={(geometry: PhiCmsGeometryWidgetConfig) => state.emitInspectorControllerAction({ kind: "patchSelectedWidgetGeometry", geometry })} />;
}
