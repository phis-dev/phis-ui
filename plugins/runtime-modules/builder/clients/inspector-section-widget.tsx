"use client";

import { useCallback, useMemo } from "react";
import type { PhiBackgroundControlProps } from "../../../../components/controls/phi-background-control";
import { PhiMediaPickerBinding } from "../../../../components/media/phi-media-picker-binding";
import { PHI_MEDIA_WIDGET_DEFAULT_LABELS } from "../../../../components/media/media-widget-labels";
import { PHI_SEARCH_WIDGET_DEFAULT_LABELS } from "../../../../components/widgets/label-types/search";
import { PhiMediaAssetFlags, PhiMediaKind } from "../../../../constants/media";

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
import type { PhiIconPickerControlLabels } from "../../../../components/widgets/label-types/icon-picker";
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
  PhiDeveloperBuilderStructureNodeDraft,
} from "../developer-workspace-types";
import { isPhiBuilderPageScopedRegion } from "../region-keys";
import { PhiDeveloperBuilderRegionInspectorWidgetClient } from "./region-inspector";
import { PhiDeveloperBuilderLayoutInspectorWidgetClient } from "./layout-inspector";
import { PhiDeveloperBuilderWidgetInspectorWidgetClient } from "./widget-inspector";
import type { PhiInspectorSurfaceLabels } from "./inspector-surface-labels";
import type { PhiInspectorWidgetLabels } from "../../../../components/widgets/label-types/inspector";
import type { PhiInspectorWidgetReferenceOption } from "./inspector-config-field";
import type { PhiRenderableBlockAnchor } from "../../../../types";
import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode } from "../../../../types/cms";
import { readPhiSurface } from "../../../../types/surface";
import type { PhiCmsGeometryWidgetConfig } from "../../../../components/widgets/config/geometry";
import { normalizePhiPaddingWidgetConfig } from "../../../../types/cms-config";
import {
  usePhiBuilderModuleMetas,
} from "../plugin-meta-store";
import {
  findPhiBuilderLayoutNodeById,
  findPhiBuilderWidgetNodeByIdInLayouts,
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

    collectWidgetReferenceOptionsFromLayouts(draft.rootNode ? [draft.rootNode] : [], options);
  }

  return options;
}

/**
 * The Inspector's view of a Layout node -- the Region's root Layout or one nested in it, read the same
 * way: its config over its Layout's defaults, and what the Inspector reads off that config.
 */
function resolveDraftFromLayoutNode(
  node: PhiCmsLayoutRenderNode | null,
  meta?: PhiBuilderContainerMeta | null,
): PhiDeveloperBuilderStructureNodeDraft | null {
  if (!node) {
    return null;
  }

  const config: Record<string, unknown> = {
    ...(meta?.defaultConfig ?? {}),
    ...(node.config ?? {}),
  };

  return {
    node,
    config,
    // A stored placement name is taken as it is; only an anchor object is resolved.
    anchor:
      (typeof config.anchor === "string" && isPhiAnchorWidgetPlacement(config.anchor)
        ? config.anchor
        : resolvePhiAnchorPlacement(config.anchor as PhiRenderableBlockAnchor | null | undefined)) ?? null,
    padding: normalizePhiPaddingWidgetConfig(config),
    surface: readPhiSurface(config.surface),
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
  surfaceLabels?: PhiInspectorSurfaceLabels;
  gridLabels?: PhiInspectorWidgetLabels["grid"];
  colorPickerLabels?: PhiColorPickerLabels;
  iconPickerLabels?: PhiIconPickerControlLabels;
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
  const activeVideoProviderDescriptors = activeModuleMetas.videoProviders;
  /*
   * Every Inspector section runs this hook, so what it works out per render is worked out fifteen
   * times. The lookups and the two tree searches are kept until the drafts or the selection move; the
   * draft map itself is still subscribed to as a whole, because the reference options below read every
   * draft of the page.
   */
  const regionDrafts = usePhiDeveloperRegionDrafts();
  const selectedRegionKey =
    nodeKind === "region" ? nodeKey.replace(/^region:/, "") : null;
  const currentRegionDraft = useMemo(
    () => selectedRegionKey ? resolveRegionDraftKey(regionDrafts, area, selectedRegionKey, pageKey) : null,
    [area, pageKey, regionDrafts, selectedRegionKey],
  );
  const selectedRootDraft = useMemo(
    () => selectedRootRegionKey ? resolveRegionDraftKey(regionDrafts, area, selectedRootRegionKey, pageKey) : null,
    [area, pageKey, regionDrafts, selectedRootRegionKey],
  );
  // The root Layout is found like every Layout below it.
  const { selectedLayoutNode, selectedWidgetNode } = useMemo(() => {
    const selectedRootLayouts = selectedRootDraft?.rootNode ? [selectedRootDraft.rootNode] : [];
    return {
      selectedLayoutNode:
        nodeKind === "layout" && nodeId != null ? findPhiBuilderLayoutNodeById(selectedRootLayouts, nodeId) : null,
      selectedWidgetNode:
        nodeId != null ? findPhiBuilderWidgetNodeByIdInLayouts(selectedRootLayouts, nodeId) : null,
    };
  }, [nodeId, nodeKind, selectedRootDraft]);
  /*
   * Which plugin the selection is, asked in the order that can only answer about the selection itself.
   *
   * Only the selected node's own type answers. Reaching for another block's type whenever the
   * selection was not found in the draft answers with a DIFFERENT block: the Inspector then read its
   * fields off the root -- a Content wrapper declares nothing but padding -- and the Settings panel,
   * which hides itself when a layout declares no settings, hid for every layout on the page. So a node
   * not found falls back to `nodeKey`, which is what `PhiInspectorTitle` matches on as well.
   */
  const selectedStructureTypeKey =
    nodeKind === "widget"
      ? selectedWidgetNode?.widgetType ?? nodeKey
      : nodeKind === "layout"
        ? selectedLayoutNode?.widgetType ?? nodeKey
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
  const selectedStructureDraft = resolveDraftFromLayoutNode(
    selectedLayoutNode,
    selectedStructurePlugin?.kind !== "widget" ? selectedStructurePlugin : null,
  );
  const widgetReferenceOptions = useMemo(
    () => collectWidgetReferenceOptionsFromDrafts(regionDrafts, area, pageKey),
    [area, pageKey, regionDrafts],
  );
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
        presentationFlags: PhiMediaAssetFlags.Background,
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
    activeVideoProviderDescriptors,
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
  surfaceLabels,
  colorPickerLabels,
}: PhiBuilderInspectorSectionWidgetClientProps) {
  const state = usePhiBuilderInspectorSectionState(signalRoutes);
  return <PhiDeveloperBuilderRegionInspectorWidgetClient surfaceLabels={surfaceLabels} section={section} builderMode={state.builderMode} selectedStructureNodeKey={state.nodeKey} selectedStructureNodeKind={state.nodeKind} selectedRegionKey={state.selectedRegionKey} selectedRootRegionKey={state.selectedRootRegionKey} currentDraft={state.currentRegionDraft} onDraftChange={(patch) => state.emitInspectorControllerAction({ kind: "patchSelectedRegionDraft", patch })} geometryLabels={geometryLabels} backgroundLabels={backgroundLabels} borderLabels={borderLabels} colorPickerLabels={colorPickerLabels} paddingLabels={paddingLabels} renderMediaPicker={state.renderBackgroundMediaPicker} />;
}

export function PhiBuilderLayoutInspectorSectionWidgetClient({
  section,
  signalRoutes,
  signalsLabels,
  paddingLabels,
  backgroundLabels,
  borderLabels,
  surfaceLabels,
  gridLabels,
  colorPickerLabels,
  iconPickerLabels,
}: PhiBuilderInspectorSectionWidgetClientProps) {
  const state = usePhiBuilderInspectorSectionState(signalRoutes);
  return <PhiDeveloperBuilderLayoutInspectorWidgetClient surfaceLabels={surfaceLabels} gridLabels={gridLabels} section={section} builderMode={state.builderMode} selectedStructureNodeKind={state.nodeKind} selectedStructureNodeTitle={state.selectedStructureNodeTitle} selectedStructurePlugin={state.selectedStructurePlugin?.kind !== "widget" ? state.selectedStructurePlugin : null} selectedStructureDefaultConfig={resolvePhiBuilderPluginDefaultConfig(state.selectedStructurePlugin) ?? null} currentDraft={state.selectedStructureDraft} signalRouteScope={state.selectedSignalRouteScope} selectedLayoutAnchor={state.selectedLayoutAnchor} onLayoutAnchorChange={(selectedLayoutAnchor) => state.emitInspectorControllerAction({ kind: "patchSelectedLayoutAnchor", selectedLayoutAnchor })} onPaddingChange={(padding) => state.emitInspectorControllerAction({ kind: "patchSelectedLayoutPadding", padding })} onSurfaceChange={(surface) => state.emitInspectorControllerAction({ kind: "patchSelectedLayoutSurface", surface })} onConfigChange={(key, value) => state.emitInspectorControllerAction({ kind: "patchSelectedLayoutConfig", key, value: value ?? undefined })} borderLabels={borderLabels} paddingLabels={paddingLabels} backgroundLabels={backgroundLabels} signalsLabels={signalsLabels} colorPickerLabels={colorPickerLabels} iconPickerLabels={iconPickerLabels} dataProviderDescriptors={state.activeDataProviderDescriptors} calendarAdapterDescriptors={state.activeCalendarAdapterDescriptors} videoProviderDescriptors={state.activeVideoProviderDescriptors} renderMediaPicker={state.renderBackgroundMediaPicker} />;
}

export function PhiBuilderWidgetInspectorSectionWidgetClient({
  section,
  signalRoutes,
  geometryLabels,
  surfaceLabels,
  backgroundLabels,
  borderLabels,
  signalsLabels,
  colorPickerLabels,
  iconPickerLabels,
}: PhiBuilderInspectorSectionWidgetClientProps) {
  const state = usePhiBuilderInspectorSectionState(signalRoutes);
  return <PhiDeveloperBuilderWidgetInspectorWidgetClient surfaceLabels={surfaceLabels} backgroundLabels={backgroundLabels} borderLabels={borderLabels} renderMediaPicker={state.renderBackgroundMediaPicker} onSurfaceChange={(surface) => state.emitInspectorControllerAction({ kind: "patchSelectedWidgetSurface", surface })} section={section} builderMode={state.builderMode} selectedStructureNodeKey={state.nodeKey} selectedStructureNodeKind={state.nodeKind} selectedStructureNodeTitle={state.selectedStructureNodeTitle} selectedStructureWidgetMeta={state.selectedStructurePlugin?.kind === "widget" ? state.selectedStructurePlugin : null} currentDraft={state.selectedWidgetNode} widgetReferenceOptions={state.widgetReferenceOptions} signalRouteScope={state.selectedSignalRouteScope} onConfigChange={(nextConfig) => state.emitInspectorControllerAction({ kind: "patchSelectedWidgetConfig", patch: nextConfig })} geometryLabels={geometryLabels} signalsLabels={signalsLabels} colorPickerLabels={colorPickerLabels} iconPickerLabels={iconPickerLabels} dataProviderDescriptors={state.activeDataProviderDescriptors} calendarAdapterDescriptors={state.activeCalendarAdapterDescriptors} videoProviderDescriptors={state.activeVideoProviderDescriptors} onGeometryChange={(geometry: PhiCmsGeometryWidgetConfig) => state.emitInspectorControllerAction({ kind: "patchSelectedWidgetGeometry", geometry })} onTranslateChange={(translate) => state.emitInspectorControllerAction({ kind: "setSelectedWidgetTranslate", translate })} />;
}
