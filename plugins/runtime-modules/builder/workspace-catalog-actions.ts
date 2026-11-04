"use client";

import {
  PHI_WORKSPACE_CATALOG_SCOPE,
  phiWorkspaceCatalogStore,
  type PhiWorkspaceCatalogState,
} from "../../../components/workspace/catalog-store";
import type { PhiBuilderPersistedPageCatalogEntry, PhiPresetPageNode } from "../../../helpers/cms-page-catalog";
import { resolvePhiBuilderActivePageKey } from "../../../helpers/cms-page-catalog";
import { normalizePhiAreaPublicRoutePaths } from "../../../helpers/cms-area-config";
import type { PhiCmsResolvedNavigationSurface } from "../../../types/cms-module-descriptors";
import type { PhiRuntimeModuleId } from "../../../types";
import type { PhiDeveloperBuilderArea } from "./developer-workspace-types";

/*
 * Every write the Builder makes to the workspace catalog (`components/workspace/catalog-store.ts`).
 *
 * The catalog is the Foundation's -- revisions read it, and the Editor will feed it -- but on this side
 * only the Builder feeds it, and it does so here and nowhere else. Each write is a named action, so
 * "who changes which Area is open" has one answer; before, fourteen places in six files patched the
 * store with whatever they held. `scripts/validate-builder-store-ownership.mjs` keeps it that way.
 */

function patchCatalog(update: (current: PhiWorkspaceCatalogState) => PhiWorkspaceCatalogState) {
  phiWorkspaceCatalogStore.patch(PHI_WORKSPACE_CATALOG_SCOPE, update);
}

/** The Area and Page being worked on. Leaves the catalog as it is when both are already open. */
export function openPhiWorkspacePage(area: PhiDeveloperBuilderArea, pageKey: string) {
  patchCatalog((current) => (current.area === area && current.pageKey === pageKey
    ? current
    : { ...current, area, pageKey }));
}

/** The Page being worked on, within the Area that is open. */
export function setPhiWorkspacePageKey(pageKey: string) {
  patchCatalog((current) => (current.pageKey === pageKey ? current : { ...current, pageKey }));
}

/** The Site's own Pages of one Area, as the server answered them; the Area's catalog counts as read. */
export function storePhiWorkspacePersistedPages(
  area: PhiDeveloperBuilderArea,
  pages: PhiBuilderPersistedPageCatalogEntry[],
) {
  patchCatalog((current) => ({
    ...current,
    persistedPageCatalogByArea: { ...current.persistedPageCatalogByArea, [area]: pages },
    pageCatalogHydratedByArea: { ...current.pageCatalogHydratedByArea, [area]: true },
  }));
}

/** A Page created in the Builder and not saved yet. */
export function addPhiWorkspaceCustomPage(area: PhiDeveloperBuilderArea, page: PhiPresetPageNode) {
  patchCatalog((current) => ({
    ...current,
    customPages: { ...current.customPages, [area]: [...(current.customPages[area] ?? []), page] },
  }));
}

/** A navigation created in the Builder, added to the surfaces of its Area. */
export function addPhiWorkspaceNavigationSurface(
  area: PhiDeveloperBuilderArea,
  surface: PhiCmsResolvedNavigationSurface,
) {
  patchCatalog((current) => ({
    ...current,
    navigationSurfacesByArea: {
      ...current.navigationSurfacesByArea,
      [area]: [...(current.navigationSurfacesByArea[area] ?? []), surface],
    },
  }));
}

/** The Pages and navigation surfaces the active Modules contribute, when the Module selection changed. */
export function setPhiWorkspaceActiveCatalogs(
  catalogs: Pick<PhiWorkspaceCatalogState, "modulePresetPagesByArea" | "navigationSurfacesByArea">,
) {
  patchCatalog((current) => (
    JSON.stringify(current.modulePresetPagesByArea) === JSON.stringify(catalogs.modulePresetPagesByArea) &&
      JSON.stringify(current.navigationSurfacesByArea) === JSON.stringify(catalogs.navigationSurfacesByArea)
      ? current
      : { ...current, ...catalogs }
  ));
}

/** The Module selection of the named Areas; the other Areas keep theirs. */
export function setPhiWorkspaceModuleSelection(
  moduleIdsByArea: Partial<Record<PhiDeveloperBuilderArea, PhiRuntimeModuleId[]>>,
) {
  patchCatalog((current) => ({
    ...current,
    runtimeModuleIdsByArea: { ...(current.runtimeModuleIdsByArea ?? {}), ...moduleIdsByArea },
  }));
}

/**
 * The Public addresses one Module's Pages take, as the collision dialog answered them. The Module's
 * other assignments, and every other Module's, stay.
 */
export function assignPhiWorkspacePublicRoutePaths(
  moduleId: PhiRuntimeModuleId,
  answers: ReadonlyMap<string, string>,
) {
  patchCatalog((current) => {
    const kept = (current.publicRoutePaths ?? []).filter((assignment) =>
      assignment.ownerModuleId !== moduleId || !answers.has(assignment.presetKey));
    return {
      ...current,
      publicRoutePaths: normalizePhiAreaPublicRoutePaths([
        ...kept,
        ...[...answers.entries()].map(([presetKey, path]) => ({ ownerModuleId: moduleId, presetKey, path })),
      ]),
    };
  });
}

/** Catalog fields an undo or redo puts back (`splitWorkspacePatch`). */
export function restorePhiWorkspaceCatalog(fields: Partial<PhiWorkspaceCatalogState>) {
  if (Object.keys(fields).length === 0) return;
  patchCatalog((current) => ({ ...current, ...fields }));
}

/** What the server rendered the Builder with, as its preload hands it in. */
export type PhiWorkspaceCatalogPreload = Pick<
  PhiWorkspaceCatalogState,
  | "areaPresetSourcesByArea"
  | "unresolvedModuleIdsByArea"
  | "serverUnavailableModules"
  | "publicRouteClaims"
  | "publicRoutePaths"
> & {
  runtimeModuleDefinitions: readonly PhiWorkspaceCatalogState["runtimeModuleDefinitions"][number][];
  runtimeModuleIdsByArea: Readonly<Record<string, PhiRuntimeModuleId[]>>;
  /** The Pages and surfaces of the active Modules, which is what the catalog holds. */
  activeCatalogs: Pick<PhiWorkspaceCatalogState, "modulePresetPagesByArea" | "navigationSurfacesByArea">;
  /**
   * The server's answer, serialized, per field: a field is taken again only when this differs from what
   * the catalog holds, so an unsaved edit -- a Module selection, a collision answer -- survives a
   * re-render that brought nothing new.
   */
  keys: {
    runtimeModuleDefinitions: string;
    modulePresetPagesByArea: string;
    areaPresetSourcesByArea: string;
    navigationSurfacesByArea: string;
    unresolvedModuleIdsByArea: string;
    publicRouteClaims: string;
    serverUnavailableModules: string;
    publicRoutePaths: string;
  };
  normalizeArea: (area: string) => PhiDeveloperBuilderArea;
};

/**
 * Feeds the server's preload into the catalog, and answers the Page it opened when none was open yet --
 * the caller selects that Page in the Builder. Nothing else is written from inside the update, so the
 * Builder's own store is never patched from within the catalog's.
 */
export function applyPhiWorkspaceCatalogPreload(preload: PhiWorkspaceCatalogPreload): string | null {
  let openedPageKey: string | null = null;
  patchCatalog((current) => {
    let changed = false;
    const definitionsChanged = JSON.stringify(current.runtimeModuleDefinitions ?? []) !== preload.keys.runtimeModuleDefinitions;
    const modulePresetPagesChanged = JSON.stringify(current.modulePresetPagesByArea) !== preload.keys.modulePresetPagesByArea;
    const areaPresetSourcesChanged = JSON.stringify(current.areaPresetSourcesByArea) !== preload.keys.areaPresetSourcesByArea;
    const navigationSurfacesChanged = JSON.stringify(current.navigationSurfacesByArea) !== preload.keys.navigationSurfacesByArea;
    const unresolvedModuleIdsChanged = JSON.stringify(current.unresolvedModuleIdsByArea) !== preload.keys.unresolvedModuleIdsByArea;
    const publicRouteClaimsChanged = JSON.stringify(current.publicRouteClaims) !== preload.keys.publicRouteClaims;
    const serverUnavailableModulesChanged = JSON.stringify(current.serverUnavailableModules) !== preload.keys.serverUnavailableModules;
    /*
     * The assignments arrive with the Modules draft and are edited by the collision dialog, so this
     * follows the same rule as the Module selection beside it: what the server sent replaces what is
     * here when the server's answer changed, and an unsaved answer survives a re-render.
     */
    const publicRoutePathsChanged = JSON.stringify(current.publicRoutePaths) !== preload.keys.publicRoutePaths;
    const catalogHydrationChanged = !current.catalogHydrated;
    const initialPageKey = current.pageKey ||
      resolvePhiBuilderActivePageKey(null, preload.activeCatalogs.modulePresetPagesByArea[current.area]) || "";
    const initialPageChanged = initialPageKey !== current.pageKey;
    const nextModuleIdsByArea = { ...(current.runtimeModuleIdsByArea ?? {}) };
    for (const [area, moduleIds] of Object.entries(preload.runtimeModuleIdsByArea)) {
      const builderArea = preload.normalizeArea(area);
      if (JSON.stringify(nextModuleIdsByArea[builderArea] ?? []) !== JSON.stringify(moduleIds ?? [])) {
        nextModuleIdsByArea[builderArea] = moduleIds;
        changed = true;
      }
    }
    openedPageKey = initialPageChanged ? initialPageKey : null;
    return changed || definitionsChanged || modulePresetPagesChanged || areaPresetSourcesChanged ||
      navigationSurfacesChanged || unresolvedModuleIdsChanged || serverUnavailableModulesChanged ||
      publicRouteClaimsChanged || publicRoutePathsChanged || catalogHydrationChanged || initialPageChanged
      ? {
          ...current,
          ...(initialPageChanged ? { pageKey: initialPageKey } : {}),
          runtimeModuleDefinitions: [...preload.runtimeModuleDefinitions],
          runtimeModuleIdsByArea: nextModuleIdsByArea,
          catalogHydrated: true,
          modulePresetPagesByArea: preload.activeCatalogs.modulePresetPagesByArea,
          areaPresetSourcesByArea: preload.areaPresetSourcesByArea,
          navigationSurfacesByArea: preload.activeCatalogs.navigationSurfacesByArea,
          unresolvedModuleIdsByArea: preload.unresolvedModuleIdsByArea,
          serverUnavailableModules: preload.serverUnavailableModules,
          publicRouteClaims: preload.publicRouteClaims,
          ...(publicRoutePathsChanged ? { publicRoutePaths: preload.publicRoutePaths } : {}),
        }
      : current;
  });
  return openedPageKey;
}
