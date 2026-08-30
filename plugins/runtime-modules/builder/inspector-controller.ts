import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode } from "../../../types/cms";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiCmsPaddingWidgetConfig } from "../../../types/cms-config";
import type { PhiRenderableBlockBase } from "../../../types";
import type { PhiCmsGeometryWidgetConfig } from "../../../components/widgets/config/geometry";
import { normalizePhiViewportFlags } from "../../../types/access";
import type { PhiAnchorWidgetPlacement } from "../../../components/controls/phi-anchor-control-contract";
import type { PhiBuilderInspectorAction } from "./inspector-actions";
import {
  findPhiBuilderLayoutNodeById,
  findPhiBuilderWidgetNodeByIdInLayouts,
  findPhiBuilderWidgetNodeByIdInWidgets,
} from "./node-finders";
import {
  getDefaultRegionDraft,
  resolveRegionDraftKey,
} from "./developer-region-drafts";
import {
  getPhiBuilderRegionDraftKey,
  isPhiBuilderPageScopedRegion,
} from "./region-keys";
import { createPhiBuilderRegionHistoryContext } from "./history";
import {
  builderWorkspaceStore,
  getPhiDeveloperRegionDraftsSnapshot,
  setPhiDeveloperRegionDraft,
  getPhiDeveloperBuilderStateSnapshot,
} from "./developer-workspace-store";
import type {
  PhiDeveloperBuilderArea,
  PhiDeveloperBuilderWorkspaceState,
} from "./developer-workspace-types";

function patchLayoutNodeById(
  nodes: PhiCmsLayoutRenderNode[],
  nodeId: PhiCmsInstanceId,
  patchConfig: (config: Record<string, unknown>) => Record<string, unknown>,
): PhiCmsLayoutRenderNode[] {
  return nodes.map((node) => {
    if (node.id === nodeId) {
      return {
        ...node,
        config: patchConfig(node.config ?? {}),
      };
    }

    return {
      ...node,
      childLayouts: patchLayoutNodeById(node.childLayouts ?? [], nodeId, patchConfig),
    };
  });
}

function patchWidgetNodeById(
  widgets: PhiCmsContentWidgetNode[],
  nodeId: PhiCmsInstanceId,
  patchConfig: (config: Record<string, unknown>) => Record<string, unknown>,
): PhiCmsContentWidgetNode[] {
  return widgets.map((node) => {
    if (node.id === nodeId) {
      return {
        ...node,
        config: patchConfig(node.config ?? {}),
      };
    }

    return node;
  });
}

function patchWidgetNodeByIdInLayouts(
  nodes: PhiCmsLayoutRenderNode[],
  nodeId: PhiCmsInstanceId,
  patchConfig: (config: Record<string, unknown>) => Record<string, unknown>,
): PhiCmsLayoutRenderNode[] {
  return nodes.map((node) => ({
    ...node,
    childLayouts: patchWidgetNodeByIdInLayouts(node.childLayouts ?? [], nodeId, patchConfig),
    childWidgets: patchWidgetNodeById(node.childWidgets ?? [], nodeId, patchConfig),
  }));
}

function resolveWidgetSizeFromGeometry(
  geometry: PhiCmsGeometryWidgetConfig,
): Partial<PhiRenderableBlockBase> {
  return {
    size: geometry.size ?? undefined,
    minSize: geometry.minSize ?? undefined,
    maxSize: geometry.maxSize ?? undefined,
    ...(typeof geometry.zIndex === "number"
      ? { zIndex: geometry.zIndex }
      : {}),
    viewportFlags: normalizePhiViewportFlags(geometry.viewportFlags),
  };
}

function resolvePaddingPatch(padding: PhiCmsPaddingWidgetConfig | null) {
  return padding == null
    ? {
        padding: undefined,
        gap: undefined,
        paddingTop: undefined,
        paddingRight: undefined,
        paddingBottom: undefined,
        paddingLeft: undefined,
      }
    : {
        padding: padding.padding,
        gap: padding.gap,
        paddingTop: padding.paddingTop,
        paddingRight: padding.paddingRight,
        paddingBottom: padding.paddingBottom,
        paddingLeft: padding.paddingLeft,
      };
}

function resolveInspectorHistoryContext(
  state: PhiDeveloperBuilderWorkspaceState,
  regionKey: string,
) {
  return createPhiBuilderRegionHistoryContext({
    area: state.area,
    pageKey: state.pageKey,
    pageScoped: isPhiBuilderPageScopedRegion(regionKey),
  });
}

/**
 * One authoring gesture, one history entry. The field being edited and the node it belongs to are what
 * separate a slider still being dragged from a second, considered edit; the store adds the timing.
 */
function resolveInspectorCoalesceKey(
  state: PhiDeveloperBuilderWorkspaceState,
  draftKey: string,
  field: string,
) {
  return `${draftKey}:${state.nodeId ?? "root"}:${field}`;
}

function patchSelectedWidgetDraftConfig(
  state: PhiDeveloperBuilderWorkspaceState,
  field: string,
  patchConfig: (config: Record<string, unknown>) => Record<string, unknown>,
) {
  if (!state.selectedRootRegionKey || state.nodeId == null) {
    return false;
  }

  const draftKey = getPhiBuilderRegionDraftKey(state.area, state.selectedRootRegionKey, state.pageKey);
  const selectedRootDraft = resolveRegionDraftKey(
    getPhiDeveloperRegionDraftsSnapshot(),
    state.area,
    state.selectedRootRegionKey,
    state.pageKey,
  );
  if (!selectedRootDraft) {
    return false;
  }

  const selectedWidgetNode =
    findPhiBuilderWidgetNodeByIdInWidgets(selectedRootDraft.rootNodeChildWidgets ?? [], state.nodeId) ??
    findPhiBuilderWidgetNodeByIdInLayouts(selectedRootDraft.rootNodeChildLayouts ?? [], state.nodeId);
  if (!selectedWidgetNode) {
    return false;
  }

  setPhiDeveloperRegionDraft(
    draftKey,
    {
      ...selectedRootDraft,
      rootNodeChildWidgets: patchWidgetNodeById(
        selectedRootDraft.rootNodeChildWidgets ?? [],
        state.nodeId,
        patchConfig,
      ),
      rootNodeChildLayouts: patchWidgetNodeByIdInLayouts(
        selectedRootDraft.rootNodeChildLayouts ?? [],
        state.nodeId,
        patchConfig,
      ),
    },
    {
      historyContext: resolveInspectorHistoryContext(state, state.selectedRootRegionKey),
      historyLabel: "Update widget",
      historyCoalesceKey: resolveInspectorCoalesceKey(state, draftKey, field),
    },
  );

  return true;
}

function patchSelectedStructureDraftConfig(
  state: PhiDeveloperBuilderWorkspaceState,
  field: string,
  patchConfig: (config: Record<string, unknown>) => Record<string, unknown>,
) {
  if (!state.selectedRootRegionKey || state.nodeId == null) {
    return false;
  }

  const draftKey = getPhiBuilderRegionDraftKey(state.area, state.selectedRootRegionKey, state.pageKey);
  const selectedRootDraft = resolveRegionDraftKey(
    getPhiDeveloperRegionDraftsSnapshot(),
    state.area,
    state.selectedRootRegionKey,
    state.pageKey,
  );
  const selectedRootNodeId = selectedRootDraft?.rootNodeId ?? null;
  const selectedNestedLayoutNode =
    selectedRootDraft && state.nodeId !== selectedRootNodeId
      ? findPhiBuilderLayoutNodeById(selectedRootDraft.rootNodeChildLayouts ?? [], state.nodeId)
      : null;
  if (!selectedRootDraft || !selectedNestedLayoutNode) {
    return false;
  }

  setPhiDeveloperRegionDraft(
    draftKey,
    {
      ...selectedRootDraft,
      rootNodeChildLayouts: patchLayoutNodeById(
        selectedRootDraft.rootNodeChildLayouts ?? [],
        state.nodeId,
        patchConfig,
      ),
    },
    {
      historyContext: resolveInspectorHistoryContext(state, state.selectedRootRegionKey),
      historyLabel: "Update layout",
      historyCoalesceKey: resolveInspectorCoalesceKey(state, draftKey, field),
    },
  );

  return true;
}

function patchSelectedRootStructureConfig(
  state: PhiDeveloperBuilderWorkspaceState,
  field: string,
  patch: Record<string, unknown>,
) {
  if (!state.selectedRootRegionKey) {
    return false;
  }

  const draftKey = getPhiBuilderRegionDraftKey(state.area, state.selectedRootRegionKey, state.pageKey);
  const selectedRootDraft = resolveRegionDraftKey(
    getPhiDeveloperRegionDraftsSnapshot(),
    state.area,
    state.selectedRootRegionKey,
    state.pageKey,
  );
  if (!selectedRootDraft) {
    return false;
  }

  setPhiDeveloperRegionDraft(
    draftKey,
    {
      ...selectedRootDraft,
      rootNodeConfig: {
        ...(selectedRootDraft.rootNodeConfig ?? {}),
        ...patch,
      },
      ...patch,
    },
    {
      historyContext: resolveInspectorHistoryContext(state, state.selectedRootRegionKey),
      historyLabel: "Update layout",
      historyCoalesceKey: resolveInspectorCoalesceKey(state, draftKey, field),
    },
  );

  return true;
}

function readRecordPatch(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function runPhiDeveloperBuilderInspectorAction(
  defaultArea: PhiDeveloperBuilderArea,
  action: PhiBuilderInspectorAction,
) {
  const state = getPhiDeveloperBuilderStateSnapshot(defaultArea);

  if (action.kind === "patchSelectedRegionDraft") {
    const patch = readRecordPatch(action.patch);
    const selectedRegionKey = state.nodeKind === "region" ? state.nodeKey.replace(/^region:/, "") : null;
    const currentDraft = selectedRegionKey
      ? resolveRegionDraftKey(
          getPhiDeveloperRegionDraftsSnapshot(),
          state.area,
          selectedRegionKey,
          state.pageKey,
        ) ?? getDefaultRegionDraft(selectedRegionKey)
      : null;
    if (!selectedRegionKey || !currentDraft || !patch) {
      return;
    }

    setPhiDeveloperRegionDraft(
      getPhiBuilderRegionDraftKey(state.area, selectedRegionKey, state.pageKey),
      {
        ...currentDraft,
        ...patch,
      },
      {
        historyContext: resolveInspectorHistoryContext(state, selectedRegionKey),
        historyLabel: "Update region",
        historyCoalesceKey: resolveInspectorCoalesceKey(
          state,
          getPhiBuilderRegionDraftKey(state.area, selectedRegionKey, state.pageKey),
          Object.keys(patch).sort().join(","),
        ),
      },
    );
    return;
  }

  if (action.kind === "patchSelectedWidgetConfig") {
    const patch = readRecordPatch(action.patch);
    if (patch) {
      patchSelectedWidgetDraftConfig(state, Object.keys(patch).sort().join(","), (config) => ({ ...config, ...patch }));
    }
    return;
  }

  if (action.kind === "patchSelectedWidgetGeometry") {
    const geometry = readRecordPatch(action.geometry);
    if (geometry) {
      patchSelectedWidgetDraftConfig(state, "geometry", (config) => ({
        ...config,
        ...resolveWidgetSizeFromGeometry(geometry as PhiCmsGeometryWidgetConfig),
      }));
    }
    return;
  }

  if (action.kind === "patchSelectedLayoutAnchor") {
    const selectedLayoutAnchor = action.selectedLayoutAnchor;
    if (typeof selectedLayoutAnchor !== "string") {
      return;
    }

    if (!patchSelectedStructureDraftConfig(state, "anchor", (config) => ({ ...config, anchor: selectedLayoutAnchor }))) {
      patchSelectedRootStructureConfig(state, "anchor", { rootNodeAnchor: selectedLayoutAnchor });
    }
    builderWorkspaceStore.patch(defaultArea, (current) => ({
      ...current,
      selectedLayoutAnchor: selectedLayoutAnchor as PhiAnchorWidgetPlacement,
    }));
    return;
  }

  if (action.kind === "patchSelectedLayoutPadding") {
    const padding = action.padding == null ? null : readRecordPatch(action.padding);
    if (!patchSelectedStructureDraftConfig(state, "padding", (config) => ({
      ...config,
      ...resolvePaddingPatch(padding as PhiCmsPaddingWidgetConfig | null),
    }))) {
      patchSelectedRootStructureConfig(state, "padding", { rootNodePadding: padding });
    }
    return;
  }

  if (action.kind === "patchSelectedLayoutBackground") {
    if (!patchSelectedStructureDraftConfig(state, "background", (config) => ({
      ...config,
      rootNodeBackground: action.background,
    }))) {
      patchSelectedRootStructureConfig(state, "background", { rootNodeBackground: action.background });
    }
    return;
  }

  if (action.kind === "patchSelectedLayoutBorder") {
    if (!patchSelectedStructureDraftConfig(state, "border", (config) => ({
      ...config,
      rootNodeBorder: action.border,
    }))) {
      patchSelectedRootStructureConfig(state, "border", { rootNodeBorder: action.border });
    }
    return;
  }

  if (action.kind === "patchSelectedLayoutShadow") {
    const shadow = action.shadow;
    if (!patchSelectedStructureDraftConfig(state, "shadow", (config) => ({ ...config, rootNodeShadow: shadow }))) {
      patchSelectedRootStructureConfig(state, "shadow", { rootNodeShadow: shadow });
    }
    return;
  }

  if (action.kind === "patchSelectedLayoutConfig" && typeof action.key === "string") {
    const nextValue = action.value ?? undefined;
    if (!patchSelectedStructureDraftConfig(state, action.key, (config) => ({
      ...config,
      [action.key as string]: nextValue,
    }))) {
      patchSelectedRootStructureConfig(state, action.key, { [action.key]: nextValue });
    }
  }
}
