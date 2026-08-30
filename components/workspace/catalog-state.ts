import type { PhiBuilderAreaKey } from "../../constants/cms-areas";
import type {
  PhiBuilderModulePresetPagesByArea,
  PhiBuilderPersistedPageCatalogEntry,
  PhiPresetPageNode,
} from "../../helpers/cms-page-catalog";
import type {
  PhiCmsPresetSource,
  PhiCmsResolvedNavigationSurface,
} from "../../types/cms-module-descriptors";
import type { PhiRuntimeModuleDefinition, PhiRuntimeModuleId } from "../../types";

export type PhiWorkspaceCatalogArea = PhiBuilderAreaKey;

/**
 * What a workspace knows about the site it is working on: which Areas, pages and navigation surfaces
 * exist, which Modules contribute them, and what is being looked at right now.
 *
 * This is not the Builder's own state. It arrives from the server, the Builder only feeds it in -- and
 * the Editor will feed the same thing once it hosts a workspace of its own. Keeping it here is what
 * lets a Module like revisions read it without importing the Builder.
 */
export type PhiWorkspaceCatalogState = {
  /** The Area being worked on. */
  area: PhiWorkspaceCatalogArea;
  /** The page being worked on, within that Area. */
  pageKey: string;
  /** True once the catalogs below have been fed in; read nothing from them before that. */
  catalogHydrated: boolean;
  pageCatalogHydratedByArea: Partial<Record<PhiWorkspaceCatalogArea, boolean>>;
  modulePresetPagesByArea: PhiBuilderModulePresetPagesByArea;
  customPages: Partial<Record<PhiWorkspaceCatalogArea, PhiPresetPageNode[]>>;
  persistedPageCatalogByArea: Partial<
    Record<PhiWorkspaceCatalogArea, PhiBuilderPersistedPageCatalogEntry[]>
  >;
  navigationSurfacesByArea: Partial<
    Record<PhiWorkspaceCatalogArea, readonly PhiCmsResolvedNavigationSurface[]>
  >;
  areaPresetSourcesByArea: Partial<Record<PhiWorkspaceCatalogArea, PhiCmsPresetSource>>;
  runtimeModuleDefinitions: PhiRuntimeModuleDefinition[];
  runtimeModuleIdsByArea: Partial<Record<PhiWorkspaceCatalogArea, PhiRuntimeModuleId[]>>;
};
