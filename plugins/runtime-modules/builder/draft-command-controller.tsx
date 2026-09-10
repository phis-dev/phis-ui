"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  resolvePhiBuilderActivePageCatalog,
  resolvePhiBuilderActivePageKey,
  resolvePhiBuilderPagePresetSource,
} from "../../../helpers/cms-page-catalog";
import { buildPhiBuilderLiveHref,
  clearPhiDeveloperBuilderDraftAllocation,
  createPhiDeveloperBuilderInitialPageDrafts,
  deleteCmsDraft,
  discardPhiDeveloperBuilderModulesDraft,
  getPhiDeveloperBuilderModulesDraftAllocation,
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
  restorePhiDeveloperBuilderAreaMeta,
  restorePhiDeveloperRegionDrafts,
  setPhiDeveloperBuilderAreaRootRoute,
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
import { clearPhiBuilderModuleAreasDirty } from "./runtime-module-selection";
import { phiWorkspaceCatalogStore } from "../../../components/workspace/catalog-store";

export type PhiDeveloperBuilderToolbarCommand =
  | "save"
  | "preview"
  | "publish"
  | "undo"
  | "redo"
  | "reset"
  | "restorePreset";

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
  const router = useRouter();
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

  /**
   * The Areas a site-wide Modules command has to reach: every Area with unsaved selection edits,
   * plus every Area already holding an open Module draft allocation -- a draft saved earlier in the
   * session still wants its publish even when nothing changed since. The Modules workspace edits the
   * whole activation matrix at once, so its commands walk this list instead of the header Area scope.
   */
  function resolveModulesCommandAreas(): PhiDeveloperBuilderArea[] {
    const areas = new Set<PhiDeveloperBuilderArea>(state.modulesDirtyAreas ?? []);
    for (const key of Object.keys(state.draftAllocations ?? {})) {
      if (key.startsWith("modules:")) {
        areas.add(key.slice("modules:".length) as PhiDeveloperBuilderArea);
      }
    }
    return [...areas];
  }

  /**
   * Publish and reset also have to see Module drafts this client never touched -- a draft saved in
   * an earlier session leaves nothing in the local dirty list or allocations after a reload. When
   * the local answer is empty, ask the server which Areas hold an open Module draft; a save never
   * needs this, because "nothing edited" genuinely means nothing to save.
   */
  async function resolveModulesCommandAreasWithServer(): Promise<PhiDeveloperBuilderArea[]> {
    const local = resolveModulesCommandAreas();
    if (local.length > 0) {
      return local;
    }
    const areas: PhiDeveloperBuilderArea[] = [];
    for (const [area, source] of Object.entries(state.areaPresetSourcesByArea)) {
      if (!source) {
        continue;
      }
      const allocation = await getPhiDeveloperBuilderModulesDraftAllocation({
        area: area as PhiDeveloperBuilderArea,
        areaPresetSource: source,
      }).catch(() => null);
      if (allocation) {
        areas.push(area as PhiDeveloperBuilderArea);
      }
    }
    return areas;
  }

  async function runSaveCommand(
    workspaceKind: Exclude<PhiDeveloperBuilderCommandWorkspace, "theme" | null>,
  ) {
    if (workspaceKind === "modules") {
      const areas = resolveModulesCommandAreas();
      if (areas.length === 0) {
        showMessage({ level: "info", content: "No module selection changes to save." });
        return;
      }
      let lastRevisionId: number | null = null;
      for (const area of areas) {
        const modulesResult = await savePhiDeveloperBuilderModulesDraft(
          state,
          getPhiDeveloperRegionDraftsSnapshot(),
          {
            builderPlugins: builderModuleMetas.plugins,
            scope: { area },
            /*
             * The Area's code-owned Shell, which this controller holds on every Builder page -- the same
             * drafts "reset shell" restores from. A Module selection for an Area nobody has saved yet
             * needs a Shell baseline, and the Modules workspace hydrates no region drafts of its own: it
             * edits a selection rather than a structure. Without this the save asked the operator to go
             * and create a Shell that already exists in code.
             */
            shellPresetDrafts: shellPresetDraftsByArea[area] ?? null,
          },
        );
        lastRevisionId = modulesResult.revisionId;
      }
      emitDraftStatus("draft", lastRevisionId);
      showMessage({
        level: "success",
        content: areas.length === 1
          ? "Saved module selection draft."
          : `Saved module selection drafts for ${areas.length} areas.`,
      });
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
      const areas = await resolveModulesCommandAreasWithServer();
      if (areas.length === 0) {
        showMessage({ level: "info", content: "No module selection changes to publish." });
        return;
      }
      for (const area of areas) {
        await publishPhiDeveloperBuilderModulesDraft(
          state,
          getPhiDeveloperRegionDraftsSnapshot(),
          {
            builderPlugins: builderModuleMetas.plugins,
            scope: { area },
          },
        );
      }
      clearPhiBuilderModuleAreasDirty(defaultArea);
      emitDraftStatus("published", null);
      showMessage({
        level: "success",
        content: areas.length === 1
          ? "Published module selection."
          : `Published module selection for ${areas.length} areas.`,
      });
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
        resolvePhiBuilderActivePageKey(null, resolvePhiBuilderActivePageCatalog(
          effectiveArea,
          state.modulePresetPagesByArea,
          state.customPages ?? {},
          state.persistedPageCatalogByArea,
        )) ?? effectivePageKey;
      const previewHref = new URL(
        buildPhiBuilderLiveHref(effectiveArea, previewPageKey, currentPageTree, "pages"),
        window.location.origin,
      );
      previewHref.searchParams.set("navRevision", String(draft.revisionId));
      window.open(`${previewHref.pathname}${previewHref.search}${previewHref.hash}`, "_blank", "noopener,noreferrer");
      return;
    }

    if (workspaceKind === "modules") {
      /*
       * Nothing on the Modules page names a page -- the selection is site-wide -- so Preview opens the
       * Area itself: its first catalog page, rather than whatever page another workspace last held.
       */
      const previewPageKey =
        resolvePhiBuilderActivePageKey(null, resolvePhiBuilderActivePageCatalog(
          effectiveArea,
          state.modulePresetPagesByArea,
          state.customPages ?? {},
          state.persistedPageCatalogByArea,
        )) ?? effectivePageKey;
      window.open(
        buildPhiBuilderLiveHref(effectiveArea, previewPageKey, currentPageTree, "structure"),
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
      title: "Discard shell draft?",
      content: "This discards the unpublished shell draft for this Area. What is published stays live.",
      okText: "Discard draft",
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
          /*
           * What the Shell said about itself went with the draft, and only the server knows what is
           * left.
           *
           * The Region tree above can be put back from the preset this client already holds; the root
           * route and the SEO answers cannot -- what stands after the override is deleted is whatever
           * was published, and that is a value nobody here has. So the session's answers are dropped
           * and the workspace is asked for again: `/pages` reads the stored root route to decide which
           * Pages it may open, and leaving the deleted draft's answer in place would have it offering
           * a `/` that no longer exists.
           */
          setPhiDeveloperBuilderAreaRootRoute(effectiveArea, undefined);
          restorePhiDeveloperBuilderAreaMeta(effectiveArea, undefined);
          router.refresh();
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
   * Gives the Area back to the Module preset by removing the Site's own shell entirely.
   *
   * The reset above discards a draft and leaves what is published standing, which is right when an edit
   * went wrong and wrong when the shell itself should no longer exist: an Area published once kept its
   * snapshot forever, and every later preset improvement stopped at it, invisibly, because the Area
   * still rendered. This is the way back, and it is a separate command because it also takes the live
   * chrome with it.
   */
  function confirmRestoreShellPreset() {
    const presetDrafts = shellPresetDraftsByArea[effectiveArea] ?? null;
    const sourcePreset = state.areaPresetSourcesByArea[effectiveArea] ?? null;
    if (!presetDrafts || !sourcePreset) {
      showMessage({ level: "warning", content: "No shell preset found for the current area." });
      return;
    }

    modal.confirm({
      title: "Restore the Module preset?",
      content:
        "This deletes this Area's own shell, drafts and published alike, and puts the Module preset back. " +
        "It cannot be undone.",
      okText: "Delete shell and restore",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      centered: true,
      onOk: async () => {
        setActiveDraftAction("restorePreset");
        try {
          await deleteCmsDraft("/api/site/cms/area/override", {
            area: effectiveArea,
            ownerModuleId: sourcePreset.ownerModuleId,
            presetKey: sourcePreset.presetKey,
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
          // What the deleted shell said about itself -- its root route, its SEO answers -- went with it,
          // and what stands now is the preset's own. Only the server knows that, so the session drops
          // its copies and asks again, exactly as the draft reset does.
          setPhiDeveloperBuilderAreaRootRoute(effectiveArea, undefined);
          restorePhiDeveloperBuilderAreaMeta(effectiveArea, undefined);
          router.refresh();
          showMessage({ level: "success", content: "Restored the Module preset." });
        } catch (error) {
          showMessage({ level: "error", content: error instanceof Error ? error.message : "Preset restore failed." });
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
   * Deliberately the code-owned default rather than a re-fetch of the published selection. The Shell
   * reset above does ask the server again, because what it discards -- the Area's root route -- decides
   * which Pages another workspace may open, and a stale answer there is a Page list describing a Site
   * that is not served. A Module selection has no such reader: "back to the start" is a complete answer
   * once there is no draft left to describe something in between.
   */
  function confirmResetModules() {
    void confirmResetModulesForAreas();
  }

  async function confirmResetModulesForAreas() {
    const areas = await resolveModulesCommandAreasWithServer();
    if (areas.length === 0) {
      showMessage({ level: "info", content: "No module selection changes to reset." });
      return;
    }
    modal.confirm({
      title: "Delete Module drafts?",
      content: "This removes the open DB Module drafts and restores the shared default selection for every touched area.",
      okText: "Delete and reset",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      centered: true,
      onOk: async () => {
        setActiveDraftAction("reset");
        try {
          for (const area of areas) {
            await discardPhiDeveloperBuilderModulesDraft({
              area,
              areaPresetSource: state.areaPresetSourcesByArea[area] ?? null,
            });
          }
          phiWorkspaceCatalogStore.patch(defaultArea, (current) => ({
            ...current,
            runtimeModuleIdsByArea: {
              ...(current.runtimeModuleIdsByArea ?? {}),
              ...Object.fromEntries(areas.map((area) => [area, createPhiDefaultAreaRuntimeModuleIds(area)])),
            },
          }));
          clearPhiBuilderModuleAreasDirty(defaultArea);
          phiBuilderHistory.clear(createPhiBuilderHistoryContext({
            workspace: "modules",
            area: defaultArea,
          }));
          showMessage({ level: "success", content: "Reset Module drafts." });
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

    if (command === "restorePreset") {
      // Only the shell workspace owns an Area preset to restore; elsewhere the command is not offered.
      if (workspaceKind === "structure") {
        confirmRestoreShellPreset();
      }
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
      if (snapshot.kind === "areaRootRoute") {
        // Without a history context of its own, so restoring does not record a step back to here.
        setPhiDeveloperBuilderAreaRootRoute(snapshot.area, snapshot.rootRoute);
        return;
      }
      if (snapshot.kind === "areaMeta") {
        restorePhiDeveloperBuilderAreaMeta(snapshot.area, snapshot.meta);
        return;
      }
      if (snapshot.kind === "modules") {
        phiWorkspaceCatalogStore.patch(defaultArea, (current) => ({
          ...current,
          runtimeModuleIdsByArea: {
            ...(current.runtimeModuleIdsByArea ?? {}),
            // `null` recorded "no selection stored", which resolves to the Area's default set.
            ...Object.fromEntries(Object.entries(snapshot.moduleIdsByArea).map(([area, moduleIds]) => [
              area,
              moduleIds ? [...moduleIds] : createPhiDefaultAreaRuntimeModuleIds(area as PhiDeveloperBuilderArea),
            ])),
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
