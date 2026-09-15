"use client";

import { readPhiDeveloperBuilderWorkspaceKey } from "./route-scope";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
} from "../../../components/widgets/signals/page-title-signals";
import { normalizePhiCascaderValue } from "../../../components/controls/phi-cascader-control";
import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../components/runtime/runtime-signal-bus";
import { usePhiApplicationFeedback } from "../../../components/runtime/use-phi-application-feedback";
import {
  normalizePhiBuilderCmsCatalogPath,
  resolvePhiBuilderActivePageCatalog,
  resolvePhiBuilderPageKeyFromCatalogPath,
} from "../../../helpers/cms-page-catalog";
import { changePhiBuilderPagePath, loadPhiBuilderPersistedPageCatalog } from "./page-catalog-client";
import { resolvePhiBuilderCmsStoragePath } from "../../../helpers/cms-paths";
import {
  collectPhiDeveloperBuilderPageKeys,
  collectPhiDeveloperBuilderPageStoragePaths,
  findPhiDeveloperBuilderPageNode,
  resolveUniquePhiDeveloperBuilderPagePath,
} from "./page-controller-helpers";
import {
  createPhiDeveloperBuilderInitialPageDrafts,
  createPhiDeveloperBuilderPageDraft,
  PhiBuilderPageExistsError,
} from "./persistence";
import {
  describePhiBuilderPageAddressConflict,
  findPhiBuilderSitePageAddressConflict,
} from "./page-address-rule";
import {
  PHI_BUILDER_AREA_SEARCH_PARAM,
  PHI_BUILDER_PAGE_SEARCH_PARAM,
} from "../../../helpers/cms-scope-search-params";
import {
  builderWorkspaceStore,
  createDefaultBuilderChromeControls,
  mergePhiDeveloperRegionDrafts,
  getPhiDeveloperBuilderStateSnapshot,
} from "./developer-workspace-store";
import type {
  PhiDeveloperBuilderArea,
  PhiDeveloperBuilderWorkspaceState,
} from "./developer-workspace-types";
import { getPhiBuilderRegionDraftKey } from "./region-keys";
import {
  capturePhiBuilderWorkspaceHistoryState,
  createPhiBuilderHistoryContext,
  phiBuilderHistory,
} from "./history";
import { createPhiBuilderControllerAddress } from "./controller/address";
import {
  PHI_BUILDER_PAGE_META_OVERLAY_IDS,
  PHI_BUILDER_PAGE_META_WIDGET_IDS,
} from "../../../helpers/cms-page-addresses";
import { createPhiRuntimeFormControllerAddress } from "../../../components/forms/runtime-form-controller-address";
import { createPhiSignalAddress, createPhiSignalSubcontrolAddress, PHI_SIGNAL_VALUE_SCHEMAS } from "../../../types/signals";
import { readPhiRuntimeFormValuesSignalValue } from "../../../components/forms/runtime-form-state";
import type { PhiBuilderPageMetaPresentationLabels } from "./controller/definition";
import { emitPhiPageTitleInputSignal } from "./page-title-signal";
import { phiWorkspaceCatalogStore } from "../../../components/workspace/catalog-store";

type PhiBuilderPageControllerState = Pick<
  PhiDeveloperBuilderWorkspaceState,
  "customPages" | "modulePresetPagesByArea" | "pageMetaDrafts" | "persistedPageCatalogByArea"
>;

type PhiPageMetaDialogMode = "create" | "update";

export function usePhiBuilderPageController({
  defaultArea,
  effectiveArea,
  effectivePageKey,
  pageMetaLabels,
  state,
}: {
  defaultArea: PhiDeveloperBuilderArea;
  effectiveArea: PhiDeveloperBuilderArea;
  effectivePageKey: string;
  pageMetaLabels: PhiBuilderPageMetaPresentationLabels;
  state: PhiBuilderPageControllerState;
}) {
  const { showMessage } = usePhiApplicationFeedback();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const emitSignal = usePhiSignalDispatcher();
  const [pageMetaDialogMode, setPageMetaDialogMode] = useState<PhiPageMetaDialogMode>("create");
  const [pageMetaDialogSaving, setPageMetaDialogSaving] = useState(false);
  const [pendingPageMetaInitialValues, setPendingPageMetaInitialValues] = useState<Record<string, unknown> | null>(null);
  const pageMetaFormControllerAddress = createPhiRuntimeFormControllerAddress(`widget-${PHI_BUILDER_PAGE_META_WIDGET_IDS.form}`);
  const pageMetaOverlayAddress = createPhiSignalAddress("cms", PHI_BUILDER_PAGE_META_OVERLAY_IDS.editor);
  const pageMetaSaveControlAddress = createPhiSignalSubcontrolAddress(
    "cms",
    PHI_BUILDER_PAGE_META_WIDGET_IDS.commands,
    "save",
  );

  const emitPageMetaTitle = useCallback((title: string) => {
    emitSignal({
      scope: "page",
      channel: "title",
      action: "change",
      value: title,
      valueType: "string",
      sender: createPhiBuilderControllerAddress(),
      receiver: pageMetaOverlayAddress,
      timestamp: Date.now(),
    });
  }, [emitSignal, pageMetaOverlayAddress]);

  const emitPageMetaActionLabel = useCallback((label: string) => {
    emitSignal({
      scope: "page",
      channel: "label",
      action: "change",
      value: label,
      valueType: "string",
      sender: createPhiBuilderControllerAddress(),
      receiver: pageMetaSaveControlAddress,
      timestamp: Date.now(),
    });
  }, [emitSignal, pageMetaSaveControlAddress]);

  /*
   * `correlationId` is the exchange this opening or closing belongs to. Opening from a toolbar click
   * begins one and passes none; closing after a submit continues the one the submit arrived on, across
   * the await that saved the page.
   */
  const dispatchPageMetaOverlay = useCallback((
    action: "activate" | "close",
    correlationId?: string,
  ) => {
    emitSignal({
      scope: "page",
      channel: "dialog",
      action,
      value: null,
      valueType: "none",
      sender: createPhiBuilderControllerAddress(),
      receiver: pageMetaOverlayAddress,
      correlationId,
      timestamp: Date.now(),
    });
  }, [emitSignal, pageMetaOverlayAddress]);

  const currentPageTree = resolvePhiBuilderActivePageCatalog(
    effectiveArea,
    state.modulePresetPagesByArea,
    state.customPages,
    state.persistedPageCatalogByArea,
  );

  const resolvePageTitleForInput = useCallback((pageKey: string) => {
    return findPhiDeveloperBuilderPageNode(currentPageTree, pageKey)?.title?.trim() || pageKey;
  }, [currentPageTree]);

  const emitPageTitleInputValue = useCallback((pageKey: string, title?: string | null) => {
    emitPhiPageTitleInputSignal({
      emitSignal,
      area: effectiveArea,
      pageKey,
      title: title?.trim() || resolvePageTitleForInput(pageKey),
    });
  }, [effectiveArea, emitSignal, resolvePageTitleForInput]);

  async function reloadPersistedPageCatalog(area: PhiDeveloperBuilderArea) {
    const pages = await loadPhiBuilderPersistedPageCatalog(area, { refresh: true });
    phiWorkspaceCatalogStore.patch(defaultArea, (current) => ({
      ...current,
      persistedPageCatalogByArea: {
        ...current.persistedPageCatalogByArea,
        [area]: pages,
      },
      pageCatalogHydratedByArea: {
        ...current.pageCatalogHydratedByArea,
        [area]: true,
      },
    }));
  }

  function navigateToBuilderPage(pageKey: string) {
    phiWorkspaceCatalogStore.patch(defaultArea, (current) => ({
      ...current,
      area: effectiveArea,
      pageKey,
    }));
    builderWorkspaceStore.patch(defaultArea, (current) => ({
      ...current,
      nodeKey: `page:${pageKey}`,
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

    if (typeof pathname === "string") {
      const nextSearchParams = new URLSearchParams(searchParams.toString());
      nextSearchParams.set(PHI_BUILDER_AREA_SEARCH_PARAM, effectiveArea);
      nextSearchParams.set(PHI_BUILDER_PAGE_SEARCH_PARAM, pageKey);
      router.replace(`${pathname}?${nextSearchParams.toString()}`, { scroll: false });
    }
  }

  function openPageMetaDialog(mode: PhiPageMetaDialogMode) {
    const pageMetaDraftKey = getPhiBuilderRegionDraftKey(effectiveArea, "page_meta", effectivePageKey);
    const currentMetaDraft = state.pageMetaDrafts[pageMetaDraftKey] ?? {};
    const pageTitle = currentMetaDraft.title?.trim() || resolvePageTitleForInput(effectivePageKey);
    const currentPath = normalizePhiBuilderCmsCatalogPath(
      resolvePhiBuilderCmsStoragePath(effectiveArea, effectivePageKey, currentPageTree),
    );
    const currentNode = findPhiDeveloperBuilderPageNode(currentPageTree, effectivePageKey);
    const indexAnswerable = effectiveArea === "public";

    setPageMetaDialogMode(mode);
    const presentation = mode === "create"
      ? { title: pageMetaLabels.createTitle, actionLabel: pageMetaLabels.createAction }
      : { title: pageMetaLabels.updateTitle, actionLabel: pageMetaLabels.updateAction };
    emitPageMetaTitle(presentation.title);
    // Held by the bus until the control exists, which is what the queue kept here used to do.
    emitPageMetaActionLabel(presentation.actionLabel);
    const initialValues = mode === "create"
      ? {
          title: "New Page",
          path: resolveUniquePhiDeveloperBuilderPagePath(
            "/new-page",
            collectPhiDeveloperBuilderPageStoragePaths(effectiveArea, currentPageTree),
          ),
          pathLocked: "false",
          description: "",
          index: indexAnswerable,
          indexLocked: indexAnswerable ? "false" : "true",
        }
      : {
          title: pageTitle,
          path: currentPath,
          pathLocked: currentNode?.pathLocked === true ? "true" : "false",
          description: currentMetaDraft.description ?? "",
          /*
           * Outside Public the switch states the fact rather than the draft, the way the Area dialog's
           * own switches do: those Areas are authenticated and are never indexed, whatever a Page that
           * was once Public left behind in its record.
           */
          index: indexAnswerable && currentMetaDraft.index !== false,
          indexLocked: indexAnswerable ? "false" : "true",
        };
    setPendingPageMetaInitialValues(initialValues);
    dispatchPageMetaOverlay("activate");
  }

  useEffect(() => {
    emitSignal({
      scope: "page",
      channel: "pageMetaSubmitting",
      action: "change",
      value: pageMetaDialogSaving,
      valueType: "boolean",
      sender: createPhiBuilderControllerAddress(),
      receiver: pageMetaSaveControlAddress,
      timestamp: Date.now(),
    });
  }, [emitSignal, pageMetaDialogSaving, pageMetaSaveControlAddress]);

  useEffect(() => {
    if (!pendingPageMetaInitialValues) return;
    emitSignal({
      scope: "page",
      channel: "values",
      action: "change",
      value: { values: pendingPageMetaInitialValues },
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
      sender: createPhiBuilderControllerAddress(),
      receiver: pageMetaFormControllerAddress,
      timestamp: Date.now(),
    });
  }, [emitSignal, pageMetaFormControllerAddress, pendingPageMetaInitialValues]);

  async function submitPageMetaDialog(values: Record<string, unknown>, correlationId: string) {
    const title = typeof values.title === "string" ? values.title.trim() || "New Page" : "New Page";
    const description = typeof values.description === "string" ? values.description.trim() : "";
    const requestedPath = normalizePhiBuilderCmsCatalogPath(
      normalizePhiCascaderValue(typeof values.path === "string" ? values.path : title, { normalize: "path" }),
    );
    /*
     * The indexing answer is taken only where it was asked. Outside Public the switch is disabled and
     * shows the fact rather than the record, so reading it back would write that fact into a Page that
     * never said it -- and would quietly clear a `NoIndex` an Area move left behind.
     */
    const indexPatch = effectiveArea === "public"
      ? { index: values.index !== false }
      : {};

    if (pageMetaDialogMode === "update") {
      const currentNode = findPhiDeveloperBuilderPageNode(currentPageTree, effectivePageKey);
      const currentPath = normalizePhiBuilderCmsCatalogPath(
        resolvePhiBuilderCmsStoragePath(effectiveArea, effectivePageKey, currentPageTree),
      );
      const pathChanged = requestedPath !== currentPath;
      if (pathChanged && currentNode?.pathLocked) {
        showMessage({
          level: "error",
          content: currentNode.pathOwnershipReason ?? "This Page path is owned by its module.",
        });
        return;
      }
      if (pathChanged && (!currentNode?.pageScopeId || currentNode.pageScopeId <= 0)) {
        showMessage({ level: "error", content: "Page path changes require a persisted Site Page." });
        return;
      }
      const moveConflict = pathChanged
        ? findPhiBuilderSitePageAddressConflict(requestedPath, currentPageTree, { exceptPath: currentPath })
        : null;
      if (moveConflict) {
        showMessage({ level: "error", content: describePhiBuilderPageAddressConflict(moveConflict) });
        return;
      }
      setPageMetaDialogSaving(true);
      try {
        const pathResult = pathChanged
          ? await changePhiBuilderPagePath({
              area: effectiveArea,
              pageScopeId: currentNode!.pageScopeId!,
              path: requestedPath,
            })
          : null;
      const pageMetaDraftKey = getPhiBuilderRegionDraftKey(effectiveArea, "page_meta", effectivePageKey);
      const historyBefore = capturePhiBuilderWorkspaceHistoryState(
        getPhiDeveloperBuilderStateSnapshot(defaultArea),
      );
      // replace writes the whole tool state, so it must read the tool state -- not the merged view.
      const current = builderWorkspaceStore.getSnapshot(defaultArea);
      const next = {
        ...current,
        pageMetaDrafts: {
          ...current.pageMetaDrafts,
          [pageMetaDraftKey]: {
            ...(current.pageMetaDrafts[pageMetaDraftKey] ?? {}),
            title,
            description,
            ...indexPatch,
          },
        },
      };
      builderWorkspaceStore.replace(defaultArea, next);
      phiBuilderHistory.record(
        createPhiBuilderHistoryContext({
          workspace: "pages",
          area: effectiveArea,
          pageKey: effectivePageKey,
        }),
        {
          label: "Update page metadata",
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
      emitPageTitleInputValue(effectivePageKey, title);
      if (pathResult) {
        await reloadPersistedPageCatalog(effectiveArea);
        const refreshed = getPhiDeveloperBuilderStateSnapshot(defaultArea);
        const refreshedPages = resolvePhiBuilderActivePageCatalog(
          effectiveArea,
          refreshed.modulePresetPagesByArea,
          refreshed.customPages,
          refreshed.persistedPageCatalogByArea,
        );
        const nextPageKey = resolvePhiBuilderPageKeyFromCatalogPath(effectiveArea, pathResult.path, refreshedPages);
        if (nextPageKey) navigateToBuilderPage(nextPageKey);
      }
      dispatchPageMetaOverlay("close", correlationId);
      showMessage({
        level: "success",
        content: pathResult
          ? pathResult.pendingPath
            ? `Page updated. It moves to ${pathResult.pendingPath} when you publish; ${pathResult.references} internal reference${pathResult.references === 1 ? "" : "s"} follow it.`
            : "Page updated. The pending move was cancelled."
          : "Page meta updated.",
      });
      } catch (error) {
        showMessage({ level: "error", content: error instanceof Error ? error.message : "Failed to update Page." });
      } finally {
        setPageMetaDialogSaving(false);
      }
      return;
    }

    const requestedKey = resolvePhiBuilderPageKeyFromCatalogPath(
      effectiveArea,
      requestedPath,
      currentPageTree,
    );
    const requestedStoragePath = requestedPath;
    const existingKeys = collectPhiDeveloperBuilderPageKeys(currentPageTree);
    const existingPaths = collectPhiDeveloperBuilderPageStoragePaths(effectiveArea, currentPageTree);

    if (!requestedKey) {
      showMessage({ level: "error", content: "Page path is required." });
      return;
    }

    if (existingKeys.has(requestedKey)) {
      showMessage({ level: "error", content: "Page key already exists." });
      return;
    }

    if (existingPaths.has(requestedStoragePath)) {
      showMessage({ level: "error", content: "Page path already exists." });
      return;
    }

    const createConflict = findPhiBuilderSitePageAddressConflict(requestedStoragePath, currentPageTree);
    if (createConflict) {
      showMessage({ level: "error", content: describePhiBuilderPageAddressConflict(createConflict) });
      return;
    }

    setPageMetaDialogSaving(true);
    const nextDrafts = createPhiDeveloperBuilderInitialPageDrafts({
      area: effectiveArea,
      pageKey: requestedKey,
      title,
    });

    try {
      await createPhiDeveloperBuilderPageDraft({
        area: effectiveArea,
        pageKey: requestedKey,
        storagePath: requestedStoragePath,
        title,
        description,
        pathname,
      });
      mergePhiDeveloperRegionDrafts(nextDrafts);
      phiWorkspaceCatalogStore.patch(defaultArea, (current) => ({
        ...current,
        customPages: {
          ...current.customPages,
          [effectiveArea]: [
            ...(current.customPages[effectiveArea] ?? []),
            {
              key: requestedKey,
              title,
              storagePath: requestedStoragePath,
            },
          ],
        },
      }));
      // The page's meta and delete drafts are edits in progress, so they stay with the Builder.
      builderWorkspaceStore.patch(defaultArea, (current) => ({
        ...current,
        pageMetaDrafts: {
          ...current.pageMetaDrafts,
          [getPhiBuilderRegionDraftKey(effectiveArea, "page_meta", requestedKey)]: {
            title,
            description,
            ...indexPatch,
          },
        },
        deletedPageDrafts: {
          ...current.deletedPageDrafts,
          [getPhiBuilderRegionDraftKey(effectiveArea, "page_delete", requestedKey)]: false,
        },
      }));
      await reloadPersistedPageCatalog(effectiveArea);
      navigateToBuilderPage(requestedKey);
      emitPageTitleInputValue(requestedKey, title);
      dispatchPageMetaOverlay("close", correlationId);
      showMessage({ level: "success", content: "Page draft created." });
    } catch (error) {
      if (error instanceof PhiBuilderPageExistsError && !error.tombstoned) {
        // Somebody created it meanwhile: open that Page rather than failing on the path it holds.
        await reloadPersistedPageCatalog(effectiveArea);
        const refreshed = getPhiDeveloperBuilderStateSnapshot(defaultArea);
        const refreshedPages = resolvePhiBuilderActivePageCatalog(
          effectiveArea,
          refreshed.modulePresetPagesByArea,
          refreshed.customPages,
          refreshed.persistedPageCatalogByArea,
        );
        const existingKey = resolvePhiBuilderPageKeyFromCatalogPath(effectiveArea, error.path, refreshedPages);
        if (existingKey) navigateToBuilderPage(existingKey);
        dispatchPageMetaOverlay("close", correlationId);
        showMessage({ level: "info", content: `A Page at ${error.path} already exists, so it has been opened.` });
        return;
      }
      showMessage({
        level: "error",
        content: error instanceof PhiBuilderPageExistsError
          ? `A deleted Page still holds ${error.path}.`
          : error instanceof Error ? error.message : "Failed to create page.",
      });
    } finally {
      setPageMetaDialogSaving(false);
    }
  }

  usePhiSignalListener((signal) => {
    if (signal.receiver !== createPhiBuilderControllerAddress() || signal.scope !== "area") {
      return;
    }

    if (
      signal.channel === "pageMeta" &&
      signal.action === "activate" &&
      signal.valueType === "string" &&
      signal.value === "save"
    ) {
      if (pageMetaDialogSaving) return;
      emitSignal({
        scope: "page",
        channel: "submit",
        action: "activate",
        value: null,
        valueType: "none",
        sender: createPhiBuilderControllerAddress(),
        receiver: createPhiSignalAddress("cms", PHI_BUILDER_PAGE_META_WIDGET_IDS.form),
        correlationId: signal.correlationId,
        timestamp: Date.now(),
      });
      return;
    }

    if (
      signal.channel === "pageMeta" &&
      signal.action === "activate" &&
      signal.valueType === "string" &&
      signal.value === "cancel"
    ) {
      if (pageMetaDialogSaving) return;
      setPendingPageMetaInitialValues(null);
      emitSignal({
        scope: "page",
        channel: "reset",
        action: "activate",
        value: null,
        valueType: "none",
        sender: createPhiBuilderControllerAddress(),
        receiver: createPhiSignalAddress("cms", PHI_BUILDER_PAGE_META_WIDGET_IDS.form),
        correlationId: signal.correlationId,
        timestamp: Date.now(),
      });
      dispatchPageMetaOverlay("close", signal.correlationId);
      return;
    }

    if (
      signal.channel === "pageMetaVisibility" &&
      signal.action === "change" &&
      signal.value === false &&
      !pageMetaDialogSaving
    ) {
      setPendingPageMetaInitialValues(null);
      emitSignal({
        scope: "page",
        channel: "reset",
        action: "activate",
        value: null,
        valueType: "none",
        sender: createPhiBuilderControllerAddress(),
        receiver: createPhiSignalAddress("cms", PHI_BUILDER_PAGE_META_WIDGET_IDS.form),
        correlationId: signal.correlationId,
        timestamp: Date.now(),
      });
      return;
    }

    if (
      signal.channel === "pageMetaForm" &&
      signal.action === "change" &&
      signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.formValues
    ) {
      const submitted = readPhiRuntimeFormValuesSignalValue(signal.value);
      if (submitted && !pageMetaDialogSaving) {
        void submitPageMetaDialog(submitted.values, signal.correlationId);
      }
    }
  }, { channels: ["pageMeta", "pageMetaForm", "pageMetaVisibility"], receiver: createPhiBuilderControllerAddress() });

  useEffect(() => {
    if (readPhiDeveloperBuilderWorkspaceKey(pathname) !== "pages") {
      return;
    }

    emitPageTitleInputValue(effectivePageKey);
  }, [effectivePageKey, emitPageTitleInputValue, pathname]);

  return {
    currentPageTree,
    emitPageTitleInputValue,
    navigateToBuilderPage,
    openPageMetaDialog,
    pageMetaDialog: null,
  };
}
