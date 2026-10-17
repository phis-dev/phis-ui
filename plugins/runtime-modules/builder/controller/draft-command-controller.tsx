"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

import { usePhiConfirmDialog } from "../../../../components/controls/phi-confirm-dialog";
import {
  formatPhiHistoryMoveMessage,
  type PhiHistoryLabels,
} from "../../../../components/widgets/label-types/history";
import { usePhiApplicationFeedback } from "../../../../components/runtime/use-phi-application-feedback";
import type { PhiBuilderSavedHistoryHead } from "./draft-status-controller";
import { createPhiDefaultAreaRuntimeModuleIds } from "../../area-module-defaults";
import { getPhiBuilderRegionDraftKey } from "../region-keys";
import { resolvePhiBuilderCmsStoragePath } from "../../../../helpers/cms-paths";
import {
  resolvePhiBuilderActivePageCatalog,
  resolvePhiBuilderActivePageKey,
  resolvePhiBuilderPagePresetSource,
} from "../../../../helpers/cms-page-catalog";
import { deleteCmsDraft } from "../../../../helpers/cms-draft-delete";
import { buildPhiBuilderLiveHref,
  clearPhiDeveloperBuilderDraftAllocation,
  createPhiDeveloperBuilderInitialPageDrafts,
  getPhiDeveloperBuilderModulesDraftAllocation,
  savePhiDeveloperBuilderModulesDraft,
  publishPhiDeveloperBuilderModulesDraft,
  previewPhiDeveloperBuilderDraft,
  publishPhiDeveloperBuilderDraft,
  savePhiDeveloperBuilderDraft,
} from "../persistence";
import {
  clearPhiBuilderNavigationDraft,
  getPhiBuilderNavigationDraftSnapshot,
  updatePhiBuilderNavigationDraft,
  restorePhiBuilderNavigationDraft,
  setPhiBuilderNavigationDraft,
} from "../navigation-store";
import {
  deletePhiBuilderNavigationDraft,
  loadPhiBuilderNavigationDraft,
  loadPhiBuilderNavigationScope,
  publishPhiBuilderNavigationDraft,
  savePhiBuilderNavigationDraft,
  type PhiBuilderNavigationFolderCarry,
} from "../navigation-persistence";
import {
  builderWorkspaceStore,
  splitWorkspacePatch,
  getPhiDeveloperRegionDraftsSnapshot,
  mergePhiDeveloperRegionDrafts,
  restorePhiDeveloperBuilderAreaMeta,
  restorePhiDeveloperRegionDrafts,
  setPhiDeveloperBuilderAreaRootRoute,
} from "../developer-workspace-store";
import type {
  PhiDeveloperBuilderArea,
  PhiDeveloperBuilderCommandWorkspace,
  PhiDeveloperBuilderRegionDraft,
  PhiDeveloperBuilderWorkspaceState,
} from "../developer-workspace-types";
import { findPhiBuilderNavigationSurface } from "../../../../helpers/cms-navigation-catalog";
import {
  createPhiBuilderHistoryContext,
  phiBuilderHistory,
  type PhiBuilderHistorySnapshot,
} from "../history";
import { usePhiBuilderModuleMetas } from "../plugin-meta-store";
import { clearPhiBuilderModuleAreasDirty } from "../runtime-module-selection";
import { phiWorkspaceCatalogStore } from "../../../../components/workspace/catalog-store";
import type { PhiBuilderNavigationItem } from "../../../../helpers/cms-navigation-catalog";
import {
  applyPhiBuilderNavigationFolderTargets,
  refreshPhiBuilderNavigationFolderAddresses,
} from "../navigation-folder-address";
import { createPhiBuilderNavigationPathContext } from "../navigation-path-context";

export type PhiDeveloperBuilderToolbarCommand =
  | "save"
  | "preview"
  | "publish"
  | "undo"
  | "redo"
  | "reset";

export function usePhiBuilderDraftCommandController({
  defaultArea,
  effectiveArea,
  effectiveNavKey,
  effectivePageKey,
  pathname,
  captureHistoryHead,
  reportSaved,
  hasUnsavedChanges,
  shellPresetDraftsByArea,
  state,
  historyLabels,
}: {
  defaultArea: PhiDeveloperBuilderArea;
  effectiveArea: PhiDeveloperBuilderArea;
  effectiveNavKey: string;
  effectivePageKey: string;
  pathname: string | null;
  /** The undo-history head as a save or publish begins, read before the drafts are snapshotted. */
  captureHistoryHead: () => PhiBuilderSavedHistoryHead;
  /** Tells the draft status what a save or publish of the workspace on screen stored, and at which head. */
  reportSaved: (
    status: "draft" | "published",
    revisionId: number | null,
    savedAt: PhiBuilderSavedHistoryHead,
  ) => void;
  /** Whether the workspace on screen holds edits no stored revision has. */
  hasUnsavedChanges: boolean;
  shellPresetDraftsByArea: Record<string, Record<string, PhiDeveloperBuilderRegionDraft>>;
  state: PhiDeveloperBuilderWorkspaceState;
  /** What an undo or redo says it moved, in the author's language. */
  historyLabels: PhiHistoryLabels;
}) {
  /*
   * Every one of these is a command from a toolbar somewhere else, so there is nothing on screen to
   * hang a Popconfirm on. Drawn as a Dialog by this Controller rather than asked of Ant Design's
   * `App`, whose provider would otherwise sit in every page's first load for the sake of questions
   * only the Builder asks.
   */
  const { confirm, confirmDialog } = usePhiConfirmDialog();
  const router = useRouter();
  const { showMessage } = usePhiApplicationFeedback();
  const builderModuleMetas = usePhiBuilderModuleMetas(effectiveArea);
  /*
   * The draft action in progress. A ref, not state: two commands arriving in one tick both read the
   * state from before either set it, and both ran -- the second one into a 409.
   */
  const activeDraftActionRef = useRef<PhiDeveloperBuilderToolbarCommand | null>(null);
  const setActiveDraftAction = (next: PhiDeveloperBuilderToolbarCommand | null) => {
    activeDraftActionRef.current = next;
  };
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
    /*
     * Asked side by side, and a failed read is the command's failure: taking it for "no draft" told the
     * author there was nothing to publish while a draft stood.
     */
    const asked = await Promise.all(
      Object.entries(state.areaPresetSourcesByArea).flatMap(([area, source]) => source
        ? [getPhiDeveloperBuilderModulesDraftAllocation({
            area: area as PhiDeveloperBuilderArea,
            areaPresetSource: source,
          }).then((allocation) => allocation ? area as PhiDeveloperBuilderArea : null)]
        : []),
    );
    return asked.filter((area): area is PhiDeveloperBuilderArea => area !== null);
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
      const savedAt = captureHistoryHead();
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
      reportSaved("draft", lastRevisionId, savedAt);
      showMessage({
        level: "success",
        content: areas.length === 1
          ? "Saved module selection draft."
          : `Saved module selection drafts for ${areas.length} areas.`,
      });
      return;
    }

    const savedAt = captureHistoryHead();
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

    reportSaved("draft", result.revisionId, savedAt);
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
      const savedAt = captureHistoryHead();
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
      reportSaved("published", null, savedAt);
      showMessage({
        level: "success",
        content: areas.length === 1
          ? "Published module selection."
          : `Published module selection for ${areas.length} areas.`,
      });
      return;
    }

    const savedAt = captureHistoryHead();
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

    reportSaved("published", null, savedAt);
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
    /*
     * A preview is of the saved draft or of nothing. Opening the live page when there was none -- or when
     * the read failed -- let the author take what is published for their draft; the failure is the
     * command's error now. What the saved draft leaves out is said before it opens.
     */
    const result = await previewPhiDeveloperBuilderDraft(state, workspaceKind, {
      pathname,
      scope: previewScope,
    });
    if (hasUnsavedChanges) {
      showMessage({
        level: "warning",
        content: "The preview shows the last saved draft. Save to include your latest changes.",
      });
    }
    window.open(result.previewHref, "_blank", "noopener,noreferrer");
  }

  /**
   * Throws away the open draft of the Area's shell or of a Page, and shows what is published again.
   *
   * A draft is the only thing this deletes: nothing live changes, and the revision history keeps what was
   * published. Going back to a Module's preset is a different act -- it deletes the Site's override and
   * changes what is live at once -- and it lives in Revisions, with the history it discards in view
   * (phis-server CONTENT.md, Reset). Putting the preset into the draft instead, as this command once did,
   * published a frozen copy of the preset that no later Module update would reach.
   *
   * The workspace is read again afterwards rather than patched: what stands now is the published state,
   * which only the server holds.
   */
  function confirmDiscardDraft(workspaceKind: "structure" | "pages") {
    confirm({
      title: "Discard the draft?",
      content:
        "This deletes the open draft. The editor shows what is published again, and nothing live changes.",
      confirmLabel: "Discard draft",
      danger: true,
      cancelLabel: "Cancel",
      onConfirm: async () => {
        if (activeDraftActionRef.current != null) {
          return;
        }
        setActiveDraftAction("reset");
        try {
          if (workspaceKind === "structure") {
            const source = state.areaPresetSourcesByArea[effectiveArea] ?? null;
            await deleteCmsDraft("/api/site/cms/area", {
              area: effectiveArea,
              ownerModuleId: source?.ownerModuleId,
              presetKey: source?.presetKey,
            });
          } else {
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
                ? { ownerModuleId: sourcePreset.ownerModuleId, presetKey: sourcePreset.presetKey }
                : { path: resolvePhiBuilderCmsStoragePath(effectiveArea, effectivePageKey, pages) }),
            });
          }
          clearPhiDeveloperBuilderDraftAllocation({
            area: effectiveArea,
            pageKey: effectivePageKey,
            workspaceKind,
          });
          phiBuilderHistory.clear(createPhiBuilderHistoryContext({
            workspace: workspaceKind,
            area: effectiveArea,
            pageKey: effectivePageKey,
          }));
          reportSaved("published", null, captureHistoryHead());
          showMessage({ level: "success", content: "Discarded the draft." });
          router.refresh();
        } catch (error) {
          showMessage({ level: "error", content: error instanceof Error ? error.message : "Discarding the draft failed." });
          throw error;
        } finally {
          setActiveDraftAction(null);
        }
      },
    });
  }

  /**
   * Deletes a Page the Site made, as a draft the next publish carries out.
   *
   * A Module's Page cannot be deleted -- its address is the Module's -- and taking it back to its preset is
   * Revisions' act, not this one.
   */
  function confirmResetPage() {
    const pages = resolvePhiBuilderActivePageCatalog(
      effectiveArea,
      state.modulePresetPagesByArea,
      state.customPages,
      state.persistedPageCatalogByArea,
    );
    if (resolvePhiBuilderPagePresetSource(effectivePageKey, pages)) {
      showMessage({
        level: "info",
        content: "A Module's page cannot be deleted. Its revisions can take it back to the Module's preset.",
      });
      return;
    }

    confirm({
      title: "Delete page?",
      content: "This prepares a delete draft. The live page returns 404 after the draft is published.",
      confirmLabel: "Create delete draft",
      danger: true,
      cancelLabel: "Cancel",
      onConfirm: async () => {
        if (activeDraftActionRef.current != null) {
          return;
        }
        setActiveDraftAction("reset");
        try {
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
          phiBuilderHistory.clear(createPhiBuilderHistoryContext({
            workspace: "pages",
            area: effectiveArea,
            pageKey: effectivePageKey,
          }));
          reportSaved("draft", result.revisionId, captureHistoryHead());
          showMessage({ level: "success", content: "Saved page delete draft." });
        } catch (error) {
          showMessage({ level: "error", content: error instanceof Error ? error.message : "Page delete failed." });
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
        if (activeDraftActionRef.current != null) {
          return;
        }
        setActiveDraftAction("reset");
        try {
          await deletePhiBuilderNavigationDraft(effectiveNavKey);
          clearPhiBuilderNavigationDraft(effectiveNavKey);
          phiBuilderHistory.clear(createPhiBuilderHistoryContext({
            workspace: "navigation",
            area: effectiveArea,
            navKey: effectiveNavKey,
          }));
          reportSaved("published", null, captureHistoryHead());
          /*
           * Clearing the Draft is the reload: the Navigation table re-reads a scope with no Draft from
           * Core, which is the published tree now, and the canvas falls back to the surface. This sent a
           * `navigation/reload` to the Controller's own address once, which nothing ever answered -- and
           * a Controller does not hear its own echo (SIGNALS.md, "Addresses").
           */
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
    if (workspaceKind === "structure" || workspaceKind === "pages") {
      confirmDiscardDraft(workspaceKind);
      return;
    }

    // A Module selection has no reset: its draft is published or changed, never set back (B4).
    if (workspaceKind === "modules") {
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

    if (activeDraftActionRef.current != null) {
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
      if (snapshot.kind === "composite") {
        for (const part of snapshot.parts) applyHistorySnapshot(part);
        return;
      }
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

    /*
     * An undo says what it took back. The canvas changes in place, and a step that moved a node out of
     * view -- or changed a Region nobody is looking at -- would otherwise look like nothing happened.
     */
    if (command === "undo" || command === "redo") {
      const entry = command === "undo"
        ? phiBuilderHistory.undo(historyContext, applyHistorySnapshot)
        : phiBuilderHistory.redo(historyContext, applyHistorySnapshot);
      if (entry) {
        showMessage({ level: "info", content: formatPhiHistoryMoveMessage(historyLabels, command, entry.action) });
      }
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

  return { confirmResetPage, runBuilderCommand, confirmDialog };
}
