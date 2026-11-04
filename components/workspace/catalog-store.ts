"use client";

import { createEmptyPhiBuilderModulePresetPagesByArea } from "../../helpers/cms-page-catalog";
import { createPhiPluginStateStore } from "../state/plugin-state-store";
import type { PhiWorkspaceCatalogArea, PhiWorkspaceCatalogState } from "./catalog-state";

export type { PhiWorkspaceCatalogArea, PhiWorkspaceCatalogState } from "./catalog-state";

/**
 * One scope per workspace host, not one per Area. Both the Builder and, later, the Editor write into it;
 * which Area is open is `area` inside it, and what belongs to an Area is keyed by Area there.
 */
export const PHI_WORKSPACE_CATALOG_SCOPE = "public";

function createDefaultWorkspaceCatalogState(scopeKey: string): PhiWorkspaceCatalogState {
  return {
    area: (scopeKey || "public") as PhiWorkspaceCatalogArea,
    pageKey: "",
    catalogHydrated: false,
    pageCatalogHydratedByArea: {},
    modulePresetPagesByArea: createEmptyPhiBuilderModulePresetPagesByArea(),
    customPages: {},
    persistedPageCatalogByArea: {},
    navigationSurfacesByArea: {},
    areaPresetSourcesByArea: {},
    runtimeModuleDefinitions: [],
    runtimeModuleIdsByArea: {},
    unresolvedModuleIdsByArea: {},
    serverUnavailableModules: {},
    publicRouteClaims: [],
    publicRoutePaths: [],
  };
}

export const phiWorkspaceCatalogStore = createPhiPluginStateStore<PhiWorkspaceCatalogState>(
  "@phis/ui/workspace-catalog",
  createDefaultWorkspaceCatalogState,
);

export function usePhiWorkspaceCatalogValue<TSelected>(
  selector: (state: PhiWorkspaceCatalogState) => TSelected,
): TSelected {
  return phiWorkspaceCatalogStore.useStoreSelector(PHI_WORKSPACE_CATALOG_SCOPE, selector);
}

export function getPhiWorkspaceCatalogSnapshot(): PhiWorkspaceCatalogState {
  return phiWorkspaceCatalogStore.getSnapshot(PHI_WORKSPACE_CATALOG_SCOPE);
}
