"use client";

import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode } from "../../../types/cms";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../types/signals";
import { isPhiBuilderAreaKey } from "../../../constants/cms-areas";
import {
  prunePhiSignalRoutesFromConfig,
  type PhiSignalRouteReceiverTarget,
} from "../../../helpers/signal-route-lifecycle";
import {
  createPhiSignalCorrelationId,
  type PhiSignalDispatch,
} from "../../../components/runtime/runtime-signal-bus";
import { useRef, useSyncExternalStore } from "react";

import { createPhiPluginStateStore } from "../../../components/state/plugin-state-store";
import {
  phiWorkspaceCatalogStore,
  type PhiWorkspaceCatalogState,
} from "../../../components/workspace/catalog-store";
import { createPhiBuilderControllerAddress } from "./controller/address";
import type {
  PhiBuilderChromeControls,
  PhiDeveloperBuilderArea,
  PhiDeveloperBuilderEffectsRequest,
  PhiDeveloperBuilderNodeKind,
  PhiDeveloperBuilderPageMetaDraft,
  PhiDeveloperBuilderRegionDraft,
  PhiDeveloperBuilderState,
  PhiDeveloperBuilderWorkspaceState,
} from "./developer-workspace-types";
import type { PhiRenderableBlockEffects } from "../../../types/renderable-block";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiAnchorWidgetPlacement } from "../../../components/controls/phi-anchor-control-contract";
import { phiBuilderHistory } from "./history";
import type { PhiAreaRootRoute } from "../../../helpers/cms-area-config";

export function normalizePhiDeveloperBuilderArea(scopeKey: string): PhiDeveloperBuilderArea {
  return isPhiBuilderAreaKey(scopeKey) ? scopeKey : "public";
}

export function createDefaultBuilderChromeControls(): PhiBuilderChromeControls {
  return {
    editorPreviewDisabled: false,
    actionsDisabled: false,
    debugDisabled: false,
  };
}

function createDefaultBuilderState(): PhiDeveloperBuilderState {
  const defaultPageKey = "";

  return {
    nodeKey: `page:${defaultPageKey}`,
    nodeId: null,
    nodeKind: "page",
    selectedRegionType: null,
    selectedRegionKey: null,
    selectedRootRegionKey: null,
    selectedLayoutAnchor: "center",
    regionDrafts: {},
    pagePresetDrafts: {},
    pageMetaDrafts: {},
    sidebarKey: "pages",
    pagesOpen: false,
    inspectorOpen: false,
    signalWiringRequest: null,
    signalWiring: { senderAddress: null, senderCapabilityId: null, receiverAddress: null, receiverCapabilityId: null },
    effectsEditorRequest: null,
    builderMode: "editor",
    search: "",
    darkMode: false,
    debugScaffold: false,
    commandWorkspace: null,
    builderChromeControls: createDefaultBuilderChromeControls(),
    pickerWidgetCategoryFilters: [],
    areaRootRouteDrafts: {},
    deletedPageDrafts: {},
    draftAllocations: {},
  };
}

export const builderWorkspaceStore = createPhiPluginStateStore<PhiDeveloperBuilderState>(
  "@phis/ui/developer-workspace",
  createDefaultBuilderState,
);

const builderEffectsCommitters = new Map<
  string,
  (effects: PhiRenderableBlockEffects) => void
>();

export function openPhiDeveloperBuilderEffectsEditor(
  scopeKey: PhiDeveloperBuilderArea,
  effects: PhiRenderableBlockEffects,
  onCommit: (effects: PhiRenderableBlockEffects) => void,
) {
  const correlationId = createPhiSignalCorrelationId();
  const previousRequest = builderWorkspaceStore.getSnapshot(scopeKey).effectsEditorRequest;
  if (previousRequest) {
    builderEffectsCommitters.delete(previousRequest.correlationId);
  }
  builderEffectsCommitters.set(correlationId, onCommit);
  builderWorkspaceStore.patch(scopeKey, (current) => ({
    ...current,
    effectsEditorRequest: { correlationId, effects },
  }));
}

export function completePhiDeveloperBuilderEffectsEditor(
  scopeKey: PhiDeveloperBuilderArea,
  request: PhiDeveloperBuilderEffectsRequest,
  effects?: PhiRenderableBlockEffects,
) {
  const onCommit = builderEffectsCommitters.get(request.correlationId);
  builderEffectsCommitters.delete(request.correlationId);
  builderWorkspaceStore.patch(scopeKey, (current) => ({
    ...current,
    effectsEditorRequest:
      current.effectsEditorRequest?.correlationId === request.correlationId
        ? null
        : current.effectsEditorRequest,
  }));
  if (effects) {
    onCommit?.(effects);
  }
}

export type PhiDeveloperBuilderNodeSelection = {
  area?: PhiDeveloperBuilderArea;
  pageKey?: string;
  nodeKey: string;
  nodeId?: PhiCmsInstanceId | null;
  nodeKind: PhiDeveloperBuilderNodeKind;
  regionType?: number | null;
  regionKey?: string | null;
  selectedLayoutAnchor?: PhiAnchorWidgetPlacement | null;
  openWiring?: boolean;
};

export function selectPhiDeveloperBuilderNode(
  scopeKey: PhiDeveloperBuilderArea,
  selection: PhiDeveloperBuilderNodeSelection,
) {
  builderWorkspaceStore.patch(scopeKey, (current) => ({
    ...current,
    ...(selection.area ? { area: selection.area } : {}),
    ...(selection.pageKey ? { pageKey: selection.pageKey } : {}),
    nodeKey: selection.nodeKey,
    nodeId: selection.nodeId ?? null,
    nodeKind: selection.nodeKind,
    selectedRegionType:
      selection.nodeKind === "region" ? selection.regionType ?? null : null,
    selectedRegionKey:
      selection.nodeKind === "region" || selection.nodeKind === "slot"
        ? selection.regionKey ?? null
        : null,
    selectedRootRegionKey:
      selection.nodeKind === "layout" ||
      selection.nodeKind === "widget"
        ? selection.regionKey ?? null
        : null,
    selectedLayoutAnchor:
      (selection.nodeKind === "layout") &&
      selection.selectedLayoutAnchor
        ? selection.selectedLayoutAnchor
        : current.selectedLayoutAnchor,
    /*
     * Wiring opens its own overlay, which is declared in the Builder Area preset and therefore cannot be
     * opened by flipping a flag: the controller dispatches to it once the overlay and its Form have
     * registered. Recording the request is this store's whole part in it.
     */
    signalWiringRequest: selection.openWiring === true
      ? { correlationId: createPhiSignalCorrelationId() }
      : current.signalWiringRequest,
    inspectorOpen:
      selection.openWiring !== true &&
      (selection.nodeKind === "region" ||
        selection.nodeKind === "layout" ||
        selection.nodeKind === "widget"),
    sidebarKey:
      selection.nodeKind === "region" || selection.nodeKind === "slot"
        ? "structure"
        : current.sidebarKey,
    pagesOpen:
      selection.nodeKind === "region" || selection.nodeKind === "slot"
        ? false
        : current.pagesOpen,
  }));
}

const builderRegionDraftStore = createPhiPluginStateStore<Record<string, PhiDeveloperBuilderRegionDraft>>(
  "@phis/ui/developer-region-drafts",
  () => ({}),
);

export function patchPhiDeveloperBuilderState(
  scopeKey: PhiDeveloperBuilderArea,
  next: Partial<Pick<PhiDeveloperBuilderState, "pickerWidgetCategoryFilters">>,
) {
  builderWorkspaceStore.patch(scopeKey, (current) => ({
    ...current,
    ...next,
  }));
}

const PHI_WORKSPACE_CATALOG_KEYS = [
  "area",
  "pageKey",
  "catalogHydrated",
  "pageCatalogHydratedByArea",
  "modulePresetPagesByArea",
  "customPages",
  "persistedPageCatalogByArea",
  "navigationSurfacesByArea",
  "areaPresetSourcesByArea",
  "runtimeModuleDefinitions",
  "runtimeModuleIdsByArea",
] as const satisfies readonly (keyof PhiWorkspaceCatalogState)[];

export function splitWorkspacePatch(next: Partial<PhiDeveloperBuilderWorkspaceState>) {
  const catalog: Partial<PhiWorkspaceCatalogState> = {};
  const tool: Partial<PhiDeveloperBuilderState> = {};
  for (const [key, value] of Object.entries(next)) {
    if ((PHI_WORKSPACE_CATALOG_KEYS as readonly string[]).includes(key)) {
      (catalog as Record<string, unknown>)[key] = value;
    } else {
      (tool as Record<string, unknown>)[key] = value;
    }
  }
  return { catalog, tool };
}

export function dispatchPhiDeveloperBuilderState(
  emitSignal: PhiSignalDispatch,
  defaultArea: PhiDeveloperBuilderArea,
  next: Partial<PhiDeveloperBuilderWorkspaceState>,
) {
  const { catalog, tool } = splitWorkspacePatch(next);
  /*
   * The catalog goes first so that the merged view the Builder reacts on below -- and every signal it
   * emits from it -- already carries the new Area or page.
   */
  if (Object.keys(catalog).length > 0) {
    phiWorkspaceCatalogStore.patch(defaultArea, (current) => ({ ...current, ...catalog }));
  }
  builderWorkspaceStore.patch(defaultArea, (current) => {
    const merged: PhiDeveloperBuilderWorkspaceState = {
      ...current,
      ...phiWorkspaceCatalogStore.getSnapshot(defaultArea),
      ...tool,
    };

    if (typeof next.area === "string" || typeof next.pageKey === "string") {
      merged.builderChromeControls = createDefaultBuilderChromeControls();
    }

    if (typeof next.inspectorOpen === "boolean" && next.inspectorOpen === false) {
      /*
       * Putting the Inspector away ends whatever was being adjusted in it. Everything a control emitted
       * while it was open is one edit, and the value standing when it closes is the one history keeps --
       * so undo takes back the adjustment rather than one step of a slider still being dragged.
       */
      phiBuilderHistory.endGesture();
      merged.nodeKey = `page:${merged.pageKey}`;
      merged.nodeId = null;
      merged.nodeKind = "page";
      merged.selectedRegionType = null;
      merged.selectedRegionKey = null;
      merged.selectedRootRegionKey = null;
    }

    if (typeof next.area === "string") {
      emitSignal({
        scope: "area",
        channel: "selection",
        action: "change",
        value: merged.area,
        valueType: "string",
        sender: createPhiBuilderControllerAddress(),
        receiver: "broadcast",
        timestamp: Date.now(),
      });
    }

    if (typeof next.pageKey === "string") {
      emitSignal({
        scope: "page",
        channel: "page",
        action: "change",
        value: {
          area: merged.area,
          pageKey: merged.pageKey,
        },
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.builderLayout,
        sender: createPhiBuilderControllerAddress(),
        receiver: "broadcast",
        timestamp: Date.now(),
      });
    }

    if (typeof next.nodeKey === "string" || typeof next.nodeKind === "string") {
      emitSignal({
        scope: merged.nodeKind === "slot" || merged.nodeKind === "region" ? "region" : "page",
        channel: "selection",
        action: "change",
        value: {
          area: merged.area,
          pageKey: merged.pageKey,
          nodeKey: merged.nodeKey,
          nodeId: merged.nodeId,
          nodeKind: merged.nodeKind,
          regionKey:
            merged.nodeKind === "region" || merged.nodeKind === "slot"
              ? merged.nodeKey.replace(/^(region|slot):/, "")
              : merged.nodeKind === "layout" || merged.nodeKind === "widget"
                ? merged.selectedRootRegionKey ?? null
                : null,
        },
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.builderNodeSelection,
        sender: createPhiBuilderControllerAddress(),
        receiver: "broadcast",
        timestamp: Date.now(),
      });
    }

    if (typeof next.inspectorOpen === "boolean" && next.inspectorOpen === false) {
      emitSignal({
        scope: "page",
        channel: "selection",
        action: "change",
        value: {
          area: merged.area,
          pageKey: merged.pageKey,
          nodeKey: merged.nodeKey,
          nodeId: merged.nodeId,
          nodeKind: merged.nodeKind,
          regionKey: null,
        },
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.builderNodeSelection,
        sender: createPhiBuilderControllerAddress(),
        receiver: "broadcast",
        timestamp: Date.now(),
      });
    }

    if (typeof next.builderMode === "string") {
      emitSignal({
        scope: "area",
        channel: "builderMode",
        action: "change",
        value: merged.builderMode,
        valueType: "enum",
        sender: createPhiBuilderControllerAddress(),
        receiver: "broadcast",
        timestamp: Date.now(),
      });
    }

    if (typeof next.inspectorOpen === "boolean") {
      emitSignal({
        scope: "area",
        channel: "inspectorVisibility",
        action: "change",
        value: next.inspectorOpen,
        valueType: "boolean",
        sender: createPhiBuilderControllerAddress(),
        receiver: "broadcast",
        timestamp: Date.now(),
      });
    }

    if (typeof next.pagesOpen === "boolean") {
      emitSignal({
        scope: "area",
        channel: "pagesVisibility",
        action: "change",
        value: next.pagesOpen ? "visible" : "hidden",
        valueType: "enum",
        sender: createPhiBuilderControllerAddress(),
        receiver: "broadcast",
        timestamp: Date.now(),
      });
    }

    return merged;
  });
}

export function emitPhiBuilderChromeControlsSignal(
  emitSignal: PhiSignalDispatch,
  scope: Pick<PhiDeveloperBuilderWorkspaceState, "area" | "pageKey">,
  controls: Partial<PhiBuilderChromeControls>,
) {
  emitSignal({
    scope: "page",
    channel: "builderChrome",
    action: "change",
    value: {
      ...controls,
      area: scope.area,
      pageKey: scope.pageKey,
    },
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.builderChrome,
    sender: createPhiBuilderControllerAddress(),
    receiver: "broadcast",
    meta: { sourceLabel: `${scope.area}:${scope.pageKey}` },
    timestamp: Date.now(),
  });
}

type PhiBuilderRegionDraftMutationOptions = {
  historyContext?: string | null;
  historyLabel?: string;
  // What counts as one authoring gesture; see `PhiHistoryEntry.coalesceKey`.
  historyCoalesceKey?: string;
};

export function setPhiDeveloperRegionDraft(
  draftKey: string,
  draft: PhiDeveloperBuilderRegionDraft,
  options?: PhiBuilderRegionDraftMutationOptions,
) {
  const previousDraft = builderRegionDraftStore.getSnapshot("default")[draftKey] ?? null;
  if (Object.is(previousDraft, draft)) {
    return;
  }

  builderRegionDraftStore.patch("default", (current) => {
    return {
      ...current,
      [draftKey]: draft,
    };
  });

  if (options?.historyContext) {
    phiBuilderHistory.record(options.historyContext, {
      label: options.historyLabel ?? "Update draft",
      ...(options.historyCoalesceKey ? { coalesceKey: options.historyCoalesceKey } : {}),
      before: {
        kind: "regionDrafts",
        drafts: { [draftKey]: previousDraft },
      },
      after: {
        kind: "regionDrafts",
        drafts: { [draftKey]: draft },
      },
    });
  }
}

function pruneWidgetNodeSignalRoutes(
  node: PhiCmsContentWidgetNode,
  targets: readonly PhiSignalRouteReceiverTarget[],
): PhiCmsContentWidgetNode {
  const config = prunePhiSignalRoutesFromConfig(node.config ?? {}, targets);
  return config === node.config ? node : { ...node, config };
}

function pruneLayoutNodeSignalRoutes(
  node: PhiCmsLayoutRenderNode,
  targets: readonly PhiSignalRouteReceiverTarget[],
): PhiCmsLayoutRenderNode {
  const config = prunePhiSignalRoutesFromConfig(node.config ?? {}, targets);
  const childLayouts = (node.childLayouts ?? []).map((child) =>
    pruneLayoutNodeSignalRoutes(child, targets),
  );
  const childWidgets = (node.childWidgets ?? []).map((child) =>
    pruneWidgetNodeSignalRoutes(child, targets),
  );

  return config === node.config &&
    childLayouts.every((child, index) => child === node.childLayouts?.[index]) &&
    childWidgets.every((child, index) => child === node.childWidgets?.[index])
    ? node
    : { ...node, config, childLayouts, childWidgets };
}

function pruneRegionDraftSignalRoutes(
  draft: PhiDeveloperBuilderRegionDraft,
  targets: readonly PhiSignalRouteReceiverTarget[],
): PhiDeveloperBuilderRegionDraft {
  const rootNodeConfig = draft.rootNodeConfig
    ? prunePhiSignalRoutesFromConfig(draft.rootNodeConfig, targets)
    : draft.rootNodeConfig;
  const regionConfig = draft.regionConfig
    ? prunePhiSignalRoutesFromConfig(draft.regionConfig, targets)
    : draft.regionConfig;
  const rootNodeChildLayouts = (draft.rootNodeChildLayouts ?? []).map((node) =>
    pruneLayoutNodeSignalRoutes(node, targets),
  );
  const rootNodeChildWidgets = (draft.rootNodeChildWidgets ?? []).map((node) =>
    pruneWidgetNodeSignalRoutes(node, targets),
  );
  const unchanged = rootNodeConfig === draft.rootNodeConfig &&
    regionConfig === draft.regionConfig &&
    rootNodeChildLayouts.every((node, index) => node === draft.rootNodeChildLayouts?.[index]) &&
    rootNodeChildWidgets.every((node, index) => node === draft.rootNodeChildWidgets?.[index]);

  return unchanged
    ? draft
    : {
        ...draft,
        rootNodeConfig,
        regionConfig,
        rootNodeChildLayouts,
        rootNodeChildWidgets,
      };
}

function draftCanOwnRoutesToDeletedReceiver(
  draftKey: string,
  area: PhiDeveloperBuilderArea,
  pageKey: string,
  targets: readonly PhiSignalRouteReceiverTarget[],
) {
  const areaPrefix = `${area}:`;
  if (!draftKey.startsWith(areaPrefix)) {
    return false;
  }

  if (targets.some((target) => target.scope === "area")) {
    return true;
  }

  if (!targets.some((target) => target.scope === "page")) {
    return false;
  }

  const remainder = draftKey.slice(areaPrefix.length);
  return !remainder.includes(":") || draftKey.startsWith(`${area}:${pageKey}:`);
}

export function setPhiDeveloperRegionDraftAndPruneSignalRoutes({
  draftKey,
  draft,
  area,
  pageKey,
  targets,
  historyContext,
  historyLabel,
}: {
  draftKey: string;
  draft: PhiDeveloperBuilderRegionDraft;
  area: PhiDeveloperBuilderArea;
  pageKey: string;
  targets: readonly PhiSignalRouteReceiverTarget[];
  historyContext?: string | null;
  historyLabel?: string;
}) {
  const previousDrafts = builderRegionDraftStore.getSnapshot("default");
  let nextDraftsSnapshot = previousDrafts;
  builderRegionDraftStore.patch("default", (current) => {
    const nextDrafts = {
      ...current,
      [draftKey]: draft,
    };
    let changed = !Object.is(current[draftKey], draft);

    for (const [candidateKey, candidateDraft] of Object.entries(nextDrafts)) {
      if (!draftCanOwnRoutesToDeletedReceiver(candidateKey, area, pageKey, targets)) {
        continue;
      }

      const nextDraft = pruneRegionDraftSignalRoutes(candidateDraft, targets);
      if (nextDraft !== candidateDraft) {
        nextDrafts[candidateKey] = nextDraft;
        changed = true;
      }
    }

    nextDraftsSnapshot = changed ? nextDrafts : current;
    return nextDraftsSnapshot;
  });

  if (historyContext && nextDraftsSnapshot !== previousDrafts) {
    const changedKeys = new Set([
      ...Object.keys(previousDrafts),
      ...Object.keys(nextDraftsSnapshot),
    ]);
    const before: Record<string, PhiDeveloperBuilderRegionDraft | null> = {};
    const after: Record<string, PhiDeveloperBuilderRegionDraft | null> = {};
    for (const key of changedKeys) {
      if (Object.is(previousDrafts[key], nextDraftsSnapshot[key])) {
        continue;
      }
      before[key] = previousDrafts[key] ?? null;
      after[key] = nextDraftsSnapshot[key] ?? null;
    }
    phiBuilderHistory.record(historyContext, {
      label: historyLabel ?? "Update draft",
      before: { kind: "regionDrafts", drafts: before },
      after: { kind: "regionDrafts", drafts: after },
    });
  }
}

export function restorePhiDeveloperRegionDrafts(
  drafts: Record<string, PhiDeveloperBuilderRegionDraft | null>,
) {
  builderRegionDraftStore.patch("default", (current) => {
    const next = { ...current };
    for (const [draftKey, draft] of Object.entries(drafts)) {
      if (draft == null) {
        delete next[draftKey];
      } else {
        next[draftKey] = draft;
      }
    }
    return next;
  });
}

export function setPhiDeveloperRegionDraftsWithHistory(
  drafts: Record<string, PhiDeveloperBuilderRegionDraft>,
  options: {
    historyContext: string;
    historyLabel: string;
  },
) {
  const current = builderRegionDraftStore.getSnapshot("default");
  const before: Record<string, PhiDeveloperBuilderRegionDraft | null> = {};
  const after: Record<string, PhiDeveloperBuilderRegionDraft | null> = {};
  let changed = false;

  for (const [draftKey, draft] of Object.entries(drafts)) {
    if (Object.is(current[draftKey], draft)) {
      continue;
    }
    before[draftKey] = current[draftKey] ?? null;
    after[draftKey] = draft;
    changed = true;
  }
  if (!changed) {
    return;
  }

  builderRegionDraftStore.patch("default", (existing) => ({
    ...existing,
    ...drafts,
  }));
  phiBuilderHistory.record(options.historyContext, {
    label: options.historyLabel,
    before: { kind: "regionDrafts", drafts: before },
    after: { kind: "regionDrafts", drafts: after },
  });
}

/**
 * The Area's root route, as the Builder is editing it.
 *
 * `undefined` clears the entry, which is not the same as `null`: the first says nobody touched this
 * Area in this session and the Area's stored answer stands, the second says the Builder chose the
 * default back and the write has to remove the stored config.
 */
export function setPhiDeveloperBuilderAreaRootRoute(
  area: PhiDeveloperBuilderArea,
  rootRoute: PhiAreaRootRoute | null | undefined,
) {
  builderWorkspaceStore.patch("public", (current) => {
    const next = { ...current.areaRootRouteDrafts };
    if (rootRoute === undefined) {
      delete next[area];
    } else {
      next[area] = rootRoute;
    }
    return { ...current, areaRootRouteDrafts: next };
  });
}

export function mergePhiDeveloperRegionDrafts(drafts: Record<string, PhiDeveloperBuilderRegionDraft>) {
  builderRegionDraftStore.patch("default", (current) => {
    const hasChanges = Object.entries(drafts).some(([draftKey, draft]) =>
      !Object.is(current[draftKey], draft),
    );

    return hasChanges
      ? {
          ...current,
          ...drafts,
        }
      : current;
  });
}

export function mergePhiDeveloperPagePresetDrafts(
  drafts: Record<string, PhiDeveloperBuilderRegionDraft>,
) {
  builderWorkspaceStore.patch("public", (current) => ({
    ...current,
    pagePresetDrafts: {
      ...current.pagePresetDrafts,
      ...drafts,
    },
  }));
}

export function mergePhiDeveloperPageMetaDrafts(
  area: PhiDeveloperBuilderArea,
  drafts: Record<string, PhiDeveloperBuilderPageMetaDraft>,
) {
  void area;
  builderWorkspaceStore.patch("public", (current) => {
    let hasChanges = false;
    const missingDrafts: Record<string, PhiDeveloperBuilderPageMetaDraft> = {};

    for (const [draftKey, draft] of Object.entries(drafts)) {
      if (current.pageMetaDrafts[draftKey] == null) {
        missingDrafts[draftKey] = draft;
        hasChanges = true;
      }
    }

    if (!hasChanges) {
      return current;
    }

    return {
      ...current,
      pageMetaDrafts: {
        ...current.pageMetaDrafts,
        ...missingDrafts,
      },
    };
  });
}

export function mergePhiDeveloperDeletedPageDrafts(
  area: PhiDeveloperBuilderArea,
  drafts: Record<string, boolean>,
) {
  void area;
  builderWorkspaceStore.patch("public", (current) => {
    let hasChanges = false;
    const nextDrafts = { ...current.deletedPageDrafts };

    for (const [draftKey, deleted] of Object.entries(drafts)) {
      if (nextDrafts[draftKey] !== deleted) {
        nextDrafts[draftKey] = deleted;
        hasChanges = true;
      }
    }

    return hasChanges
      ? {
          ...current,
          deletedPageDrafts: nextDrafts,
        }
      : current;
  });
}

export function usePhiDeveloperRegionDrafts() {
  return builderRegionDraftStore.useStore("default");
}

export function usePhiDeveloperRegionDraft(draftKey: string) {
  return builderRegionDraftStore.useStoreSelector("default", (drafts) => drafts[draftKey] ?? null);
}

const mergedWorkspaceSnapshots = new Map<
  string,
  { tool: PhiDeveloperBuilderState; catalog: PhiWorkspaceCatalogState; merged: PhiDeveloperBuilderWorkspaceState }
>();

/**
 * Merging on every read would hand `useSyncExternalStore` a new object each time and never settle, so
 * the merged view is kept until one of the two sources actually changes.
 */
function readMergedWorkspaceSnapshot(area: PhiDeveloperBuilderArea): PhiDeveloperBuilderWorkspaceState {
  const tool = builderWorkspaceStore.getSnapshot(area);
  const catalog = phiWorkspaceCatalogStore.getSnapshot(area);
  const cached = mergedWorkspaceSnapshots.get(area);
  if (cached && Object.is(cached.tool, tool) && Object.is(cached.catalog, catalog)) {
    return cached.merged;
  }
  const merged = { ...tool, ...catalog };
  mergedWorkspaceSnapshots.set(area, { tool, catalog, merged });
  return merged;
}

/** The whole merged view, for the few places that work with the state as one object. */
export function usePhiDeveloperBuilderWorkspaceState(
  area: PhiDeveloperBuilderArea,
): PhiDeveloperBuilderWorkspaceState {
  return usePhiDeveloperBuilderStateValue(area, (state) => state);
}

const mergedHydrationSnapshots = new Map<string, PhiDeveloperBuilderWorkspaceState>();

/** Hydration must render what the server rendered, so it merges the two hydration values, not the live ones. */
function readMergedHydrationSnapshot(area: PhiDeveloperBuilderArea): PhiDeveloperBuilderWorkspaceState {
  const cached = mergedHydrationSnapshots.get(area);
  if (cached) {
    return cached;
  }
  const merged = {
    ...builderWorkspaceStore.getHydrationSnapshot(area),
    ...phiWorkspaceCatalogStore.getHydrationSnapshot(area),
  };
  mergedHydrationSnapshots.set(area, merged);
  return merged;
}

export function usePhiDeveloperBuilderStateValue<TSelected>(
  area: PhiDeveloperBuilderArea,
  selector: (state: PhiDeveloperBuilderWorkspaceState) => TSelected,
) {
  const selectedRef = useRef<{ source: PhiDeveloperBuilderWorkspaceState; selected: TSelected } | null>(null);
  return useSyncExternalStore(
    (listener) => {
      const unsubscribeTool = builderWorkspaceStore.subscribe(area, listener);
      const unsubscribeCatalog = phiWorkspaceCatalogStore.subscribe(area, listener);
      return () => {
        unsubscribeTool();
        unsubscribeCatalog();
      };
    },
    () => {
      const source = readMergedWorkspaceSnapshot(area);
      const cached = selectedRef.current;
      if (cached && Object.is(cached.source, source)) {
        return cached.selected;
      }
      const selected = selector(source);
      selectedRef.current = { source, selected };
      return selected;
    },
    () => selector(readMergedHydrationSnapshot(area)),
  );
}

export function getPhiDeveloperRegionDraftsSnapshot() {
  return builderRegionDraftStore.getSnapshot("default");
}

export function getPhiDeveloperBuilderStateSnapshot(
  area: PhiDeveloperBuilderArea = "public",
): PhiDeveloperBuilderWorkspaceState {
  return readMergedWorkspaceSnapshot(area);
}
