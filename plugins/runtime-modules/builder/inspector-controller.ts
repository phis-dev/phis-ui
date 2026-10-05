import { isPhiRecord } from "../../../helpers/is-record";
import { PhiCmsFlags } from "../../../constants/phi-cms";
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
import { assertPhiCmsConfigFields } from "../../../helpers/cms-config-field-validation";
import { getPhiBuilderModuleMetasSnapshot } from "./plugin-meta-store";
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
  patchNode: (node: PhiCmsContentWidgetNode) => PhiCmsContentWidgetNode,
): PhiCmsContentWidgetNode[] {
  return widgets.map((node) => (node.id === nodeId ? patchNode(node) : node));
}

function patchWidgetNodeByIdInLayouts(
  nodes: PhiCmsLayoutRenderNode[],
  nodeId: PhiCmsInstanceId,
  patchNode: (node: PhiCmsContentWidgetNode) => PhiCmsContentWidgetNode,
): PhiCmsLayoutRenderNode[] {
  return nodes.map((node) => ({
    ...node,
    childLayouts: patchWidgetNodeByIdInLayouts(node.childLayouts ?? [], nodeId, patchNode),
    childWidgets: patchWidgetNodeById(node.childWidgets ?? [], nodeId, patchNode),
  }));
}

/**
 * The write path's one gate.
 *
 * A control is drawn from the same field declaration this checks against, so nobody clicking through
 * the Builder can produce a value that fails here -- what can is a patch written in code, and that is
 * exactly what should not reach a stored page quietly. Reading stays forgiving; writing does not.
 *
 * A type with no metadata in the active Canvas is left alone rather than refused: the catalogue is
 * per Area, and a node from elsewhere is a question about scope, not about this value.
 */
function assertPhiBuilderPatchedConfig(
  area: PhiDeveloperBuilderArea,
  widgetType: string,
  config: Record<string, unknown>,
) {
  const meta = getPhiBuilderModuleMetasSnapshot(area).plugins
    .find((candidate) => `${candidate.pluginKey}/${candidate.typeKey}` === widgetType);
  if (!meta?.fields) {
    return;
  }
  assertPhiCmsConfigFields(meta.fields, config, meta.title ?? widgetType);
}

function guardPhiBuilderConfigPatch(
  area: PhiDeveloperBuilderArea,
  widgetType: string,
  patchConfig: (config: Record<string, unknown>) => Record<string, unknown>,
) {
  return (config: Record<string, unknown>) => {
    const next = patchConfig(config);
    assertPhiBuilderPatchedConfig(area, widgetType, next);
    return next;
  };
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

function patchSelectedWidgetDraftNode(
  state: PhiDeveloperBuilderWorkspaceState,
  field: string,
  patchNode: (node: PhiCmsContentWidgetNode) => PhiCmsContentWidgetNode,
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

  const rootNode = selectedRootDraft.rootNode;
  if (!rootNode || !findPhiBuilderWidgetNodeByIdInLayouts([rootNode], state.nodeId)) {
    return false;
  }

  setPhiDeveloperRegionDraft(
    draftKey,
    {
      ...selectedRootDraft,
      rootNode: patchWidgetNodeByIdInLayouts([rootNode], state.nodeId, patchNode)[0],
    },
    {
      historyContext: resolveInspectorHistoryContext(state, state.selectedRootRegionKey),
      historyLabel: "Update widget",
      historyCoalesceKey: resolveInspectorCoalesceKey(state, draftKey, field),
    },
  );

  return true;
}

function patchSelectedWidgetDraftConfig(
  state: PhiDeveloperBuilderWorkspaceState,
  field: string,
  patchConfig: (config: Record<string, unknown>) => Record<string, unknown>,
) {
  return patchSelectedWidgetDraftNode(state, field, (node) => ({
    ...node,
    config: guardPhiBuilderConfigPatch(state.area, node.widgetType, patchConfig)(node.config ?? {}),
  }));
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
  /*
   * The selected Layout, wherever it stands: the Region's root Layout is found and patched the same
   * way as every Layout below it, so both behave alike in the Inspector.
   */
  const rootNode = selectedRootDraft?.rootNode ?? null;
  const selectedLayoutNode = rootNode ? findPhiBuilderLayoutNodeById([rootNode], state.nodeId) : null;
  if (!selectedRootDraft || !rootNode || !selectedLayoutNode) {
    return false;
  }

  setPhiDeveloperRegionDraft(
    draftKey,
    {
      ...selectedRootDraft,
      rootNode: patchLayoutNodeById(
        [rootNode],
        state.nodeId,
        guardPhiBuilderConfigPatch(
          state.area,
          selectedLayoutNode.widgetType,
          patchConfig,
        ),
      )[0],
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
  return isPhiRecord(value)
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

  if (action.kind === "patchSelectedWidgetSurface") {
    const surface = action.surface;
    patchSelectedWidgetDraftConfig(state, "surface", (config) => {
      const next = { ...config };
      if (surface == null) {
        delete next.surface;
      } else {
        next.surface = surface;
      }
      return next;
    });
    return;
  }

  if (action.kind === "setSelectedWidgetTranslate") {
    patchSelectedWidgetDraftNode(state, "translate", (node) => ({
      ...node,
      flags: action.translate
        ? (node.flags ?? 0) & ~PhiCmsFlags.NoTranslate
        : (node.flags ?? 0) | PhiCmsFlags.NoTranslate,
    }));
    return;
  }

  if (action.kind === "patchSelectedLayoutAnchor") {
    const selectedLayoutAnchor = action.selectedLayoutAnchor;
    if (typeof selectedLayoutAnchor !== "string") {
      return;
    }

    patchSelectedStructureDraftConfig(state, "anchor", (config) => ({ ...config, anchor: selectedLayoutAnchor }));
    builderWorkspaceStore.patch(defaultArea, (current) => ({
      ...current,
      selectedLayoutAnchor: selectedLayoutAnchor as PhiAnchorWidgetPlacement,
    }));
    return;
  }

  if (action.kind === "patchSelectedLayoutPadding") {
    const padding = action.padding == null ? null : readRecordPatch(action.padding);
    patchSelectedStructureDraftConfig(state, "padding", (config) => ({
      ...config,
      ...resolvePaddingPatch(padding as PhiCmsPaddingWidgetConfig | null),
    }));
    return;
  }

  if (action.kind === "patchSelectedLayoutSurface") {
    const surface = action.surface;
    patchSelectedStructureDraftConfig(state, "surface", (config) => {
      const next = { ...config };
      if (surface == null) {
        delete next.surface;
      } else {
        next.surface = surface;
      }
      return next;
    });
    return;
  }

  if (action.kind === "patchSelectedLayoutConfig" && typeof action.key === "string") {
    const nextValue = action.value ?? undefined;
    patchSelectedStructureDraftConfig(state, action.key, (config) => ({
      ...config,
      [action.key as string]: nextValue,
    }));
  }
}
