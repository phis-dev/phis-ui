"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { createPhiSignalAddress, createPhiSignalSubcontrolAddress, PHI_SIGNAL_VALUE_SCHEMAS } from "../../../types/signals";
import { readPhiTableBindingParamsSignalValue } from "../../../types/table-widget";
import type {
  PhiRuntimeModuleDefinition,
  PhiRuntimeModuleId,
} from "../../../types/cms-plugins";
import { readPhiCmsInstanceId } from "../../../types/cms-instance-id";
import {
  usePhiSignalDispatcher,
  usePhiSignalListener,
} from "../../../components/runtime/runtime-signal-bus";
import { usePhiApplicationFeedback } from "../../../components/runtime/use-phi-application-feedback";
import { resolvePhiRuntimeModuleIdsForArea } from "../../../plugins/runtime-modules/settings";
import type { PhiAnchorWidgetPlacement } from "../../../components/controls/phi-anchor-control-contract";
import {
  PHI_BUILDER_PREVIEW_SEARCH_PARAM,
} from "./preview-transport";
import {
  PHI_BUILDER_AREA_SEARCH_PARAM,
  PHI_BUILDER_NAVIGATION_KEY_SEARCH_PARAM,
  PHI_BUILDER_PAGE_SEARCH_PARAM,
  PHI_BUILDER_RUNTIME_MODULES_SEARCH_PARAM,
  normalizePhiBuilderAreaSearchParam,
  normalizePhiBuilderPageSearchParam,
  serializePhiBuilderRuntimeModuleIdsSearchParam,
} from "../../../helpers/cms-scope-search-params";
import { createPhiBuilderControllerAddress } from "./controller/address";
import {
  readPhiBuilderInspectorAction,
} from "./inspector-actions";
import {
  createEmptyPhiBuilderModulePresetPagesByArea,
  resolvePhiBuilderActivePageCatalog,
  resolvePhiBuilderPageKeyFromStoragePath,
  type PhiPresetPageNode,
} from "../../../helpers/cms-page-catalog";
import { loadPhiBuilderPersistedPageCatalog } from "./page-catalog-client";
import type {
  PhiCmsResolvedNavigationItem,
  PhiCmsResolvedNavigationSurface,
} from "../../../types/cms-module-descriptors";
import {
  isPhiBuilderAreaKey,
  resolvePhiBuilderAreaAsCmsArea,
} from "../../../constants/cms-areas";
import {
  isPhiRuntimeAreaBaseModuleId,
  resolvePhiRuntimeAreaDefinition,
} from "../../../plugins/runtime-modules/area-definitions";
import { resolvePhiBuilderNavigationWidgetNavKey } from "./navigation-widget-runtime";
import { parsePhiBuilderNavigationScopeKey } from "../../../helpers/cms-navigation-catalog";
import type {
  PhiBuilderChromeControls,
  PhiDeveloperBuilderArea,
  PhiDeveloperBuilderMode,
  PhiDeveloperBuilderNodeKind,
  PhiDeveloperBuilderRegionDraft,
} from "./developer-workspace-types";
import {
  builderWorkspaceStore,
  usePhiDeveloperBuilderWorkspaceState,
  completePhiDeveloperBuilderEffectsEditor,
  createDefaultBuilderChromeControls,
  normalizePhiDeveloperBuilderArea as normalizeBuilderArea,
  selectPhiDeveloperBuilderNode,
  usePhiDeveloperRegionDraft,
  getPhiDeveloperBuilderStateSnapshot,
} from "./developer-workspace-store";
import { getPhiBuilderRegionDraftKey } from "./region-keys";
import { getDefaultRegionDraft } from "./developer-region-drafts";
import {
  resolvePhiDeveloperBuilderCommandWorkspace,
  resolvePhiDeveloperBuilderRouteScope,
} from "./route-scope";
import {
  usePhiDeveloperBuilderPreviewModeController,
} from "./preview-controller";
import { runPhiDeveloperBuilderInspectorAction } from "./inspector-controller";
import {
  PHI_BUILDER_SIGNAL_WIRING_FORM_CONTROLLER_ADDRESS,
  patchPhiBuilderSignalWiringSession,
  resetPhiBuilderSignalWiringSession,
  resolvePhiBuilderSignalWiringRoutes,
  resolvePhiBuilderSignalWiringRoutesWithout,
} from "./signal-wiring-controller";
import { readPhiTableActionSignalValue } from "../../../types/table-widget";
import { usePhiBuilderPageController } from "./page-controller";
import {
  PHI_BUILDER_EFFECTS_FORM_WIDGET_IDS,
  PHI_BUILDER_INSPECTOR_DRAWER_OVERLAY_IDS,
  PHI_BUILDER_INSPECTOR_OVERLAY_IDS,
  PHI_BUILDER_INSPECTOR_WIDGET_IDS,
} from "./inspector-overlay-addresses";
import { readPhiRuntimeFormValuesSignalValue } from "../../../components/forms/runtime-form-state";
import {
  PHI_BUILDER_EFFECTS_SECTIONS,
  mergePhiBuilderEffectsFormValues,
  splitPhiBuilderEffectsFormValues,
  type PhiBuilderEffectsSection,
} from "./effects-form-values";
import {
  usePhiBuilderDraftCommandController,
  type PhiDeveloperBuilderToolbarCommand,
} from "./draft-command-controller";
import {
  applyPhiDeveloperBuilderSiderLeftMode,
} from "./region-controller";
import {
  capturePhiBuilderWorkspaceHistoryState,
  createPhiBuilderHistoryContext,
  phiBuilderHistory,
} from "./history";
import { createPhiCommandToolbarControlAddress } from "../../../components/widgets/signals/command-toolbar-address";
import { PHI_BUILDER_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/builder/ids";
import { usePhiSignalInstancesReady, usePhiSignalReceiverReady } from "../../../components/runtime/runtime-signal-registry";
import { createPhiRuntimeFormControllerAddress } from "../../../components/forms/runtime-form-controller-address";
import type { PhiWorkspaceCatalogState } from "../../../components/workspace/catalog-state";
import { phiWorkspaceCatalogStore } from "../../../components/workspace/catalog-store";
import { PHI_BUILDER_STRUCTURE_RUNTIME_MODULES_WIDGET_ID } from "./area-addresses";
import {
  PHI_BUILDER_PAGE_META_DEFAULT_PRESENTATION_LABELS,
  type PhiBuilderPageMetaPresentationLabels,
} from "./controller/definition";

type PhiDeveloperBuilderWorkspaceControllerOptions = {
  shellPresetDraftsByArea?: Record<string, Record<string, PhiDeveloperBuilderRegionDraft>>;
  runtimeModuleDefinitions?: readonly PhiRuntimeModuleDefinition[];
  runtimeModuleIdsByArea?: Record<string, PhiRuntimeModuleId[]>;
  modulePresetPagesByArea?: PhiWorkspaceCatalogState["modulePresetPagesByArea"];
  areaPresetSourcesByArea?: PhiWorkspaceCatalogState["areaPresetSourcesByArea"];
  navigationSurfacesByArea?: PhiWorkspaceCatalogState["navigationSurfacesByArea"];
  pageMetaLabels?: PhiBuilderPageMetaPresentationLabels;
};
const EMPTY_RUNTIME_MODULE_IDS_BY_AREA: Partial<Record<PhiDeveloperBuilderArea, PhiRuntimeModuleId[]>> = {};
const EMPTY_MODULE_PRESET_PAGES_BY_AREA = createEmptyPhiBuilderModulePresetPagesByArea();
export type {
  PhiBuilderPageRegionKey,
  PhiBuilderRegionKey,
  PhiBuilderShellRegionKey,
} from "./region-keys";

function readPhiDeveloperBuilderToolbarCommand(value: unknown): PhiDeveloperBuilderToolbarCommand | null {
  if (
    value === "save" ||
    value === "preview" ||
    value === "publish" ||
    value === "undo" ||
    value === "redo" ||
    value === "reset"
  ) {
    return value;
  }

  return null;
}

function serializeRuntimeModuleIds(moduleIds: readonly PhiRuntimeModuleId[] | null | undefined) {
  return JSON.stringify(moduleIds ?? []);
}

function serializeRuntimeModuleDefinitions(
  definitions: readonly PhiRuntimeModuleDefinition[] | null | undefined,
) {
  return JSON.stringify(definitions ?? []);
}

function areRuntimeModuleIdsEqual(
  left: readonly PhiRuntimeModuleId[] | null | undefined,
  right: readonly PhiRuntimeModuleId[] | null | undefined,
) {
  return serializeRuntimeModuleIds(left) === serializeRuntimeModuleIds(right);
}

function selectRuntimeModuleIds(
  moduleIds: readonly PhiRuntimeModuleId[] | null | undefined,
  area: PhiDeveloperBuilderArea,
  definitions: readonly PhiRuntimeModuleDefinition[],
) {
  return resolvePhiRuntimeModuleIdsForArea(area, moduleIds, definitions);
}

function normalizeRuntimeModuleSelection(
  selectedIds: readonly string[],
  area: PhiDeveloperBuilderArea,
  definitions: readonly PhiRuntimeModuleDefinition[],
): PhiRuntimeModuleId[] {
  const definitionsById = new Map(definitions.map((definition) => [definition.moduleId, definition] as const));
  const selectedIdSet = new Set(selectedIds);
  const invalidIds = selectedIds.filter((moduleId) => !definitionsById.has(moduleId as PhiRuntimeModuleId));
  if (invalidIds.length > 0) {
    throw new Error(`Unknown runtime module "${invalidIds[0]}".`);
  }
  const cmsArea = resolvePhiBuilderAreaAsCmsArea(area);
  const baseModuleId = resolvePhiRuntimeAreaDefinition(cmsArea).baseModuleId;
  const foreignBaseModuleId = selectedIds.find((moduleId) =>
    isPhiRuntimeAreaBaseModuleId(moduleId) && moduleId !== baseModuleId,
  );
  if (foreignBaseModuleId) {
    throw new Error(
      `Base module "${foreignBaseModuleId}" does not belong to Area "${cmsArea}".`,
    );
  }

  return resolvePhiRuntimeModuleIdsForArea(
    area,
    definitions.filter((definition) =>
      definition.kind === "module" &&
      definition.moduleId !== baseModuleId &&
      selectedIdSet.has(definition.moduleId),
    )
      .map((definition) => definition.moduleId),
    definitions,
  );
}

function resolveRuntimeModuleSelectionDisplay(
  selectedIds: readonly PhiRuntimeModuleId[],
  area: PhiDeveloperBuilderArea,
  definitions: readonly PhiRuntimeModuleDefinition[],
): PhiRuntimeModuleId[] {
  const cmsArea = resolvePhiBuilderAreaAsCmsArea(area);
  const baseModuleId = resolvePhiRuntimeAreaDefinition(cmsArea).baseModuleId;
  return [
    ...definitions
      .filter((definition) => definition.kind === "platform")
      .map((definition) => definition.moduleId),
    baseModuleId,
    ...selectedIds,
  ];
}

function resolveBuilderActiveModuleIds(
  area: PhiDeveloperBuilderArea,
  moduleIds: readonly PhiRuntimeModuleId[] | null | undefined,
  definitions: readonly PhiRuntimeModuleDefinition[],
) {
  const cmsArea = resolvePhiBuilderAreaAsCmsArea(area);
  const activeModuleIds = new Set<PhiRuntimeModuleId>([
    resolvePhiRuntimeAreaDefinition(cmsArea).baseModuleId,
    ...definitions
      .filter((definition) => definition.kind === "platform")
      .map((definition) => definition.moduleId),
    ...selectRuntimeModuleIds(moduleIds, area, definitions),
  ]);
  return activeModuleIds;
}

function filterPresetPageNodes(
  nodes: readonly PhiPresetPageNode[],
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>,
): PhiPresetPageNode[] {
  return nodes.flatMap((node) => {
    if (node.sourcePreset && !activeModuleIds.has(node.sourcePreset.ownerModuleId)) {
      return [];
    }
    const children = filterPresetPageNodes(node.children ?? [], activeModuleIds);
    if (!node.sourcePreset && node.children && children.length === 0) {
      return [];
    }
    return [{ ...node, ...(node.children ? { children } : {}) }];
  });
}

function filterNavigationItems(
  items: readonly PhiCmsResolvedNavigationItem[],
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>,
): PhiCmsResolvedNavigationItem[] {
  return items.flatMap((item) => {
    if (item.ownerModuleId && !activeModuleIds.has(item.ownerModuleId)) {
      return [];
    }
    return [{ ...item, children: filterNavigationItems(item.children, activeModuleIds) }];
  });
}

function filterBuilderModuleCatalogs(
  modulePresetPagesByArea: PhiWorkspaceCatalogState["modulePresetPagesByArea"],
  navigationSurfacesByArea: PhiWorkspaceCatalogState["navigationSurfacesByArea"],
  runtimeModuleIdsByArea: Partial<Record<PhiDeveloperBuilderArea, PhiRuntimeModuleId[]>>,
  definitions: readonly PhiRuntimeModuleDefinition[],
) {
  const filteredPages = createEmptyPhiBuilderModulePresetPagesByArea();
  const filteredNavigation: Partial<
    Record<PhiDeveloperBuilderArea, readonly PhiCmsResolvedNavigationSurface[]>
  > = {};
  for (const area of Object.keys(filteredPages) as PhiDeveloperBuilderArea[]) {
    const activeModuleIds = resolveBuilderActiveModuleIds(
      area,
      runtimeModuleIdsByArea[area],
      definitions,
    );
    filteredPages[area] = filterPresetPageNodes(
      modulePresetPagesByArea[area] ?? [],
      activeModuleIds,
    );
    filteredNavigation[area] = (navigationSurfacesByArea[area] ?? []).map((surface) => ({
      ...surface,
      items: filterNavigationItems(surface.items, activeModuleIds),
    }));
  }
  return {
    modulePresetPagesByArea: filteredPages,
    navigationSurfacesByArea: filteredNavigation,
  };
}

function usePhiDeveloperBuilderWorkspaceController(
  defaultArea: PhiDeveloperBuilderArea,
  options: PhiDeveloperBuilderWorkspaceControllerOptions = {},
) {
  const { showMessage } = usePhiApplicationFeedback();
  const dispatchSignal = usePhiSignalDispatcher();
  const effectsWorkflowCorrelationRef = useRef<string | null>(null);
  const initializedEffectsCorrelationRef = useRef<string | null>(null);
  const effectsFormSubmissionRef = useRef<{
    correlationId: string;
    values: Partial<Record<PhiBuilderEffectsSection, unknown>>;
  } | null>(null);
  const {
    shellPresetDraftsByArea = {},
    runtimeModuleDefinitions = [],
    runtimeModuleIdsByArea = {},
    modulePresetPagesByArea = EMPTY_MODULE_PRESET_PAGES_BY_AREA,
    areaPresetSourcesByArea = {},
    navigationSurfacesByArea = {},
    pageMetaLabels = PHI_BUILDER_PAGE_META_DEFAULT_PRESENTATION_LABELS,
  } = options;
  const state = usePhiDeveloperBuilderWorkspaceState(defaultArea);
  const effectsFormRuntimeAddresses = useMemo(() => PHI_BUILDER_EFFECTS_SECTIONS.flatMap((section) => {
    const widgetId = PHI_BUILDER_EFFECTS_FORM_WIDGET_IDS[section];
    return [
      createPhiSignalAddress("cms", widgetId),
      createPhiRuntimeFormControllerAddress(`widget-${widgetId}`),
    ];
  }), []);
  const effectsOverlayAddress = createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_OVERLAY_IDS.effectsEditor);
  const effectsFormsReady = usePhiSignalInstancesReady(effectsFormRuntimeAddresses);
  const effectsOverlayReady = usePhiSignalReceiverReady(effectsOverlayAddress);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const commandWorkspace = resolvePhiDeveloperBuilderCommandWorkspace(pathname);
  const isNavigationWorkspace = typeof pathname === "string" && pathname.includes("/builder/navigation");
  const isBuilderWorkspace =
    typeof pathname === "string" &&
    (pathname.includes("/builder/shells") ||
      pathname.includes("/builder/pages") ||
      pathname.includes("/builder/media") ||
      pathname.includes("/builder/navigation") ||
      pathname.includes("/builder/theme") ||
      pathname.includes("/builder/revisions"));
  const hasPreviewSnapshot = searchParams.has(PHI_BUILDER_PREVIEW_SEARCH_PARAM);
  const scopeAreaFromSearch = normalizePhiBuilderAreaSearchParam(
    searchParams.get(PHI_BUILDER_AREA_SEARCH_PARAM),
  );
  const scopePageFromSearch = normalizePhiBuilderPageSearchParam(
    searchParams.get(PHI_BUILDER_PAGE_SEARCH_PARAM),
  );
  const { enterEditor, enterPreview } = usePhiDeveloperBuilderPreviewModeController(state);
  const effectiveArea = scopeAreaFromSearch ?? state.area;
  const effectivePageKey = scopePageFromSearch ?? state.pageKey;
  const siderLeftDraftKey = getPhiBuilderRegionDraftKey(
    effectiveArea,
    "sider_left",
    effectivePageKey,
  );
  const siderLeftDraft = usePhiDeveloperRegionDraft(siderLeftDraftKey);
  const resolvedSiderLeftDraft =
    siderLeftDraft ??
    shellPresetDraftsByArea[effectiveArea]?.[siderLeftDraftKey] ??
    getDefaultRegionDraft("sider_left");
  const siderLeftFullHeight = resolvedSiderLeftDraft.regionConfig?.fullHeight === true;
  const handledSiderLayoutRef = useRef<{
    draftKey: string;
    fullHeight: boolean;
  } | null>(null);
  const effectiveNavKey = resolvePhiBuilderNavigationWidgetNavKey(
    null,
    searchParams.get(PHI_BUILDER_NAVIGATION_KEY_SEARCH_PARAM),
    effectiveArea,
  );
  const {
    currentPageTree,
    emitPageTitleInputValue,
    navigateToBuilderPage,
    openPageMetaDialog,
    pageMetaDialog,
  } = usePhiBuilderPageController({
    defaultArea,
    effectiveArea,
    effectivePageKey,
    pageMetaLabels,
    state,
  });
  const { confirmResetPage, runBuilderCommand } = usePhiBuilderDraftCommandController({
    commandWorkspace,
    defaultArea,
    effectiveArea,
    effectiveNavKey,
    effectivePageKey,
    pathname,
    shellPresetDraftsByArea,
    state,
  });
  const currentRuntimeModuleIdsByArea =
    state.runtimeModuleIdsByArea ?? EMPTY_RUNTIME_MODULE_IDS_BY_AREA;
  const activePreloadCatalogs = useMemo(
    () => filterBuilderModuleCatalogs(
      modulePresetPagesByArea,
      navigationSurfacesByArea,
      runtimeModuleIdsByArea,
      runtimeModuleDefinitions,
    ),
    [
      modulePresetPagesByArea,
      navigationSurfacesByArea,
      runtimeModuleDefinitions,
      runtimeModuleIdsByArea,
    ],
  );
  const runtimeModuleIdsPreloadKey = serializeRuntimeModuleIds(
    Object.values(runtimeModuleIdsByArea).flat(),
  );
  const runtimeModuleDefinitionsPreloadKey = serializeRuntimeModuleDefinitions(runtimeModuleDefinitions);
  const modulePresetPagesPreloadKey = JSON.stringify(activePreloadCatalogs.modulePresetPagesByArea);
  const areaPresetSourcesPreloadKey = JSON.stringify(areaPresetSourcesByArea);
  const navigationSurfacesPreloadKey = JSON.stringify(activePreloadCatalogs.navigationSurfacesByArea);

  const signalWiringOverlayAddress = createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_OVERLAY_IDS.signalWiring);
  const signalWiringFormAddress = createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_WIDGET_IDS.signalWiringForm);
  const signalWiringReady = usePhiSignalInstancesReady(
    useMemo(() => [signalWiringOverlayAddress, signalWiringFormAddress], [signalWiringFormAddress, signalWiringOverlayAddress]),
  );
  const openedSignalWiringCorrelationRef = useRef<string | null>(null);

  useEffect(() => {
    const request = state.signalWiringRequest;
    if (!request || !signalWiringReady || openedSignalWiringCorrelationRef.current === request.correlationId) {
      return;
    }
    openedSignalWiringCorrelationRef.current = request.correlationId;
    // A wiring session belongs to the block it was opened on, so it starts empty every time.
    resetPhiBuilderSignalWiringSession(defaultArea);
    dispatchSignal({
      scope: "area",
      channel: "reset",
      action: "activate",
      value: null,
      valueType: "none",
      correlationId: request.correlationId,
      sender: createPhiBuilderControllerAddress(),
      receiver: signalWiringFormAddress,
      timestamp: Date.now(),
    });
    // The Table is mounted eagerly with the overlay, so its rows may still belong to the block wired
    // last time; opening on a new one has to ask for them again.
    dispatchSignal({
      scope: "area",
      channel: "reload",
      action: "activate",
      value: null,
      valueType: "none",
      correlationId: request.correlationId,
      sender: createPhiBuilderControllerAddress(),
      receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_WIDGET_IDS.signalWiringRoutes),
      timestamp: Date.now(),
    });
    queueMicrotask(() => dispatchSignal({
      scope: "area",
      channel: "dialog",
      action: "activate",
      value: null,
      valueType: "none",
      correlationId: request.correlationId,
      sender: createPhiBuilderControllerAddress(),
      receiver: signalWiringOverlayAddress,
      timestamp: Date.now(),
    }));
  }, [defaultArea, dispatchSignal, signalWiringFormAddress, signalWiringOverlayAddress, signalWiringReady, state.signalWiringRequest]);

  useEffect(() => {
    const request = state.effectsEditorRequest;
    if (!request || !effectsFormsReady || !effectsOverlayReady ||
      initializedEffectsCorrelationRef.current === request.correlationId) return;
    effectsWorkflowCorrelationRef.current = request.correlationId;
    initializedEffectsCorrelationRef.current = request.correlationId;
    const valuesBySection = splitPhiBuilderEffectsFormValues(request.effects);
    for (const section of PHI_BUILDER_EFFECTS_SECTIONS) {
      const widgetId = PHI_BUILDER_EFFECTS_FORM_WIDGET_IDS[section];
      dispatchSignal({
        scope: "area",
        channel: "values",
        action: "change",
        value: { values: valuesBySection[section] },
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
        correlationId: request.correlationId,
        sender: createPhiBuilderControllerAddress(),
        receiver: createPhiRuntimeFormControllerAddress(`widget-${widgetId}`),
        timestamp: Date.now(),
      });
    }
    queueMicrotask(() => dispatchSignal({
      scope: "area",
      channel: "dialog",
      action: "activate",
      value: null,
      valueType: "none",
      correlationId: request.correlationId,
      sender: createPhiBuilderControllerAddress(),
      receiver: effectsOverlayAddress,
      timestamp: Date.now(),
    }));
  }, [dispatchSignal, effectsFormsReady, effectsOverlayAddress, effectsOverlayReady, state.effectsEditorRequest]);

  useEffect(() => {
    const selectedOverlayId = state.nodeKind === "region"
      ? PHI_BUILDER_INSPECTOR_OVERLAY_IDS.regionInspector
      : state.nodeKind === "layout"
        ? PHI_BUILDER_INSPECTOR_OVERLAY_IDS.layoutInspector
        : state.nodeKind === "widget"
          ? PHI_BUILDER_INSPECTOR_OVERLAY_IDS.widgetInspector
          : null;
    for (const overlayId of PHI_BUILDER_INSPECTOR_DRAWER_OVERLAY_IDS) {
      dispatchSignal({
        scope: "area",
        channel: "dialog",
        action: state.inspectorOpen && overlayId === selectedOverlayId ? "activate" : "close",
        value: null,
        valueType: "none",
        sender: createPhiBuilderControllerAddress(),
        receiver: createPhiSignalAddress("cms", overlayId),
        timestamp: Date.now(),
      });
    }
  }, [dispatchSignal, state.inspectorOpen, state.nodeKind]);

  useEffect(() => {
    /*
     * Feeding the catalog is the Builder's job, but the catalog itself is not the Builder's state --
     * it lives in the Foundation so that revisions, and later the Editor, can read it without going
     * through here.
     */
    phiWorkspaceCatalogStore.patch(defaultArea, (current) => {
      let changed = false;
      const definitionsChanged =
        serializeRuntimeModuleDefinitions(current.runtimeModuleDefinitions) !== runtimeModuleDefinitionsPreloadKey;
      const modulePresetPagesChanged =
        JSON.stringify(current.modulePresetPagesByArea) !== modulePresetPagesPreloadKey;
      const areaPresetSourcesChanged =
        JSON.stringify(current.areaPresetSourcesByArea) !== areaPresetSourcesPreloadKey;
      const navigationSurfacesChanged =
        JSON.stringify(current.navigationSurfacesByArea) !== navigationSurfacesPreloadKey;
      const catalogHydrationChanged = !current.catalogHydrated;
      const initialPageKey = current.pageKey || activePreloadCatalogs.modulePresetPagesByArea[current.area][0]?.key || "";
      const initialPageChanged = initialPageKey !== current.pageKey;
      const nextModuleIdsByArea = {
        ...(current.runtimeModuleIdsByArea ?? {}),
      };

      for (const [area, moduleIds] of Object.entries(runtimeModuleIdsByArea)) {
        const builderArea = normalizeBuilderArea(area);
        if (!areRuntimeModuleIdsEqual(nextModuleIdsByArea[builderArea], moduleIds)) {
          nextModuleIdsByArea[builderArea] = moduleIds;
          changed = true;
        }
      }

      if (initialPageChanged) {
        // The selected node follows the page, and that selection is Builder tool state.
        builderWorkspaceStore.patch(defaultArea, (tool) => ({
          ...tool,
          nodeKey: `page:${initialPageKey}`,
        }));
      }

      return changed || definitionsChanged || modulePresetPagesChanged || areaPresetSourcesChanged || navigationSurfacesChanged || catalogHydrationChanged || initialPageChanged
        ? {
            ...current,
            ...(initialPageChanged ? { pageKey: initialPageKey } : {}),
            runtimeModuleDefinitions: [...runtimeModuleDefinitions],
            runtimeModuleIdsByArea: nextModuleIdsByArea,
            catalogHydrated: true,
            modulePresetPagesByArea: activePreloadCatalogs.modulePresetPagesByArea,
            areaPresetSourcesByArea,
            navigationSurfacesByArea: activePreloadCatalogs.navigationSurfacesByArea,
          }
        : current;
    });
  }, [
    defaultArea,
    runtimeModuleDefinitions,
    runtimeModuleDefinitionsPreloadKey,
    runtimeModuleIdsByArea,
    runtimeModuleIdsPreloadKey,
    modulePresetPagesByArea,
    modulePresetPagesPreloadKey,
    areaPresetSourcesByArea,
    areaPresetSourcesPreloadKey,
    activePreloadCatalogs,
    navigationSurfacesByArea,
    navigationSurfacesPreloadKey,
  ]);

  useEffect(() => {
    if (
      !isBuilderWorkspace ||
      !state.catalogHydrated ||
      state.pageCatalogHydratedByArea[effectiveArea]
    ) {
      return;
    }

    let cancelled = false;
    void loadPhiBuilderPersistedPageCatalog(effectiveArea)
      .then((pages) => {
        if (cancelled) return;
        phiWorkspaceCatalogStore.patch(defaultArea, (current) => ({
          ...current,
          persistedPageCatalogByArea: {
            ...current.persistedPageCatalogByArea,
            [effectiveArea]: pages,
          },
          pageCatalogHydratedByArea: {
            ...current.pageCatalogHydratedByArea,
            [effectiveArea]: true,
          },
        }));
      })
      .catch((error) => {
        if (!cancelled) {
          showMessage({
            level: "error",
            content: error instanceof Error ? error.message : "Failed to load page catalog.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    defaultArea,
    effectiveArea,
    isBuilderWorkspace,
    showMessage,
    state.catalogHydrated,
    state.pageCatalogHydratedByArea,
  ]);

  const currentRuntimeModuleIdsKey = JSON.stringify(currentRuntimeModuleIdsByArea);
  useEffect(() => {
    const activeCatalogs = filterBuilderModuleCatalogs(
      modulePresetPagesByArea,
      navigationSurfacesByArea,
      currentRuntimeModuleIdsByArea,
      runtimeModuleDefinitions,
    );
    phiWorkspaceCatalogStore.patch(defaultArea, (current) => {
      if (
        JSON.stringify(current.modulePresetPagesByArea) ===
          JSON.stringify(activeCatalogs.modulePresetPagesByArea) &&
        JSON.stringify(current.navigationSurfacesByArea) ===
          JSON.stringify(activeCatalogs.navigationSurfacesByArea)
      ) {
        return current;
      }
      return {
        ...current,
        modulePresetPagesByArea: activeCatalogs.modulePresetPagesByArea,
        navigationSurfacesByArea: activeCatalogs.navigationSurfacesByArea,
      };
    });
  }, [
    currentRuntimeModuleIdsByArea,
    currentRuntimeModuleIdsKey,
    defaultArea,
    modulePresetPagesByArea,
    navigationSurfacesByArea,
    runtimeModuleDefinitions,
    runtimeModuleDefinitionsPreloadKey,
  ]);

  const selectedRuntimeModuleIds = useMemo(
    () => selectRuntimeModuleIds(
      currentRuntimeModuleIdsByArea[effectiveArea],
      effectiveArea,
      runtimeModuleDefinitions,
    ),
    [currentRuntimeModuleIdsByArea, effectiveArea, runtimeModuleDefinitions],
  );
  const displayedRuntimeModuleIds = useMemo(
    () => resolveRuntimeModuleSelectionDisplay(
      selectedRuntimeModuleIds,
      effectiveArea,
      runtimeModuleDefinitions,
    ),
    [effectiveArea, runtimeModuleDefinitions, selectedRuntimeModuleIds],
  );
  const displayedRuntimeModuleIdsKey = displayedRuntimeModuleIds.join("\u001f");
  const runtimeModuleSelectorReady = usePhiSignalReceiverReady(
    createPhiSignalAddress("cms", PHI_BUILDER_STRUCTURE_RUNTIME_MODULES_WIDGET_ID),
  );
  const selectedRuntimeModuleIdsSearchValue = serializePhiBuilderRuntimeModuleIdsSearchParam(
    selectedRuntimeModuleIds,
  );

  useEffect(() => {
    if (
      typeof pathname !== "string" ||
      (!pathname.includes("/builder/shells") && !pathname.includes("/builder/pages")) ||
      searchParams.get(PHI_BUILDER_RUNTIME_MODULES_SEARCH_PARAM) === selectedRuntimeModuleIdsSearchValue
    ) {
      return;
    }
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set(
      PHI_BUILDER_RUNTIME_MODULES_SEARCH_PARAM,
      selectedRuntimeModuleIdsSearchValue,
    );
    router.replace(`${pathname}?${nextSearchParams.toString()}`, { scroll: false });
  }, [pathname, router, searchParams, selectedRuntimeModuleIdsSearchValue]);

  useEffect(() => {
    if (!pathname?.includes("/builder/shells") || !runtimeModuleSelectorReady) {
      return;
    }

    dispatchSignal({
      scope: "area",
      channel: "runtimeModules",
      action: "change",
      value: displayedRuntimeModuleIds,
      valueType: "string[]",
      sender: createPhiBuilderControllerAddress(),
      receiver: "broadcast",
      timestamp: Date.now(),
    });
  }, [dispatchSignal, displayedRuntimeModuleIds, displayedRuntimeModuleIdsKey, pathname, runtimeModuleSelectorReady]);

  useEffect(() => {
    if (!pathname?.includes("/builder/shells")) {
      return;
    }

    const handledSiderLayout = handledSiderLayoutRef.current;
    if (
      handledSiderLayout?.draftKey === siderLeftDraftKey &&
      handledSiderLayout.fullHeight === siderLeftFullHeight
    ) {
      handledSiderLayoutRef.current = null;
      return;
    }

    dispatchSignal({
      scope: "area",
      channel: "layout",
      action: "change",
      value: siderLeftFullHeight,
      valueType: "boolean",
      sender: createPhiBuilderControllerAddress(),
      receiver: "broadcast",
      timestamp: Date.now(),
    });
  }, [
    dispatchSignal,
    pathname,
    siderLeftDraftKey,
    siderLeftFullHeight,
  ]);

  useEffect(() => {
    if (state.commandWorkspace === commandWorkspace) {
      return;
    }

    builderWorkspaceStore.patch(defaultArea, (current) => ({
      ...current,
      commandWorkspace,
      builderChromeControls: createDefaultBuilderChromeControls(),
    }));
  }, [commandWorkspace, defaultArea, state.commandWorkspace]);

  useEffect(() => {
    if (
      commandWorkspace !== "structure" &&
      commandWorkspace !== "pages" &&
      commandWorkspace !== "navigation"
    ) {
      return;
    }

    const historyContext = createPhiBuilderHistoryContext({
      workspace: commandWorkspace,
      area: effectiveArea,
      pageKey: effectivePageKey,
      navKey: effectiveNavKey,
    });
    const presetKey =
      commandWorkspace === "structure"
        ? "builder-shells-page"
        : commandWorkspace === "pages"
          ? "builder-pages-page"
          : "builder-navigation-page";
    const emitAvailability = () => {
      const availability = phiBuilderHistory.getAvailability(historyContext);
      for (const [controlKey, enabled] of [
        ["undo", availability.canUndo],
        ["redo", availability.canRedo],
      ] as const) {
        dispatchSignal({
          scope: "area",
          channel: "enabled",
          action: "change",
          value: enabled,
          valueType: "boolean",
          sender: createPhiBuilderControllerAddress(),
          receiver: createPhiCommandToolbarControlAddress(
            PHI_BUILDER_RUNTIME_MODULE_ID,
            presetKey,
            controlKey,
          ),
          timestamp: Date.now(),
        });
      }
    };

    emitAvailability();
    return phiBuilderHistory.subscribe(historyContext, emitAvailability);
  }, [
    commandWorkspace,
    dispatchSignal,
    effectiveArea,
    effectiveNavKey,
    effectivePageKey,
  ]);

  useEffect(() => {
    if (!isBuilderWorkspace) {
      return;
    }

    const nextBuilderMode: PhiDeveloperBuilderMode =
      !isNavigationWorkspace && hasPreviewSnapshot ? "preview" : "editor";
    if (state.builderMode === nextBuilderMode) {
      return;
    }

    builderWorkspaceStore.patch(defaultArea, (current) => ({
      ...current,
      builderMode: nextBuilderMode,
    }));
  }, [defaultArea, hasPreviewSnapshot, isBuilderWorkspace, isNavigationWorkspace, state.builderMode]);

  useEffect(() => {
    if (!isBuilderWorkspace || !state.pageCatalogHydratedByArea[effectiveArea]) {
      return;
    }

    if (scopeAreaFromSearch == null || scopePageFromSearch == null) {
      if (typeof pathname !== "string") {
        return;
      }

      const canonicalArea = scopeAreaFromSearch ?? state.area;
      const canonicalPages = resolvePhiBuilderActivePageCatalog(
        canonicalArea,
        state.modulePresetPagesByArea,
        state.customPages,
        state.persistedPageCatalogByArea,
      );
      const canonicalPageKey =
        scopePageFromSearch ??
        (scopeAreaFromSearch != null && scopeAreaFromSearch !== state.area
          ? (canonicalPages[0]?.key ?? "")
          : state.pageKey);
      if (!canonicalPageKey) {
        return;
      }
      const nextSearchParams = new URLSearchParams(searchParams.toString());
      nextSearchParams.set(PHI_BUILDER_AREA_SEARCH_PARAM, canonicalArea);
      nextSearchParams.set(PHI_BUILDER_PAGE_SEARCH_PARAM, canonicalPageKey);
      router.replace(`${pathname}?${nextSearchParams.toString()}`, { scroll: false });
      return;
    }

    const nextArea = scopeAreaFromSearch ?? state.area;
    const nextPages = resolvePhiBuilderActivePageCatalog(
      nextArea,
      state.modulePresetPagesByArea,
      state.customPages,
      state.persistedPageCatalogByArea,
    );
    const nextPageKey =
      scopePageFromSearch ??
      (scopeAreaFromSearch != null && scopeAreaFromSearch !== state.area
        ? (nextPages[0]?.key ?? "")
        : state.pageKey);
    if (!nextPageKey) {
      return;
    }

    if (nextArea === state.area && nextPageKey === state.pageKey) {
      return;
    }

    phiWorkspaceCatalogStore.patch(defaultArea, (current) => ({
      ...current,
      area: nextArea,
      pageKey: nextPageKey,
    }));
    builderWorkspaceStore.patch(defaultArea, (current) => ({
      ...current,
      nodeKey: `page:${nextPageKey}`,
      nodeId: null,
      nodeKind: "page",
      selectedRegionType: null,
      selectedRegionKey: null,
      selectedRootRegionKey: null,
      inspectorOpen: false,
      sidebarKey: "pages",
      builderChromeControls: createDefaultBuilderChromeControls(),
    }));
  }, [
    defaultArea,
    isBuilderWorkspace,
    pathname,
    router,
    searchParams,
    scopeAreaFromSearch,
    scopePageFromSearch,
    state.area,
    state.pageCatalogHydratedByArea,
    state.modulePresetPagesByArea,
    state.customPages,
    state.persistedPageCatalogByArea,
    state.pageKey,
    effectiveArea,
  ]);

  usePhiSignalListener(
    (signal) => {
      const effectsRequest = state.effectsEditorRequest;
      if (
        effectsRequest &&
        signal.correlationId === effectsRequest.correlationId &&
        signal.channel === "effectsCommit" &&
        signal.action === "change" &&
        signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.formValues
      ) {
        const submitted = readPhiRuntimeFormValuesSignalValue(signal.value);
        const nextEffects = submitted?.values.effects;
        completePhiDeveloperBuilderEffectsEditor(
          defaultArea,
          effectsRequest,
          nextEffects && typeof nextEffects === "object" && !Array.isArray(nextEffects)
            ? nextEffects
            : undefined,
        );
        initializedEffectsCorrelationRef.current = null;
        return;
      }
      if (
        effectsRequest &&
        signal.correlationId === effectsRequest.correlationId &&
        signal.channel === "effectsCancel" &&
        signal.action === "close"
      ) {
        completePhiDeveloperBuilderEffectsEditor(defaultArea, effectsRequest);
        initializedEffectsCorrelationRef.current = null;
        return;
      }

      if (
        signal.scope === "area" &&
        signal.channel === "area" &&
        signal.action === "change" &&
        signal.valueType === "string" &&
        signal.receiver === createPhiBuilderControllerAddress()
      ) {
        if (!isPhiBuilderAreaKey(signal.value)) {
          return;
        }

        const nextArea = signal.value;
        const nextPageKey = resolvePhiBuilderActivePageCatalog(
          nextArea,
          state.modulePresetPagesByArea,
          state.customPages ?? {},
          state.persistedPageCatalogByArea,
        )[0]?.key ?? "";

        if (typeof pathname === "string") {
          const nextSearchParams = new URLSearchParams(searchParams.toString());
          nextSearchParams.set(PHI_BUILDER_AREA_SEARCH_PARAM, nextArea);
          nextSearchParams.set(PHI_BUILDER_PAGE_SEARCH_PARAM, nextPageKey);
          nextSearchParams.set(
            PHI_BUILDER_RUNTIME_MODULES_SEARCH_PARAM,
            serializePhiBuilderRuntimeModuleIdsSearchParam(
              state.runtimeModuleIdsByArea[nextArea] ?? [],
            ),
          );
          router.replace(`${pathname}?${nextSearchParams.toString()}`, { scroll: false });
        } else {
          phiWorkspaceCatalogStore.patch(defaultArea, (current) => ({
            ...current,
            area: nextArea,
            pageKey: nextPageKey,
          }));
          builderWorkspaceStore.patch(defaultArea, (current) => ({
            ...current,
            nodeKey: `page:${nextPageKey}`,
            nodeId: null,
            nodeKind: "page",
            selectedRegionType: null,
            selectedRegionKey: null,
            selectedRootRegionKey: null,
            inspectorOpen: false,
            sidebarKey: "pages",
          }));
        }
        return;
      }

      if (
        signal.scope === "area" &&
        signal.channel === "bindingParams" &&
        signal.action === "change" &&
        signal.valueType === "json" &&
        signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.tableBindingParams &&
        signal.receiver === createPhiBuilderControllerAddress()
      ) {
        const binding = readPhiTableBindingParamsSignalValue(signal.value);
        const navKey = typeof binding?.params.navKey === "string" ? binding.params.navKey : null;
        const parsed = parsePhiBuilderNavigationScopeKey(navKey);
        const current = getPhiDeveloperBuilderStateSnapshot(defaultArea);
        const cmsArea = resolvePhiBuilderAreaAsCmsArea(current.area);
        const normalizedNavKey = parsed ? `${parsed.area}:${parsed.key}` : null;
        if (!parsed || parsed.area !== cmsArea ||
          !normalizedNavKey ||
          !(current.navigationSurfacesByArea[current.area] ?? []).some((surface) => surface.navKey === normalizedNavKey) ||
          !pathname) {
          return;
        }
        const nextSearchParams = new URLSearchParams(searchParams.toString());
        nextSearchParams.set(PHI_BUILDER_AREA_SEARCH_PARAM, current.area);
        nextSearchParams.set(PHI_BUILDER_PAGE_SEARCH_PARAM, current.pageKey);
        nextSearchParams.set(PHI_BUILDER_NAVIGATION_KEY_SEARCH_PARAM, normalizedNavKey);
        router.replace(`${pathname}?${nextSearchParams.toString()}`, { scroll: false });
        return;
      }

	      if (signal.channel === "builderChrome" && signal.action === "change") {
	          const nextControls = signal.value && typeof signal.value === "object"
	            ? signal.value as Partial<PhiBuilderChromeControls> & { area?: unknown; pageKey?: unknown }
	            : null;
	          const currentRouteScope = resolvePhiDeveloperBuilderRouteScope(pathname);
	          if (!nextControls || !currentRouteScope || nextControls.area !== currentRouteScope.area || nextControls.pageKey !== currentRouteScope.pageKey) {
	            return;
	          }
          const currentBuilderChromeControls = state.builderChromeControls ?? createDefaultBuilderChromeControls();

          builderWorkspaceStore.patch(defaultArea, (current) => ({
            ...current,
            builderChromeControls: {
              editorPreviewDisabled:
                typeof nextControls.editorPreviewDisabled === "boolean"
                  ? nextControls.editorPreviewDisabled
                  : currentBuilderChromeControls.editorPreviewDisabled,
              actionsDisabled:
                typeof nextControls.actionsDisabled === "boolean"
                  ? nextControls.actionsDisabled
                  : currentBuilderChromeControls.actionsDisabled,
              debugDisabled:
                typeof nextControls.debugDisabled === "boolean"
                  ? nextControls.debugDisabled
                  : currentBuilderChromeControls.debugDisabled,
            },
	          }));
	          return;
	      }

	      if (signal.scope === "page" && signal.channel === "path" && signal.action === "change") {
        if (!pathname?.includes("/builder/pages") || typeof signal.value !== "string" || signal.value.length === 0) {
          return;
        }
        const nextPageKey = resolvePhiBuilderPageKeyFromStoragePath(
          effectiveArea,
          signal.value,
          currentPageTree,
        );
        if (!nextPageKey) {
          return;
        }

        navigateToBuilderPage(nextPageKey);
        emitPageTitleInputValue(nextPageKey);
        return;
      }

	      if (signal.channel === "page" && signal.action === "change") {
        const rawValue = signal.value;
        const next: { area?: unknown; pageKey?: unknown; value?: unknown } | null = rawValue && typeof rawValue === "object"
          ? rawValue as { area?: unknown; pageKey?: unknown; value?: unknown }
          : { value: rawValue };
        if (!next) {
          return;
        }
        const nextPageKey =
          typeof next.pageKey === "string" && next.pageKey.length > 0
            ? next.pageKey
	            : typeof next.value === "string" && next.value.length > 0
              ? resolvePhiBuilderPageKeyFromStoragePath(
                  state.area,
                  next.value,
                  resolvePhiBuilderActivePageCatalog(
                    state.area,
                    state.modulePresetPagesByArea,
                    state.customPages,
                    state.persistedPageCatalogByArea,
                  ),
                )
              : null;
        if (!nextPageKey) {
          return;
        }

	        if (pathname?.includes("/builder/pages")) {
	          navigateToBuilderPage(nextPageKey);
	          emitPageTitleInputValue(nextPageKey);
	          return;
	        }

	        emitPageTitleInputValue(nextPageKey);

        phiWorkspaceCatalogStore.patch(defaultArea, (current) => ({
          ...current,
          pageKey: nextPageKey,
        }));
        builderWorkspaceStore.patch(defaultArea, (current) => ({
          ...current,
          nodeKey: `page:${nextPageKey}`,
          nodeId: null,
          nodeKind: "page",
          selectedRegionType: null,
          selectedRegionKey: null,
          selectedRootRegionKey: null,
          inspectorOpen: false,
          sidebarKey: "pages",
          pagesOpen: false,
          builderChromeControls: createDefaultBuilderChromeControls(),
        }));
        return;
      }

      const builderControllerReceiver = createPhiBuilderControllerAddress();
      const targetsBuilderController = signal.receiver === builderControllerReceiver;

      if (
        signal.scope === "area" &&
        signal.channel === "runtimeModules" &&
        signal.action === "change" &&
        signal.valueType === "string[]" &&
        signal.receiver === builderControllerReceiver &&
        signal.sender !== builderControllerReceiver
      ) {
        const selectedIds = Array.isArray(signal.value)
          ? signal.value.filter((value): value is string => typeof value === "string")
          : null;
        if (!selectedIds) {
          return;
        }

        try {
          const current = getPhiDeveloperBuilderStateSnapshot(defaultArea);
          const currentModuleIds = current.runtimeModuleIdsByArea?.[effectiveArea] ?? [];
          const nextModuleIds = normalizeRuntimeModuleSelection(
            selectedIds,
            effectiveArea,
            current.runtimeModuleDefinitions,
          );
          if (areRuntimeModuleIdsEqual(currentModuleIds, nextModuleIds)) {
            return;
          }
          const historyBefore = capturePhiBuilderWorkspaceHistoryState(
            getPhiDeveloperBuilderStateSnapshot(defaultArea),
          );
          phiWorkspaceCatalogStore.patch(defaultArea, (catalog) => ({
            ...catalog,
            runtimeModuleIdsByArea: {
              ...(catalog.runtimeModuleIdsByArea ?? {}),
              [effectiveArea]: nextModuleIds,
            },
          }));
          phiBuilderHistory.record(
            createPhiBuilderHistoryContext({
              workspace: "structure",
              area: effectiveArea,
            }),
            {
              label: "Change runtime modules",
              before: {
                kind: "workspace",
                state: historyBefore,
              },
              after: {
                kind: "workspace",
                state: capturePhiBuilderWorkspaceHistoryState(
                  getPhiDeveloperBuilderStateSnapshot(defaultArea),
                ),
              },
            },
          );
        } catch (error) {
          showMessage(
            { level: "error", content: error instanceof Error ? error.message : "Invalid runtime module selection." },
            { correlationId: signal.correlationId },
          );
        }
        return;
      }

      if (
        signal.scope === "area" &&
        signal.channel === "command" &&
        signal.action === "activate" &&
        signal.valueType === "string" &&
        targetsBuilderController
      ) {
        const commandValue = signal.value;
        if (pathname?.includes("/builder/pages")) {
          if (commandValue === "createPage") {
            openPageMetaDialog("create");
            return;
          }

          if (commandValue === "editPageMeta") {
            openPageMetaDialog("update");
            return;
          }

          if (commandValue === "deletePage") {
            confirmResetPage();
            return;
          }
        }

        const command = readPhiDeveloperBuilderToolbarCommand(commandValue);
        const commandWorkspace = state.commandWorkspace;
        const builderChromeControls = state.builderChromeControls ?? createDefaultBuilderChromeControls();
        if (!command || commandWorkspace == null || builderChromeControls.actionsDisabled) {
          return;
        }

        runBuilderCommand(command);
        return;
      }

	      if (signal.channel === "debugScaffold" && signal.action === "change") {
        const nextDebugScaffold = typeof signal.value === "boolean" ? signal.value : null;
        if (nextDebugScaffold == null) {
          return;
        }

        builderWorkspaceStore.patch(defaultArea, (current) => ({
          ...current,
          debugScaffold: nextDebugScaffold,
        }));
        return;
      }

      if (signal.channel === "content") {
        const rawValue = signal.value;
        const next = rawValue && typeof rawValue === "object" ? rawValue as {
          nodeKind?: unknown;
          regionKey?: unknown;
          area?: unknown;
          pageKey?: unknown;
          draft?: unknown;
        } : null;
        if (!next || next.nodeKind !== "region" || typeof next.regionKey !== "string" || !next.draft || typeof next.draft !== "object") {
          return;
        }
        const regionKey = next.regionKey;
        const nextDraft = next.draft as PhiDeveloperBuilderRegionDraft;

        const catalog = phiWorkspaceCatalogStore.getSnapshot(defaultArea);
        const nextArea = typeof next.area === "string" ? next.area : catalog.area;
        const nextPageKey = typeof next.pageKey === "string" && next.pageKey.length > 0 ? next.pageKey : catalog.pageKey;
        builderWorkspaceStore.patch(defaultArea, (current) => {

          return {
            ...current,
            regionDrafts: {
              ...current.regionDrafts,
              [getPhiBuilderRegionDraftKey(nextArea, regionKey, nextPageKey)]: nextDraft,
            },
          };
        });
        return;
      }

	      if (signal.channel === "selection" && signal.action === "change") {
        const rawValue = signal.value;
        const next = rawValue && typeof rawValue === "object" ? rawValue as {
          nodeKey?: unknown;
          nodeId?: unknown;
          nodeKind?: unknown;
          area?: unknown;
          pageKey?: unknown;
          regionType?: unknown;
          regionKey?: unknown;
          selectedLayoutAnchor?: unknown;
          openWiring?: unknown;
        } : null;
        if (!next || typeof next.nodeKey !== "string" || typeof next.nodeKind !== "string") {
          return;
        }
        const nextNodeKey = next.nodeKey;
        const nextPageKey = typeof next.pageKey === "string" ? next.pageKey : undefined;

        selectPhiDeveloperBuilderNode(defaultArea, {
          ...(typeof next.area === "string" ? { area: next.area as PhiDeveloperBuilderArea } : {}),
          ...(nextPageKey ? { pageKey: nextPageKey } : {}),
          nodeKey: nextNodeKey,
          nodeId: readPhiCmsInstanceId(next.nodeId),
          nodeKind: next.nodeKind as PhiDeveloperBuilderNodeKind,
          regionType: typeof next.regionType === "number" ? next.regionType : null,
          regionKey: typeof next.regionKey === "string" ? next.regionKey : null,
          selectedLayoutAnchor:
            typeof next.selectedLayoutAnchor === "string"
              ? next.selectedLayoutAnchor as PhiAnchorWidgetPlacement
              : null,
          openWiring: next.openWiring === true,
        });
        return;
      }

	      if (signal.channel === "builderMode" && signal.action === "change") {
        const rawValue = signal.value;

        if (rawValue === "editor") {
          enterEditor();
          return;
        }
        if (rawValue === "preview") {
          void enterPreview().catch((error) => {
	            dispatchSignal({
	              scope: "area",
	              channel: "builderMode",
	              action: "change",
	              value: state.builderMode,
	              valueType: "string",
	              sender: createPhiBuilderControllerAddress(),
	              receiver: "broadcast",
	              timestamp: Date.now(),
	            });
            showMessage(
              { level: "error", content: error instanceof Error ? error.message : "Preview snapshot failed." },
              { correlationId: signal.correlationId },
            );
          });
        }
        return;
      }

      if (
        signal.scope === "area" &&
        signal.channel === "layout" &&
        signal.action === "change" &&
        signal.receiver === createPhiBuilderControllerAddress()
      ) {
        if (typeof signal.value !== "boolean") {
          return;
        }

        const nextMode = signal.value ? "fullHeight" : "content";
        handledSiderLayoutRef.current = {
          draftKey: getPhiBuilderRegionDraftKey(state.area, "sider_left", state.pageKey),
          fullHeight: signal.value,
        };
        applyPhiDeveloperBuilderSiderLeftMode(state.area, state.pageKey, nextMode);
        dispatchSignal({
          scope: "area",
          channel: "layout",
          action: "change",
          value: signal.value,
          valueType: "boolean",
          sender: createPhiBuilderControllerAddress(),
          receiver: "broadcast",
          correlationId: signal.correlationId,
          timestamp: Date.now(),
        });
        return;
      }

	      if (
        (signal.channel === "region" || signal.channel === "selection") &&
        signal.action === "change"
      ) {
        const rawValue = signal.value;
        const next = rawValue && typeof rawValue === "object"
          ? rawValue as { regionKey?: unknown; regionType?: unknown; nodeKey?: unknown; nodeKind?: unknown }
          : null;
        if (!next || typeof next.regionKey !== "string" || typeof next.nodeKind !== "string") {
          return;
        }
        const nextRegionKey = next.regionKey;
        const nextNodeKind = next.nodeKind === "slot" ? "slot" : "region";
        const nextNodeKey = typeof next.nodeKey === "string"
          ? next.nodeKey
          : `${nextNodeKind}:${nextRegionKey}`;

        builderWorkspaceStore.patch(defaultArea, (current) => ({
          ...current,
          nodeKey: nextNodeKey,
          nodeId: null,
          nodeKind: nextNodeKind,
          selectedRegionType:
            typeof next.regionType === "number"
              ? next.regionType
              : current.selectedRegionType,
          selectedRegionKey: nextRegionKey,
          selectedRootRegionKey: null,
          inspectorOpen: nextNodeKind === "region",
          sidebarKey: "structure",
          pagesOpen: false,
        }));
        return;
      }

      if (signal.channel === "command" && signal.action === "activate" && signal.value === "pagesOpen") {
        builderWorkspaceStore.patch(defaultArea, (current) => ({ ...current, pagesOpen: true }));
        return;
      }

      if (signal.receiver === createPhiBuilderControllerAddress() && signal.channel === "effects") {
        if (signal.action === "change" && signal.valueType === "none") {
          effectsWorkflowCorrelationRef.current = signal.correlationId;
          effectsFormSubmissionRef.current = null;
        } else if (signal.action === "activate" && signal.valueType === "string" && signal.value === "save") {
          const correlationId = effectsWorkflowCorrelationRef.current ?? signal.correlationId;
          effectsFormSubmissionRef.current = { correlationId, values: {} };
          dispatchSignal({
            scope: "area",
            channel: "effectsSubmitting",
            action: "change",
            value: true,
            valueType: "boolean",
            correlationId,
            sender: createPhiBuilderControllerAddress(),
            receiver: createPhiSignalSubcontrolAddress("cms", PHI_BUILDER_INSPECTOR_WIDGET_IDS.effectsCommands, "save"),
            timestamp: Date.now(),
          });
          for (const section of PHI_BUILDER_EFFECTS_SECTIONS) {
            const widgetId = PHI_BUILDER_EFFECTS_FORM_WIDGET_IDS[section];
            dispatchSignal({
              scope: "area",
              channel: "submit",
              action: "activate",
              value: null,
              valueType: "none",
              correlationId,
              sender: createPhiBuilderControllerAddress(),
              receiver: createPhiSignalAddress("cms", widgetId),
              timestamp: Date.now(),
            });
          }
        } else if (
          (signal.action === "activate" && signal.valueType === "string" && signal.value === "cancel") ||
          (signal.action === "close" &&
            (signal.valueType === "none" ||
            (signal.valueType === "json" &&
              signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.overlayCloseRequest)))
        ) {
          const correlationId = effectsWorkflowCorrelationRef.current ?? signal.correlationId;
          for (const section of PHI_BUILDER_EFFECTS_SECTIONS) {
            const widgetId = PHI_BUILDER_EFFECTS_FORM_WIDGET_IDS[section];
            dispatchSignal({
              scope: "area",
              channel: "reset",
              action: "activate",
              value: null,
              valueType: "none",
              correlationId,
              sender: createPhiBuilderControllerAddress(),
              receiver: createPhiSignalAddress("cms", widgetId),
              timestamp: Date.now(),
            });
          }
          dispatchSignal({
            scope: "area",
            channel: "dialog",
            action: "close",
            value: null,
            valueType: "none",
            correlationId,
            sender: createPhiBuilderControllerAddress(),
            receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_OVERLAY_IDS.effectsEditor),
            timestamp: Date.now(),
          });
          dispatchSignal({
            scope: "area",
            channel: "effectsCancel",
            action: "close",
            value: null,
            valueType: "none",
            correlationId,
            sender: createPhiBuilderControllerAddress(),
            receiver: "broadcast",
            timestamp: Date.now(),
          });
          effectsWorkflowCorrelationRef.current = null;
          effectsFormSubmissionRef.current = null;
          dispatchSignal({
            scope: "area",
            channel: "effectsSubmitting",
            action: "change",
            value: false,
            valueType: "boolean",
            correlationId,
            sender: createPhiBuilderControllerAddress(),
            receiver: createPhiSignalSubcontrolAddress("cms", PHI_BUILDER_INSPECTOR_WIDGET_IDS.effectsCommands, "save"),
            timestamp: Date.now(),
          });
        }
        return;
      }

      /*
       * Signal wiring. The Form publishes its values to its own Form controller address as the author
       * edits, which is what keeps the four cascading selects answerable; Apply routes through the
       * Form's own submit so its validation runs before a route is written.
       */
      if (
        signal.receiver === PHI_BUILDER_SIGNAL_WIRING_FORM_CONTROLLER_ADDRESS &&
        signal.action === "change" &&
        signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.formValues
      ) {
        const submitted = readPhiRuntimeFormValuesSignalValue(signal.value);
        if (submitted) patchPhiBuilderSignalWiringSession(defaultArea, submitted.values);
        return;
      }

      if (
        signal.receiver === createPhiBuilderControllerAddress() &&
        signal.channel === "signalWiringRoutes" &&
        signal.action === "activate" &&
        signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.tableAction
      ) {
        const tableAction = readPhiTableActionSignalValue(signal.value);
        if (tableAction?.actionKey !== "delete" || typeof tableAction.rowIdentity !== "string") {
          return;
        }
        const routes = resolvePhiBuilderSignalWiringRoutesWithout(defaultArea, tableAction.rowIdentity);
        if (!routes) return;
        const routeState = getPhiDeveloperBuilderStateSnapshot(defaultArea);
        runPhiDeveloperBuilderInspectorAction(defaultArea, routeState.nodeKind === "layout"
          ? { kind: "patchSelectedLayoutConfig", key: "signalRoutes", value: routes }
          : { kind: "patchSelectedWidgetConfig", patch: { signalRoutes: routes } });
        dispatchSignal({
          scope: "area",
          channel: "reload",
          action: "activate",
          value: null,
          valueType: "none",
          correlationId: signal.correlationId,
          sender: createPhiBuilderControllerAddress(),
          receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_WIDGET_IDS.signalWiringRoutes),
          timestamp: Date.now(),
        });
        return;
      }

      if (
        signal.receiver === createPhiBuilderControllerAddress() &&
        signal.channel === "signalWiring"
      ) {
        if (signal.action === "activate" && signal.valueType === "string" && signal.value === "apply") {
          dispatchSignal({
            scope: "area",
            channel: "submit",
            action: "activate",
            value: null,
            valueType: "none",
            correlationId: signal.correlationId,
            sender: createPhiBuilderControllerAddress(),
            receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_WIDGET_IDS.signalWiringForm),
            timestamp: Date.now(),
          });
          return;
        }
        /*
         * Cancel, the close button, and a click on the mask all end here. The overlay runs with
         * `closeMode: "request"`, so it does not close itself -- it asks, and closing is the answer. Both
         * the session and the Form are cleared, or the next wiring session would open on the last one's
         * half-finished selection.
         */
        const isCloseRequest =
          (signal.action === "activate" && signal.valueType === "string" && signal.value === "cancel") ||
          (signal.action === "close" &&
            (signal.valueType === "none" ||
              (signal.valueType === "json" &&
                signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.overlayCloseRequest)));
        if (!isCloseRequest) {
          return;
        }
        resetPhiBuilderSignalWiringSession(defaultArea);
        dispatchSignal({
          scope: "area",
          channel: "reset",
          action: "activate",
          value: null,
          valueType: "none",
          correlationId: signal.correlationId,
          sender: createPhiBuilderControllerAddress(),
          receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_WIDGET_IDS.signalWiringForm),
          timestamp: Date.now(),
        });
        dispatchSignal({
          scope: "area",
          channel: "dialog",
          action: "close",
          value: null,
          valueType: "none",
          correlationId: signal.correlationId,
          sender: createPhiBuilderControllerAddress(),
          receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_OVERLAY_IDS.signalWiring),
          timestamp: Date.now(),
        });
        return;
      }

      if (
        signal.receiver === createPhiBuilderControllerAddress() &&
        signal.channel === "signalWiringForm" &&
        signal.action === "change" &&
        signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.formValues
      ) {
        const submitted = readPhiRuntimeFormValuesSignalValue(signal.value);
        if (!submitted) return;
        patchPhiBuilderSignalWiringSession(defaultArea, submitted.values);
        const result = resolvePhiBuilderSignalWiringRoutes(defaultArea);
        if (result.kind !== "applied") return;
        const wiringState = getPhiDeveloperBuilderStateSnapshot(defaultArea);
        runPhiDeveloperBuilderInspectorAction(defaultArea, wiringState.nodeKind === "layout"
          ? { kind: "patchSelectedLayoutConfig", key: "signalRoutes", value: result.routes }
          : { kind: "patchSelectedWidgetConfig", patch: { signalRoutes: result.routes } });
        resetPhiBuilderSignalWiringSession(defaultArea);
        dispatchSignal({
          scope: "area",
          channel: "dialog",
          action: "close",
          value: null,
          valueType: "none",
          correlationId: signal.correlationId,
          sender: createPhiBuilderControllerAddress(),
          receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_OVERLAY_IDS.signalWiring),
          timestamp: Date.now(),
        });
        return;
      }

      if (
        signal.receiver === createPhiBuilderControllerAddress() &&
        signal.channel.startsWith("effectsFormValidation:") &&
        signal.action === "change" &&
        signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.formValidity
      ) {
        const pending = effectsFormSubmissionRef.current;
        if (!pending || signal.correlationId !== pending.correlationId) return;
        effectsFormSubmissionRef.current = null;
        dispatchSignal({
          scope: "area",
          channel: "effectsSubmitting",
          action: "change",
          value: false,
          valueType: "boolean",
          correlationId: pending.correlationId,
          sender: createPhiBuilderControllerAddress(),
          receiver: createPhiSignalSubcontrolAddress("cms", PHI_BUILDER_INSPECTOR_WIDGET_IDS.effectsCommands, "save"),
          timestamp: Date.now(),
        });
        return;
      }

      if (
        signal.receiver === createPhiBuilderControllerAddress() &&
        signal.channel === "effectsVisibility" &&
        signal.action === "change" &&
        signal.value === false &&
        effectsWorkflowCorrelationRef.current
      ) {
        const correlationId = effectsWorkflowCorrelationRef.current;
        for (const section of PHI_BUILDER_EFFECTS_SECTIONS) {
          const widgetId = PHI_BUILDER_EFFECTS_FORM_WIDGET_IDS[section];
          dispatchSignal({
            scope: "area",
            channel: "reset",
            action: "activate",
            value: null,
            valueType: "none",
            correlationId,
            sender: createPhiBuilderControllerAddress(),
            receiver: createPhiSignalAddress("cms", widgetId),
            timestamp: Date.now(),
          });
        }
        dispatchSignal({
          scope: "area",
          channel: "effectsCancel",
          action: "close",
          value: null,
          valueType: "none",
          correlationId,
          sender: createPhiBuilderControllerAddress(),
          receiver: "broadcast",
          timestamp: Date.now(),
        });
        effectsWorkflowCorrelationRef.current = null;
        effectsFormSubmissionRef.current = null;
        dispatchSignal({
          scope: "area",
          channel: "effectsSubmitting",
          action: "change",
          value: false,
          valueType: "boolean",
          correlationId,
          sender: createPhiBuilderControllerAddress(),
          receiver: createPhiSignalSubcontrolAddress("cms", PHI_BUILDER_INSPECTOR_WIDGET_IDS.effectsCommands, "save"),
          timestamp: Date.now(),
        });
        return;
      }

      if (
        signal.receiver === createPhiBuilderControllerAddress() &&
        signal.channel.startsWith("effectsForm:") &&
        signal.action === "change" &&
        signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.formValues
      ) {
        const section = signal.channel.slice("effectsForm:".length);
        if (section !== "appearance" && section !== "transitions" && section !== "viewport") return;
        const pending = effectsFormSubmissionRef.current;
        const submitted = readPhiRuntimeFormValuesSignalValue(signal.value);
        if (!pending || !submitted || signal.correlationId !== pending.correlationId) return;
        pending.values[section] = submitted.values;
        if (!pending.values.appearance || !pending.values.transitions || !pending.values.viewport) return;
        const effectsCorrelationId = pending.correlationId;
        const effects = mergePhiBuilderEffectsFormValues({
          appearance: pending.values.appearance,
          transitions: pending.values.transitions,
          viewport: pending.values.viewport,
        });
        dispatchSignal({
          scope: "area",
          channel: "effectsCommit",
          action: "change",
          value: { values: { effects } },
          valueType: "json",
          valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
          correlationId: effectsCorrelationId,
          sender: createPhiBuilderControllerAddress(),
          receiver: "broadcast",
          timestamp: Date.now(),
        });
        dispatchSignal({
          scope: "area",
          channel: "dialog",
          action: "close",
          value: null,
          valueType: "none",
          correlationId: effectsCorrelationId,
          sender: createPhiBuilderControllerAddress(),
          receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_OVERLAY_IDS.effectsEditor),
          timestamp: Date.now(),
        });
        effectsWorkflowCorrelationRef.current = null;
        effectsFormSubmissionRef.current = null;
        dispatchSignal({
          scope: "area",
          channel: "effectsSubmitting",
          action: "change",
          value: false,
          valueType: "boolean",
          correlationId: effectsCorrelationId,
          sender: createPhiBuilderControllerAddress(),
          receiver: createPhiSignalSubcontrolAddress("cms", PHI_BUILDER_INSPECTOR_WIDGET_IDS.effectsCommands, "save"),
          timestamp: Date.now(),
        });
        return;
      }

      if (signal.channel === "inspectorVisibility" && signal.action === "change" && typeof signal.value === "boolean") {
        builderWorkspaceStore.patch(defaultArea, (current) => ({ ...current, inspectorOpen: signal.value as boolean }));
        return;
      }

      if (signal.channel === "inspector" && signal.action === "change") {
        if (
          signal.receiver !== createPhiBuilderControllerAddress() ||
          signal.valueType !== "json" ||
          signal.valueSchema !== PHI_SIGNAL_VALUE_SCHEMAS.builderInspector
        ) {
          return;
        }

        const action = readPhiBuilderInspectorAction(signal.value);
        if (action) {
          runPhiDeveloperBuilderInspectorAction(defaultArea, action);
        }
        return;
      }

      return;
    },
  );

  useEffect(() => {
    dispatchSignal({
      scope: "area",
      channel: "areaSelection",
      action: "change",
      value: state.area,
      valueType: "string",
      sender: createPhiBuilderControllerAddress(),
      receiver: "broadcast",
      timestamp: Date.now(),
    });
  }, [dispatchSignal, state.area]);

  return pageMetaDialog;
}

export type PhiDeveloperBuilderWorkspaceControllerProps = {
  defaultArea?: PhiDeveloperBuilderArea;
  shellPresetDraftsByArea?: Record<string, Record<string, PhiDeveloperBuilderRegionDraft>>;
  runtimeModuleDefinitions?: readonly PhiRuntimeModuleDefinition[];
  runtimeModuleIdsByArea?: Record<string, PhiRuntimeModuleId[]>;
  modulePresetPagesByArea?: PhiWorkspaceCatalogState["modulePresetPagesByArea"];
  areaPresetSourcesByArea?: PhiWorkspaceCatalogState["areaPresetSourcesByArea"];
  navigationSurfacesByArea?: PhiWorkspaceCatalogState["navigationSurfacesByArea"];
  pageMetaLabels?: PhiBuilderPageMetaPresentationLabels;
};

export function PhiDeveloperBuilderWorkspaceController({
  defaultArea = "public",
  shellPresetDraftsByArea = {},
  runtimeModuleDefinitions = [],
  runtimeModuleIdsByArea = {},
  modulePresetPagesByArea = EMPTY_MODULE_PRESET_PAGES_BY_AREA,
  areaPresetSourcesByArea = {},
  navigationSurfacesByArea = {},
  pageMetaLabels = PHI_BUILDER_PAGE_META_DEFAULT_PRESENTATION_LABELS,
}: PhiDeveloperBuilderWorkspaceControllerProps) {
  const controller = usePhiDeveloperBuilderWorkspaceController(defaultArea, {
    shellPresetDraftsByArea,
    runtimeModuleDefinitions,
    runtimeModuleIdsByArea,
    modulePresetPagesByArea,
    areaPresetSourcesByArea,
    navigationSurfacesByArea,
    pageMetaLabels,
  });

  return controller;
}
