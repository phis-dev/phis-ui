"use client";

import { useState } from "react";

import { usePhiConfirmDialog } from "../../../components/controls/phi-confirm-dialog";
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
  updatePhiBuilderNavigationDraft,
  restorePhiBuilderNavigationDraft,
  setPhiBuilderNavigationDraft,
} from "./navigation-store";
import {
  deletePhiBuilderNavigationDraft,
  loadPhiBuilderNavigationDraft,
  loadPhiBuilderNavigationScope,
  publishPhiBuilderNavigationDraft,
  savePhiBuilderNavigationDraft,
  type PhiBuilderNavigationFolderCarry,
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
  setPhiDeveloperRegionDraftsWithHistory,
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
import type { PhiBuilderNavigationItem } from "../../../helpers/cms-navigation-catalog";
import {
  applyPhiBuilderNavigationFolderTargets,
  refreshPhiBuilderNavigationFolderAddresses,
} from "./navigation-folder-address";
import { createPhiBuilderNavigationPathContext } from "./navigation-path-context";

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
  /*
   * Every one of these is a command from a toolbar somewhere else, so there is nothing on screen to
   * hang a Popconfirm on. Drawn as a Dialog by this Controller rather than asked of Ant Design's
   * `App`, whose provider would otherwise sit in every page's first load for the sake of questions
   * only the Builder asks.
   */
  const { confirm, confirmDialog } = usePhiConfirmDialog();
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
      return withCurrentFolderAddresses(currentDraft);
    }

    const scope = await loadPhiBuilderNavigationScope(effectiveNavKey, navigationSurface);
    setPhiBuilderNavigationDraft(effectiveNavKey, scope.navigation);
    phiBuilderHistory.clear(createPhiBuilderHistoryContext({
      workspace: "navigation",
      area: effectiveArea,
      navKey: effectiveNavKey,
    }));
    return withCurrentFolderAddresses(scope.navigation);
  }

  /*
   * A save may have carried folder targets into other Navigations of the Area (phis-server REFERENCES.md, "Folder
   * addresses"). Their Drafts on the server moved; one open here takes the same targets and the new base
   * revision, one that is not is loaded, and neither records history -- Undo stays per Navigation.
   */
  async function adoptCarriedFolderTargets(carriedOver: readonly PhiBuilderNavigationFolderCarry[]) {
    if (carriedOver.length === 0) return;
    const surfaces = state.navigationSurfacesByArea[effectiveArea] ?? [];
    for (const carry of carriedOver) {
      if (getPhiBuilderNavigationDraftSnapshot(carry.key)) {
        updatePhiBuilderNavigationDraft(carry.key, (current) => ({
          ...current!,
          items: applyPhiBuilderNavigationFolderTargets(current!.items, carry.folders),
          draftAllocation: {
            revisionId: carry.revisionId,
            nextNodeSequence: Math.max(current!.draftAllocation?.nextNodeSequence ?? 1, carry.nextNodeSequence),
          },
        }));
        continue;
      }
      const surface = surfaces.find((candidate) => candidate.navKey === carry.key);
      if (surface) {
        setPhiBuilderNavigationDraft(carry.key, (await loadPhiBuilderNavigationScope(carry.key, surface)).navigation);
      }
    }
    showMessage({
      level: "info",
      content: `The folder target was also set in ${carriedOver.map((carry) => carry.key).join(", ")}.`,
    });
  }

  /*
   * A folder address is resolved when the Draft is saved or published (phis-server REFERENCES.md, "Folder addresses"): a
   * Page moved in /pages since the last Navigation edit has moved the folder its container stands for.
   */
  function withCurrentFolderAddresses<TNavigation extends { items: PhiBuilderNavigationItem[] }>(navigation: TNavigation) {
    const items = refreshPhiBuilderNavigationFolderAddresses(
      navigation.items,
      createPhiBuilderNavigationPathContext(state).resolveLinkPath,
    );
    return items === navigation.items ? navigation : { ...navigation, items };
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
      await adoptCarriedFolderTargets(result.carriedOver);
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
      const published = await publishPhiBuilderNavigationDraft(navigationDraft);
      await adoptCarriedFolderTargets(published.carriedOver);
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

  /**
   * Puts the Module's shell back into the draft, as an edit rather than as an erasure.
   *
   * It used to delete the draft on the server and clear the history behind it, which made "start over"
   * the one gesture in this workspace that could not be taken back -- and it promised the wrong thing
   * twice over: the dialog said what is published stays live while the editor came back showing the
   * preset, two different answers that only agreed while nobody had published.
   *
   * Nothing is deleted now. The preset's Regions are written into the draft as one recorded step, so
   * undo returns what was there, the previous draft stays in the revision history, and what is live
   * stays live until somebody publishes. That also makes this the only way back to where a Module
   * started: revisions know the states this Site has been in, and if it was customised before it was
   * first published, the Module's own starting point was never one of them.
   *
   * The Area's root route and its SEO answers are deliberately untouched. They say where the Area lives
   * and how it describes itself, which is not what its shell looks like; the old command dropped them
   * only because it had deleted the draft that held them.
   */
  function confirmResetShell() {
    const presetDrafts = shellPresetDraftsByArea[effectiveArea] ?? null;
    if (!presetDrafts) {
      showMessage({ level: "warning", content: "No shell preset found for the current area." });
      return;
    }

    confirm({
      title: "Start from the Module's shell?",
      content:
        "This puts the Module's shell into the draft, replacing what the editor is showing. " +
        "Nothing is deleted -- undo takes it back, and what is published stays live until you publish.",
      confirmLabel: "Start from the preset",
      cancelLabel: "Cancel",
      onConfirm: () => {
        setPhiDeveloperRegionDraftsWithHistory(presetDrafts, {
          historyContext: createPhiBuilderHistoryContext({
            workspace: "structure",
            area: effectiveArea,
          }),
          historyLabel: "Start from the Module's shell",
        });
        showMessage({ level: "success", content: "The Module's shell is in the draft." });
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
    confirm({
      title: "Delete Module drafts?",
      content: "This removes the open DB Module drafts and restores the shared default selection for every touched area.",
      confirmLabel: "Delete and reset",
      danger: true,
      cancelLabel: "Cancel",
      onConfirm: async () => {
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

    confirm({
      title: hasPreset ? "Delete page override?" : "Delete page?",
      content: hasPreset
        ? "This removes the current DB page override and restores the shared preset."
        : "This prepares a delete draft. The live page returns 404 after the draft is published.",
      confirmLabel: hasPreset ? "Delete and reset" : "Create delete draft",
      danger: true,
      cancelLabel: "Cancel",
      onConfirm: async () => {
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
    confirm({
      title: "Delete navigation draft?",
      content: "This removes the current navigation draft and restores the published navigation tree.",
      confirmLabel: "Delete and reset",
      danger: true,
      cancelLabel: "Cancel",
      onConfirm: async () => {
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

  return { confirmResetPage, confirmResetModules, runBuilderCommand, confirmDialog };
}
