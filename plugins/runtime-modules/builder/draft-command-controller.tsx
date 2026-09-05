"use client";

import { useState } from "react";
import { App } from "antd";

import { PhiCmsRegionType } from "../../../constants/phi-cms";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../types/signals";
import { usePhiSignalDispatcher } from "../../../components/runtime/runtime-signal-bus";
import { usePhiApplicationFeedback } from "../../../components/runtime/use-phi-application-feedback";
import { createPhiBuilderControllerAddress } from "./controller/address";
import { createPhiDefaultAreaRuntimeModuleIds } from "./runtime-module-defaults";
import { getPhiBuilderDefaultRegionDraft } from "./region-defaults";
import {
  getPhiBuilderRegionDraftKey,
  PHI_BUILDER_PAGE_REGION_KEYS,
} from "./region-keys";
import { resolvePhiBuilderCmsStoragePath } from "../../../helpers/cms-paths";
import { resolvePhiBuilderActivePageCatalog, resolvePhiBuilderPagePresetSource } from "../../../helpers/cms-page-catalog";
import { buildPhiBuilderLiveHref,
  clearPhiDeveloperBuilderDraftAllocation,
  createPhiDeveloperBuilderInitialPageDrafts,
  deleteCmsDraft,
  discardPhiDeveloperBuilderModulesDraft,
  savePhiDeveloperBuilderModulesDraft,
  publishPhiDeveloperBuilderModulesDraft,
  previewPhiDeveloperBuilderDraft,
  publishPhiDeveloperBuilderDraft,
  savePhiDeveloperBuilderDraft,
} from "./persistence";
import {
  clearPhiBuilderNavigationDraft,
  getPhiBuilderNavigationDraftSnapshot,
  restorePhiBuilderNavigationDraft,
  setPhiBuilderNavigationDraft,
} from "./navigation-store";
import {
  deletePhiBuilderNavigationDraft,
  loadPhiBuilderNavigationDraft,
  loadPhiBuilderNavigationScope,
  publishPhiBuilderNavigationDraft,
  savePhiBuilderNavigationDraft,
} from "./navigation-persistence";
import {
  builderWorkspaceStore,
  splitWorkspacePatch,
  getPhiDeveloperRegionDraftsSnapshot,
  mergePhiDeveloperDeletedPageDrafts,
  mergePhiDeveloperRegionDrafts,
  restorePhiDeveloperRegionDrafts,
} from "./developer-workspace-store";
import type {
  PhiDeveloperBuilderArea,
  PhiDeveloperBuilderCommandWorkspace,
  PhiDeveloperBuilderRegionDraft,
  PhiDeveloperBuilderWorkspaceState,
} from "./developer-workspace-types";
import { getBuilderRegionKey } from "./region-controller";
import { findPhiBuilderNavigationSurface } from "../../../helpers/cms-navigation-catalog";
import {
  createPhiBuilderHistoryContext,
  phiBuilderHistory,
  type PhiBuilderHistorySnapshot,
} from "./history";
import { usePhiBuilderModuleMetas } from "./plugin-meta-store";
import { phiWorkspaceCatalogStore } from "../../../components/workspace/catalog-store";

export type PhiDeveloperBuilderToolbarCommand =
  | "save"
  | "preview"
  | "publish"
  | "undo"
  | "redo"
  | "reset";

export function usePhiBuilderDraftCommandController({
  commandWorkspace,
  defaultArea,
  effectiveArea,
  effectiveNavKey,
  effectivePageKey,
  pathname,
  shellPresetDraftsByArea,
  state,
}: {
  commandWorkspace: PhiDeveloperBuilderCommandWorkspace;
  defaultArea: PhiDeveloperBuilderArea;
  effectiveArea: PhiDeveloperBuilderArea;
  effectiveNavKey: string;
  effectivePageKey: string;
  pathname: string | null;
  shellPresetDraftsByArea: Record<string, Record<string, PhiDeveloperBuilderRegionDraft>>;
  state: PhiDeveloperBuilderWorkspaceState;
}) {
  const { modal } = App.useApp();
  const { showMessage } = usePhiApplicationFeedback();
  const dispatchSignal = usePhiSignalDispatcher();
  const builderModuleMetas = usePhiBuilderModuleMetas(effectiveArea);
  const [activeDraftAction, setActiveDraftAction] = useState<PhiDeveloperBuilderToolbarCommand | null>(null);
  const currentPageTree = resolvePhiBuilderActivePageCatalog(
    effectiveArea,
    state.modulePresetPagesByArea,
    state.customPages,
    state.persistedPageCatalogByArea,
  );
  const navigationSurface = findPhiBuilderNavigationSurface(
    state.navigationSurfacesByArea[effectiveArea] ?? [],
    effectiveNavKey,
  );

  async function resolveCurrentNavigationDraft() {
    if (!navigationSurface) {
      throw new Error(`Navigation surface "${effectiveNavKey}" is not loaded.`);
    }
    const currentDraft = getPhiBuilderNavigationDraftSnapshot(effectiveNavKey);
    if (currentDraft) {
      return currentDraft;
    }

    const scope = await loadPhiBuilderNavigationScope(effectiveNavKey, navigationSurface);
    setPhiBuilderNavigationDraft(effectiveNavKey, scope.navigation);
    phiBuilderHistory.clear(createPhiBuilderHistoryContext({
      workspace: "navigation",
      area: effectiveArea,
      navKey: effectiveNavKey,
    }));
    return scope.navigation;
  }

  function emitDraftStatus(status: "draft" | "published", revisionId: number | null) {
    dispatchSignal({
      scope: "area",
      channel: "draftStatus",
      action: "change",
      value: {
        status,
        revisionId,
        ...(commandWorkspace === "navigation"
          ? { navKey: effectiveNavKey }
          : {
              area: effectiveArea,
              pageKey: effectivePageKey,
            }),
        regionKey: getBuilderRegionKey(PhiCmsRegionType.HeaderMain),
      },
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.revisionsDraftStatus,
      sender: createPhiBuilderControllerAddress(),
      receiver: "broadcast",
      timestamp: Date.now(),
    });
  }

  async function runSaveCommand(
    workspaceKind: Exclude<PhiDeveloperBuilderCommandWorkspace, "theme" | null>,
  ) {
    if (workspaceKind === "modules") {
      const modulesResult = await savePhiDeveloperBuilderModulesDraft(
        state,
        getPhiDeveloperRegionDraftsSnapshot(),
        {
          builderPlugins: builderModuleMetas.plugins,
          scope: { area: effectiveArea },
          /*
           * The Area's code-owned Shell, which this controller holds on every Builder page -- the same
           * drafts "reset shell" restores from. A Module selection for an Area nobody has saved yet
           * needs a Shell baseline, and the Modules workspace hydrates no region drafts of its own: it
           * edits a selection rather than a structure. Without this the save asked the operator to go
           * and create a Shell that already exists in code.
           */
          shellPresetDrafts: shellPresetDraftsByArea[effectiveArea] ?? null,
        },
      );
      emitDraftStatus("draft", modulesResult.revisionId);
      showMessage({ level: "success", content: "Saved module selection draft." });
      return;
    }

    const result = workspaceKind === "navigation"
      ? await Promise.resolve().then(async () => {
          const navigationDraft = await resolveCurrentNavigationDraft();
          return savePhiBuilderNavigationDraft(navigationDraft);
        })
      : await savePhiDeveloperBuilderDraft(
          state,
          getPhiDeveloperRegionDraftsSnapshot(),
          workspaceKind,
          {
            builderPlugins: builderModuleMetas.plugins,
            pathname,
            scope: {
              area: effectiveArea,
              pageKey: effectivePageKey,
            },
          },
        );

    emitDraftStatus("draft", result.revisionId);
    if (!("savedScopes" in result)) {
      const navigationDraft = await resolveCurrentNavigationDraft();
      setPhiBuilderNavigationDraft(effectiveNavKey, {
        ...navigationDraft,
        draftAllocation: {
          revisionId: result.revisionId,
          nextNodeSequence: result.nextNodeSequence,
        },
      });
      showMessage({ level: "success", content: "Saved navigation draft." });
      return;
    }

    showMessage({ level: "success", content: result.savedScopes === 1 ? "Saved CMS draft." : `Saved ${result.savedScopes} CMS drafts.` });
  }

  async function runPublishCommand(
    workspaceKind: Exclude<PhiDeveloperBuilderCommandWorkspace, "theme" | null>,
  ) {
    if (workspaceKind === "modules") {
      await publishPhiDeveloperBuilderModulesDraft(
        state,
        getPhiDeveloperRegionDraftsSnapshot(),
        {
          builderPlugins: builderModuleMetas.plugins,
          scope: { area: effectiveArea },
        },
      );
      emitDraftStatus("published", null);
      showMessage({ level: "success", content: "Published module selection." });
      return;
    }

    if (workspaceKind === "navigation") {
      const navigationDraft = await resolveCurrentNavigationDraft();
      await publishPhiBuilderNavigationDraft(navigationDraft);
    } else {
      await publishPhiDeveloperBuilderDraft(
        state,
        getPhiDeveloperRegionDraftsSnapshot(),
        workspaceKind,
        {
          builderPlugins: builderModuleMetas.plugins,
          pathname,
          scope: {
            area: effectiveArea,
            pageKey: effectivePageKey,
          },
        },
      );
    }

    emitDraftStatus("published", null);
    showMessage({ level: "success", content: "Published CMS draft." });
  }

  async function runPreviewCommand(
    workspaceKind: Exclude<PhiDeveloperBuilderCommandWorkspace, "theme" | null>,
  ) {
    if (workspaceKind === "navigation") {
      if (!navigationSurface) {
        throw new Error(`Navigation surface "${effectiveNavKey}" is not loaded.`);
      }
      const draft = await loadPhiBuilderNavigationDraft(effectiveNavKey, navigationSurface);
      if (!draft) {
        throw new Error("No saved navigation draft found for the current navigation key.");
      }

      const previewPageKey =
        resolvePhiBuilderActivePageCatalog(
          effectiveArea,
          state.modulePresetPagesByArea,
          state.customPages ?? {},
          state.persistedPageCatalogByArea,
        )[0]?.key ?? effectivePageKey;
      const previewHref = new URL(
        buildPhiBuilderLiveHref(effectiveArea, previewPageKey, currentPageTree, "pages"),
        window.location.origin,
      );
      previewHref.searchParams.set("navRevision", String(draft.revisionId));
      window.open(`${previewHref.pathname}${previewHref.search}${previewHref.hash}`, "_blank", "noopener,noreferrer");
      return;
    }

    if (workspaceKind === "modules") {
      window.open(
        buildPhiBuilderLiveHref(effectiveArea, effectivePageKey, currentPageTree, "structure"),
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }

    const previewScope = {
      area: effectiveArea,
      pageKey: effectivePageKey,
    };
    const result = await previewPhiDeveloperBuilderDraft(state, workspaceKind, {
      pathname,
      scope: previewScope,
    }).catch(() => null);
    const href = result?.previewHref ??
      buildPhiBuilderLiveHref(
        previewScope.area,
        previewScope.pageKey,
        currentPageTree,
        workspaceKind,
      );
    window.open(href, "_blank", "noopener,noreferrer");
  }

  function confirmResetShell() {
    const presetDrafts = shellPresetDraftsByArea[effectiveArea] ?? null;
    if (!presetDrafts) {
      showMessage({ level: "warning", content: "No shell preset found for the current area." });
      return;
    }

    modal.confirm({
      title: "Delete shell override?",
      content: "This removes the current DB shell override and restores the shared preset.",
      okText: "Delete and reset",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      centered: true,
      onOk: async () => {
        setActiveDraftAction("reset");
        try {
          await deleteCmsDraft("/api/site/cms/area", {
            area: effectiveArea,
            ownerModuleId: state.areaPresetSourcesByArea[effectiveArea]?.ownerModuleId,
            presetKey: state.areaPresetSourcesByArea[effectiveArea]?.presetKey,
          });
          clearPhiDeveloperBuilderDraftAllocation({
            area: effectiveArea,
            pageKey: effectivePageKey,
            workspaceKind: "structure",
          });
          mergePhiDeveloperRegionDrafts(presetDrafts);
          phiBuilderHistory.clear(createPhiBuilderHistoryContext({
            workspace: "structure",
            area: effectiveArea,
          }));
          showMessage({ level: "success", content: "Reset shell draft." });
        } catch (error) {
          showMessage({ level: "error", content: error instanceof Error ? error.message : "Shell reset failed." });
          throw error;
        } finally {
          setActiveDraftAction(null);
        }
      },
    });
  }

  /**
   * Discards the Area's Module draft and puts the selection back to what a fresh Area would run with.
   *
   * Deliberately the code-owned default rather than a re-fetch of the published selection: that is what
   * "Reset" already means for the Shell draft above, and for the same reason -- a reload would need a
   * round trip this dialog has no occasion to make, and "back to the start" is the answer either way
   * once there is no draft left to describe something in between.
   */
  function confirmResetModules() {
    modal.confirm({
      title: "Delete Module draft?",
      content: "This removes the current DB Module draft and restores the shared default selection.",
      okText: "Delete and reset",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      centered: true,
      onOk: async () => {
        setActiveDraftAction("reset");
        try {
          await discardPhiDeveloperBuilderModulesDraft({
            area: effectiveArea,
            areaPresetSource: state.areaPresetSourcesByArea[effectiveArea] ?? null,
          });
          phiWorkspaceCatalogStore.patch(defaultArea, (current) => ({
            ...current,
            runtimeModuleIdsByArea: {
              ...(current.runtimeModuleIdsByArea ?? {}),
              [effectiveArea]: createPhiDefaultAreaRuntimeModuleIds(effectiveArea),
            },
          }));
          phiBuilderHistory.clear(createPhiBuilderHistoryContext({
            workspace: "modules",
            area: effectiveArea,
          }));
          showMessage({ level: "success", content: "Reset Module draft." });
        } catch (error) {
          showMessage({ level: "error", content: error instanceof Error ? error.message : "Module reset failed." });
          throw error;
        } finally {
          setActiveDraftAction(null);
        }
      },
    });
  }

  function confirmResetPage() {
    const presetDrafts = Object.fromEntries(
      PHI_BUILDER_PAGE_REGION_KEYS.flatMap((regionKey) => {
        const draftKey = getPhiBuilderRegionDraftKey(effectiveArea, regionKey, effectivePageKey);
        const draft = state.pagePresetDrafts[draftKey];
        return draft ? [[draftKey, draft] as const] : [];
      }),
    );
    const hasPreset = Object.keys(presetDrafts).length > 0;

    modal.confirm({
      title: hasPreset ? "Delete page override?" : "Delete page?",
      content: hasPreset
        ? "This removes the current DB page override and restores the shared preset."
        : "This prepares a delete draft. The live page returns 404 after the draft is published.",
      okText: hasPreset ? "Delete and reset" : "Create delete draft",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      centered: true,
      onOk: async () => {
        setActiveDraftAction("reset");
        try {
          if (!hasPreset) {
            const nextDrafts = createPhiDeveloperBuilderInitialPageDrafts({
              area: effectiveArea,
              pageKey: effectivePageKey,
              title: "",
            });
            const pageDeleteDraftKey = getPhiBuilderRegionDraftKey(effectiveArea, "page_delete", effectivePageKey);
            mergePhiDeveloperRegionDrafts(nextDrafts);
            builderWorkspaceStore.patch(defaultArea, (current) => ({
              ...current,
              deletedPageDrafts: {
                ...current.deletedPageDrafts,
                [pageDeleteDraftKey]: true,
              },
            }));
            const result = await savePhiDeveloperBuilderDraft(
              {
                ...state,
                deletedPageDrafts: {
                  ...state.deletedPageDrafts,
                  [pageDeleteDraftKey]: true,
                },
              },
              {
                ...getPhiDeveloperRegionDraftsSnapshot(),
                ...nextDrafts,
              },
              "pages",
              {
                builderPlugins: builderModuleMetas.plugins,
                pathname,
                scope: {
                  area: effectiveArea,
                  pageKey: effectivePageKey,
                },
              },
            );
            emitDraftStatus("draft", result.revisionId);
            phiBuilderHistory.clear(createPhiBuilderHistoryContext({
              workspace: "pages",
              area: effectiveArea,
              pageKey: effectivePageKey,
            }));
            showMessage({ level: "success", content: "Saved page delete draft." });
            return;
          }

          const pages = resolvePhiBuilderActivePageCatalog(
            effectiveArea,
            state.modulePresetPagesByArea,
            state.customPages,
            state.persistedPageCatalogByArea,
          );
          const sourcePreset = resolvePhiBuilderPagePresetSource(effectivePageKey, pages);
          await deleteCmsDraft("/api/site/cms/page", {
            area: effectiveArea,
            ...(sourcePreset
              ? {
                  ownerModuleId: sourcePreset.ownerModuleId,
                  presetKey: sourcePreset.presetKey,
                }
              : {
                  path: resolvePhiBuilderCmsStoragePath(
                    effectiveArea,
                    effectivePageKey,
                    pages,
                  ),
                }),
          });
          clearPhiDeveloperBuilderDraftAllocation({
            area: effectiveArea,
            pageKey: effectivePageKey,
            workspaceKind: "pages",
          });

          const nextDrafts: Record<string, PhiDeveloperBuilderRegionDraft> = {};

          for (const regionKey of PHI_BUILDER_PAGE_REGION_KEYS) {
            const draftKey = getPhiBuilderRegionDraftKey(effectiveArea, regionKey, effectivePageKey);
            nextDrafts[draftKey] = {
              ...getPhiBuilderDefaultRegionDraft(regionKey),
              ...(presetDrafts[draftKey] ?? {}),
            };
          }

          mergePhiDeveloperRegionDrafts(nextDrafts);
          mergePhiDeveloperDeletedPageDrafts(effectiveArea, {
            [getPhiBuilderRegionDraftKey(effectiveArea, "page_delete", effectivePageKey)]: false,
          });
          phiBuilderHistory.clear(createPhiBuilderHistoryContext({
            workspace: "pages",
            area: effectiveArea,
            pageKey: effectivePageKey,
          }));
          showMessage({ level: "success", content: "Reset page draft." });
        } catch (error) {
          showMessage({ level: "error", content: error instanceof Error ? error.message : "Page reset failed." });
          throw error;
        } finally {
          setActiveDraftAction(null);
        }
      },
    });
  }

  function confirmResetNavigation() {
    modal.confirm({
      title: "Delete navigation draft?",
      content: "This removes the current navigation draft and restores the published navigation tree.",
      okText: "Delete and reset",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      centered: true,
      onOk: async () => {
        setActiveDraftAction("reset");
        try {
          await deletePhiBuilderNavigationDraft(effectiveNavKey);
          clearPhiBuilderNavigationDraft(effectiveNavKey);
          phiBuilderHistory.clear(createPhiBuilderHistoryContext({
            workspace: "navigation",
            area: effectiveArea,
            navKey: effectiveNavKey,
          }));
          dispatchSignal({
            scope: "area",
            channel: "navigation",
            action: "reload",
            value: {
              navKey: effectiveNavKey,
            },
            valueType: "json",
            valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.builderNavigation,
            sender: createPhiBuilderControllerAddress(),
            receiver: createPhiBuilderControllerAddress(),
          });
          showMessage({ level: "success", content: "Reset navigation draft." });
        } catch (error) {
          showMessage({ level: "error", content: error instanceof Error ? error.message : "Navigation reset failed." });
          throw error;
        } finally {
          setActiveDraftAction(null);
        }
      },
    });
  }

  function runResetCommand(
    workspaceKind: Exclude<PhiDeveloperBuilderCommandWorkspace, "theme" | null>,
  ) {
    if (workspaceKind === "structure") {
      confirmResetShell();
      return;
    }

    if (workspaceKind === "pages") {
      confirmResetPage();
      return;
    }

    if (workspaceKind === "modules") {
      confirmResetModules();
      return;
    }

    confirmResetNavigation();
  }

  function runBuilderCommand(command: PhiDeveloperBuilderToolbarCommand) {
    const workspaceKind = state.commandWorkspace;
    if (workspaceKind == null) {
      return;
    }

    if (workspaceKind === "theme") {
      return;
    }

    if (activeDraftAction != null) {
      return;
    }

    if (command === "reset") {
      runResetCommand(workspaceKind);
      return;
    }

    const historyContext = createPhiBuilderHistoryContext({
      workspace: workspaceKind,
      area: effectiveArea,
      pageKey: effectivePageKey,
      navKey: effectiveNavKey,
    });
    const applyHistorySnapshot = (snapshot: PhiBuilderHistorySnapshot) => {
      if (snapshot.kind === "regionDrafts") {
        restorePhiDeveloperRegionDrafts(snapshot.drafts);
        return;
      }
      if (snapshot.kind === "navigation") {
        restorePhiBuilderNavigationDraft(snapshot.navKey, snapshot.draft);
        return;
      }
      if (snapshot.kind === "modules") {
        phiWorkspaceCatalogStore.patch(defaultArea, (current) => ({
          ...current,
          runtimeModuleIdsByArea: {
            ...(current.runtimeModuleIdsByArea ?? {}),
            [snapshot.area]: snapshot.moduleIds,
          },
        }));
        return;
      }
      /*
       * A workspace snapshot spans both halves -- customPages belongs to the catalog, the page drafts
       * to the Builder -- so undo has to put each back where it lives.
       */
      const { catalog, tool } = splitWorkspacePatch(snapshot.state);
      if (Object.keys(catalog).length > 0) {
        phiWorkspaceCatalogStore.patch(defaultArea, (current) => ({ ...current, ...catalog }));
      }
      if (Object.keys(tool).length > 0) {
        builderWorkspaceStore.patch(defaultArea, (current) => ({ ...current, ...tool }));
      }
    };

    if (command === "undo") {
      phiBuilderHistory.undo(historyContext, applyHistorySnapshot);
      return;
    }

    if (command === "redo") {
      phiBuilderHistory.redo(historyContext, applyHistorySnapshot);
      return;
    }

    setActiveDraftAction(command);
    const action =
      command === "save"
        ? runSaveCommand(workspaceKind)
        : command === "publish"
          ? runPublishCommand(workspaceKind)
          : runPreviewCommand(workspaceKind);

    action
      .catch((error) => {
        const fallback =
          command === "save"
            ? "CMS draft save failed."
            : command === "publish"
              ? "CMS publish failed."
              : "Draft preview failed.";
        showMessage({ level: "error", content: error instanceof Error ? error.message : fallback });
      })
      .finally(() => {
        setActiveDraftAction(null);
      });
  }

  return { confirmResetPage, confirmResetModules, runBuilderCommand };
}
