"use client";

import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode, PhiCmsTreeControllerSettings } from "../../../types/cms";
import type { PhiSignalSender } from "../../../types";
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
import type {
  PhiBuilderChromeControls,
  PhiBuilderModuleDeactivationRequest,
  PhiBuilderPublicRouteCollisionRequest,
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
import { phiBuilderHistory, type PhiBuilderHistoryRecording } from "./history";
import type { PhiAreaRootRoute, PhiAreaMeta } from "../../../helpers/cms-area-config";

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
    signalWiring: {
      senderAddress: null,
      senderCapabilityId: null,
      receiverAddress: null,
      receiverCapabilityId: null,
      fieldKey: null,
    },
    effectsEditorRequest: null,
    publicRouteCollisionRequest: null,
    moduleDeactivationRequest: null,
    builderMode: "editor",
    search: "",
    darkMode: false,
    debugScaffold: false,
    commandWorkspace: null,
    builderChromeControls: createDefaultBuilderChromeControls(),
    pickerWidgetCategoryFilters: [],
    areaRootRouteDrafts: {},
    areaRootRoutes: {},
    areaMetaDrafts: {},
    areaMeta: {},
    areaControllerSettings: {},
    pageControllerSettings: {},
    deletedPageDrafts: {},
    draftAllocations: {},
    modulesDirtyAreas: [],
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
  target: PhiDeveloperBuilderEffectsRequest["target"],
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
    effectsEditorRequest: { correlationId, effects, target, preview: null },
  }));
}

/**
 * What the open editor shows now, for the canvas to draw while it is being chosen.
 *
 * Nothing is committed and no history entry is written: dragging a slider is one gesture and would
 * otherwise leave a hundred steps to undo, each of them a value nobody stopped at. The correlation is
 * checked because the editor that sent this may already be closed -- a late message from a gesture that
 * ended must not put a picture back on a node whose editor is gone.
 */
export function previewPhiDeveloperBuilderEffects(
  scopeKey: PhiDeveloperBuilderArea,
  correlationId: string,
  preview: PhiRenderableBlockEffects,
) {
  builderWorkspaceStore.patch(scopeKey, (current) => (
    current.effectsEditorRequest?.correlationId === correlationId
      ? { ...current, effectsEditorRequest: { ...current.effectsEditorRequest, preview } }
      : current
  ));
}

/**
 * The effects a node is drawn with while its editor stands open, or nothing where none is.
 *
 * The node names itself rather than asking whether it is selected, because the editor belongs to the
 * node whose toolbar opened it and the selection may have moved on.
 */
export function readPhiDeveloperBuilderEffectsPreview(
  state: PhiDeveloperBuilderState,
  kind: PhiDeveloperBuilderNodeKind,
  blockId: PhiCmsInstanceId | null,
): PhiRenderableBlockEffects | null {
  const request = state.effectsEditorRequest;
  if (!request?.preview) return null;
  return request.target.kind === kind && request.target.blockId === blockId ? request.preview : null;
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

/**
 * The question a Module's switch could not answer on its own.
 *
 * Opening it changes nothing about the Site: the request holds what was asked for -- which Module, for
 * which Areas, and which addresses are contested -- and the answer is what enables the Module. A second
 * question replaces the first, because there is only one dialog and only one gesture behind it.
 */
export function openPhiBuilderPublicRouteCollisionRequest(
  scopeKey: PhiDeveloperBuilderArea,
  request: Omit<PhiBuilderPublicRouteCollisionRequest, "correlationId">,
) {
  const correlationId = createPhiSignalCorrelationId();
  builderWorkspaceStore.patch(scopeKey, (current) => ({
    ...current,
    publicRouteCollisionRequest: { ...request, correlationId },
  }));
  return correlationId;
}

/** The address being typed for one contested route. */
export function answerPhiBuilderPublicRouteCollision(
  scopeKey: PhiDeveloperBuilderArea,
  presetKey: string,
  path: string,
) {
  builderWorkspaceStore.patch(scopeKey, (current) => {
    const request = current.publicRouteCollisionRequest;
    if (!request) {
      return current;
    }
    return {
      ...current,
      publicRouteCollisionRequest: {
        ...request,
        answers: request.answers.map((answer) =>
          answer.presetKey === presetKey ? { ...answer, path } : answer),
      },
    };
  });
}

/**
 * What switching a Module off takes off the Site, put to the person doing it.
 *
 * Opened only when there is something to say: a Module nothing draws from is switched off without a
 * word, because a dialog that always says "nothing happens" is a dialog nobody reads.
 */
export function openPhiBuilderModuleDeactivationRequest(
  scopeKey: PhiDeveloperBuilderArea,
  request: Omit<PhiBuilderModuleDeactivationRequest, "correlationId">,
) {
  const correlationId = createPhiSignalCorrelationId();
  builderWorkspaceStore.patch(scopeKey, (current) => ({
    ...current,
    moduleDeactivationRequest: { ...request, correlationId },
  }));
  return correlationId;
}

export function closePhiBuilderModuleDeactivationRequest(scopeKey: PhiDeveloperBuilderArea) {
  builderWorkspaceStore.patch(scopeKey, (current) =>
    current.moduleDeactivationRequest === null
      ? current
      : { ...current, moduleDeactivationRequest: null });
}

export function closePhiBuilderPublicRouteCollisionRequest(scopeKey: PhiDeveloperBuilderArea) {
  builderWorkspaceStore.patch(scopeKey, (current) =>
    current.publicRouteCollisionRequest === null
      ? current
      : { ...current, publicRouteCollisionRequest: null });
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
  "unresolvedModuleIdsByArea",
  "serverUnavailableModules",
  "publicRouteClaims",
  "publicRoutePaths",
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

/**
 * A Widget asking the Builder Controller to restrict the chrome for its page. It is sent under the
 * Widget's own address: the Controller does not answer what was sent under its own.
 */
export function emitPhiBuilderChromeControlsSignal(
  emitSignal: PhiSignalDispatch,
  sender: PhiSignalSender,
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
    sender,
    receiver: "broadcast",
    meta: { sourceLabel: `${scope.area}:${scope.pageKey}` },
    timestamp: Date.now(),
  });
}

type PhiBuilderRegionDraftMutationOptions = {
  history?: PhiBuilderHistoryRecording | null;
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

  if (options?.history) {
    phiBuilderHistory.record(options.history.context, {
      action: options.history.action,
      ...(options.history.coalesceKey ? { coalesceKey: options.history.coalesceKey } : {}),
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
  const rootNode = draft.rootNode ? pruneLayoutNodeSignalRoutes(draft.rootNode, targets) : draft.rootNode;
  const regionConfig = draft.regionConfig
    ? prunePhiSignalRoutesFromConfig(draft.regionConfig, targets)
    : draft.regionConfig;

  return rootNode === draft.rootNode && regionConfig === draft.regionConfig
    ? draft
    : { ...draft, rootNode, regionConfig };
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
  history,
}: {
  draftKey: string;
  draft: PhiDeveloperBuilderRegionDraft;
  area: PhiDeveloperBuilderArea;
  pageKey: string;
  targets: readonly PhiSignalRouteReceiverTarget[];
  history?: PhiBuilderHistoryRecording | null;
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

  if (history && nextDraftsSnapshot !== previousDrafts) {
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
    phiBuilderHistory.record(history.context, {
      action: history.action,
      ...(history.coalesceKey ? { coalesceKey: history.coalesceKey } : {}),
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
  options: { history: PhiBuilderHistoryRecording },
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
  phiBuilderHistory.record(options.history.context, {
    action: options.history.action,
    before: { kind: "regionDrafts", drafts: before },
    after: { kind: "regionDrafts", drafts: after },
  });
}

/**
 * What the Areas answered, as the server sent it with the workspace.
 *
 * Replaces the baseline whole rather than merging: it is one server answer about every Area, and half
 * of an older one beside half of a newer one would be a state no Site was ever in.
 */
export function setPhiDeveloperBuilderAreaRootRoutes(
  areaRootRoutes: Record<string, PhiAreaRootRoute | null>,
) {
  builderWorkspaceStore.patch("public", (current) =>
    JSON.stringify(current.areaRootRoutes) === JSON.stringify(areaRootRoutes)
      ? current
      : { ...current, areaRootRoutes });
}

/**
 * What an Area's root does right now: this session's answer, or the one it arrived with.
 *
 * `undefined` in the drafts is an Area nobody touched, which is why it cannot simply be defaulted --
 * `null` there is a Builder asking for the code-owned preset back, and that is a different sentence
 * from never having been asked.
 */
export function readPhiBuilderEffectiveAreaRootRoute(
  state: Pick<PhiDeveloperBuilderWorkspaceState, "areaRootRouteDrafts" | "areaRootRoutes">,
  area: string,
): PhiAreaRootRoute | null {
  const draft = state.areaRootRouteDrafts?.[area];
  return draft !== undefined ? draft : state.areaRootRoutes?.[area] ?? null;
}

/**
 * The Area's stored answers moved forward to what a save has just written.
 *
 * The baseline otherwise only changes when the server sends the workspace again, and the Builder's
 * chrome is one layout across `/shells` and `/pages`: walking between them re-renders neither, so a
 * saved root route stayed invisible to the Page list until a full reload. Since `/pages` deliberately
 * reads the stored answer rather than the one being edited, that is the moment it has to learn it.
 *
 * Only ever called with what a write returned successfully, which is why this states the baseline
 * rather than guessing at it: the value that was sent is the value the server now holds.
 */
export function commitPhiDeveloperBuilderAreaConfig(
  area: PhiDeveloperBuilderArea,
  committed: { rootRoute: PhiAreaRootRoute | null; meta: PhiAreaMeta | null },
) {
  builderWorkspaceStore.patch("public", (current) => {
    const rootRoutes = { ...current.areaRootRoutes, [area]: committed.rootRoute };
    const areaMeta = { ...current.areaMeta, [area]: committed.meta };
    return JSON.stringify(current.areaRootRoutes) === JSON.stringify(rootRoutes) &&
      JSON.stringify(current.areaMeta) === JSON.stringify(areaMeta)
      ? current
      : { ...current, areaRootRoutes: rootRoutes, areaMeta };
  });
}

/**
 * The answer the Area has written down, which is not always the one being edited.
 *
 * `/pages` reads this rather than the effective one above. The two workspaces do not share a moment:
 * a Select in `/shells` that has been changed but not saved exists nowhere except in this session, so
 * a Page offered on the strength of it is a Page the server does not serve -- and authoring there
 * writes a revision for a root nobody is drawn. Two Modules can each hold a `/` of their own that way,
 * both edited, one displayed.
 *
 * Saving is what makes the answer visible here, because saving is what makes it visible to the server:
 * from that moment both halves read one revision and cannot disagree about which Page `/` is.
 */
export function readPhiBuilderStoredAreaRootRoute(
  state: Pick<PhiDeveloperBuilderWorkspaceState, "areaRootRoutes">,
  area: string,
): PhiAreaRootRoute | null {
  return state.areaRootRoutes?.[area] ?? null;
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

/** What the Areas answered about being found, as the server sent it with the workspace. */
export function setPhiDeveloperBuilderAreaMetaBaseline(
  areaMeta: Record<string, PhiAreaMeta | null>,
) {
  builderWorkspaceStore.patch("public", (current) =>
    JSON.stringify(current.areaMeta) === JSON.stringify(areaMeta)
      ? current
      : { ...current, areaMeta });
}

/** What each Area's Shell tells its Controllers, as the server sent it with the workspace. */
export function setPhiDeveloperBuilderAreaControllerSettings(
  settingsByArea: Record<string, PhiCmsTreeControllerSettings>,
) {
  builderWorkspaceStore.patch("public", (current) =>
    JSON.stringify(current.areaControllerSettings) === JSON.stringify(settingsByArea)
      ? current
      : { ...current, areaControllerSettings: settingsByArea });
}

/** What a Page tells its Controllers, by its Page meta draft key, as the server sent it with the Page. */
export function setPhiDeveloperBuilderPageControllerSettings(
  draftKey: string,
  settings: PhiCmsTreeControllerSettings,
) {
  builderWorkspaceStore.patch("public", (current) =>
    JSON.stringify(current.pageControllerSettings[draftKey]) === JSON.stringify(settings)
      ? current
      : { ...current, pageControllerSettings: { ...current.pageControllerSettings, [draftKey]: settings } });
}

/** What an Area says about being found right now: this session's answer, or the one it arrived with. */
export function readPhiBuilderEffectiveAreaMeta(
  state: Pick<PhiDeveloperBuilderWorkspaceState, "areaMetaDrafts" | "areaMeta">,
  area: string,
): PhiAreaMeta | null {
  const draft = state.areaMetaDrafts?.[area];
  return draft !== undefined ? draft : state.areaMeta?.[area] ?? null;
}

/**
 * The Area's SEO answers, as the Builder is editing them.
 *
 * Written key by key rather than whole, because the two switches are answered one at a time and the
 * one nobody touched must keep saying what it said.
 */


/**
 * The Area's SEO answers put back as they were, which the merging setter above cannot do.
 *
 * Editing answers one switch at a time and merges; undo restores a whole state, including the state of
 * never having been asked. Same distinction as the root route: `undefined` removes the entry, `null`
 * is an Area that stated it has nothing to say.
 */
export function restorePhiDeveloperBuilderAreaMeta(
  area: PhiDeveloperBuilderArea,
  meta: PhiAreaMeta | null | undefined,
) {
  builderWorkspaceStore.patch("public", (current) => {
    const next = { ...current.areaMetaDrafts };
    if (meta === undefined) {
      delete next[area];
    } else {
      next[area] = meta;
    }
    return { ...current, areaMetaDrafts: next };
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

/**
 * A derived reading of the region drafts. The caller renders when the selected value changes and not
 * when any draft does -- which is what a Canvas asking "which of my drafts are missing" needs, and what
 * subscribing to the whole map could not give it.
 */
export function usePhiDeveloperRegionDraftsValue<TSelected>(
  selector: (drafts: Record<string, PhiDeveloperBuilderRegionDraft>) => TSelected,
) {
  return builderRegionDraftStore.useStoreSelector("default", selector);
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
