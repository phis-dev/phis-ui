import { isPhiRecord } from "../../../../helpers/is-record";
import { PhiCmsFlags } from "../../../../constants/phi-cms";
import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode } from "../../../../types/cms";
import type { PhiCmsPaddingWidgetConfig } from "../../../../types/cms-config";
import type { PhiRenderableBlockBase } from "../../../../types";
import type { PhiCmsGeometryWidgetConfig } from "../../../../components/widgets/config/geometry";
import { normalizePhiViewportFlags } from "../../../../types/access";
import type { PhiAnchorWidgetPlacement } from "../../../../components/controls/phi-anchor-control-contract";
import type { PhiBuilderInspectorAction } from "../inspector-actions";
import { findPhiBuilderTreeNode, writePhiBuilderNode } from "../node-config-write";
import type { PhiHistoryActionKey } from "../../../../components/widgets/label-types/history";
import {
  getDefaultRegionDraft,
  resolveRegionDraftKey,
} from "../developer-region-drafts";
import {
  getPhiBuilderRegionDraftKey,
  isPhiBuilderPageScopedRegion,
} from "../region-keys";
import { createPhiBuilderRegionHistoryContext } from "../history";
import {
  builderWorkspaceStore,
  getPhiDeveloperRegionDraftsSnapshot,
  setPhiDeveloperRegionDraft,
  getPhiDeveloperBuilderStateSnapshot,
} from "../developer-workspace-store";
import type {
  PhiDeveloperBuilderArea,
  PhiDeveloperBuilderWorkspaceState,
} from "../developer-workspace-types";

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

/**
 * The selected node, written through the one path every in-place node edit takes
 * (`writePhiBuilderNode`): checked against its fields, its removed subcontrols' routes pruned, and
 * recorded as one step of the gesture `field` belongs to.
 */
function patchSelectedNode(
  state: PhiDeveloperBuilderWorkspaceState,
  expectedKind: "layout" | "widget",
  field: string,
  edit: {
    patchConfig?: (config: Record<string, unknown>) => Record<string, unknown>;
    patchNode?: <TNode extends PhiCmsLayoutRenderNode | PhiCmsContentWidgetNode>(node: TNode) => TNode;
    actionKey?: PhiHistoryActionKey;
  },
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
   * The selected node, wherever it stands: the Region's root Layout is found and patched the same way
   * as every node below it, so both behave alike in the Inspector.
   */
  const rootNode = selectedRootDraft?.rootNode ?? null;
  const node = rootNode ? findPhiBuilderTreeNode(rootNode, state.nodeId) : null;
  if (!selectedRootDraft || !node || ("contentId" in node ? "widget" : "layout") !== expectedKind) {
    return false;
  }

  return writePhiBuilderNode({
    area: state.area,
    pageKey: state.pageKey,
    regionKey: state.selectedRootRegionKey,
    draftKey,
    baseDraft: selectedRootDraft,
    nodeId: state.nodeId,
    ...edit,
    coalesceKey: resolveInspectorCoalesceKey(state, draftKey, field),
  });
}

function patchSelectedWidgetDraftConfig(
  state: PhiDeveloperBuilderWorkspaceState,
  field: string,
  patchConfig: (config: Record<string, unknown>) => Record<string, unknown>,
  actionKey?: PhiHistoryActionKey,
) {
  return patchSelectedNode(state, "widget", field, { patchConfig, actionKey });
}

function patchSelectedStructureDraftConfig(
  state: PhiDeveloperBuilderWorkspaceState,
  field: string,
  patchConfig: (config: Record<string, unknown>) => Record<string, unknown>,
) {
  return patchSelectedNode(state, "layout", field, { patchConfig });
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
        history: {
          context: createPhiBuilderRegionHistoryContext({
            area: state.area,
            pageKey: state.pageKey,
            pageScoped: isPhiBuilderPageScopedRegion(selectedRegionKey),
          }),
          action: { key: "changeRegion", regionKey: selectedRegionKey },
          coalesceKey: resolveInspectorCoalesceKey(
            state,
            getPhiBuilderRegionDraftKey(state.area, selectedRegionKey, state.pageKey),
            Object.keys(patch).sort().join(","),
          ),
        },
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
      }), "resizeNode");
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
    patchSelectedNode(state, "widget", "translate", {
      patchNode: (node) => ({
        ...node,
        flags: action.translate
          ? (node.flags ?? 0) & ~PhiCmsFlags.NoTranslate
          : (node.flags ?? 0) | PhiCmsFlags.NoTranslate,
      }),
      actionKey: "changeNodeTranslation",
    });
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

  /*
   * Every key the Layout Inspector changed in one gesture, written as one step: a padding control that
   * answers four sides, or a grid placement that moves columns and placements together, used to send a
   * key at a time and leave as many undo entries behind. A `null` takes the key away.
   */
  if (action.kind === "patchSelectedLayoutConfig") {
    const entries = Object.entries(action.patch);
    if (entries.length === 0) {
      return;
    }
    patchSelectedStructureDraftConfig(state, entries.map(([key]) => key).sort().join(","), (config) => ({
      ...config,
      ...Object.fromEntries(entries.map(([key, value]) => [key, value ?? undefined])),
    }));
  }
}
