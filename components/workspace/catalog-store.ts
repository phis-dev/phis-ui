"use client";

import { createEmptyPhiBuilderModulePresetPagesByArea } from "../../helpers/cms-page-catalog";
import { createPhiPluginStateStore } from "../state/plugin-state-store";
import type { PhiWorkspaceCatalogArea, PhiWorkspaceCatalogState } from "./catalog-state";

export type { PhiWorkspaceCatalogArea, PhiWorkspaceCatalogState } from "./catalog-state";

/**
 * One scope per workspace host. Both the Builder and, later, the Editor write into "public".
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
  };
}

export const phiWorkspaceCatalogStore = createPhiPluginStateStore<PhiWorkspaceCatalogState>(
  "@phis/ui/workspace-catalog",
  createDefaultWorkspaceCatalogState,
);

export function usePhiWorkspaceCatalogValue<TSelected>(
  scopeKey: string,
  selector: (state: PhiWorkspaceCatalogState) => TSelected,
): TSelected {
  return phiWorkspaceCatalogStore.useStoreSelector(scopeKey, selector);
}

export function getPhiWorkspaceCatalogSnapshot(scopeKey: string): PhiWorkspaceCatalogState {
  return phiWorkspaceCatalogStore.getSnapshot(scopeKey);
}

export function patchPhiWorkspaceCatalog(
  scopeKey: string,
  next: Partial<PhiWorkspaceCatalogState>,
) {
  phiWorkspaceCatalogStore.patch(scopeKey, (current) => ({ ...current, ...next }));
}
