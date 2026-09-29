import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import type { PhiCmsAreaDefinition } from "../../../types/cms-module-descriptors";
import {
  createPhiRuntimeModuleCatalogFromAreaContributions,
  type PhiRuntimeModuleServerAreaContribution,
} from "../area-contributions";
import { readPhiSiteModuleServerAreaContributions } from "../site-module-contributions";
import type { PhiSiteModuleServerAreaContributions } from "../site-modules";

/**
 * One Area's catalog, optionally including the Modules this Site installed.
 *
 * The Area's own contributions are passed in by its `area-catalogs/<area>.ts` file, so each Area graph
 * imports only its own aggregator. The Site's projection is passed in rather than reached for: a Site
 * build cannot redirect an import that happens inside this package, so what a Site installed has to
 * arrive as a value.
 */
export function createPhiAreaRuntimeModuleCatalog(
  area: PhiCmsAreaKey,
  contributions: readonly PhiRuntimeModuleServerAreaContribution[],
  areaDefinitions: readonly PhiCmsAreaDefinition[],
  siteModules: PhiSiteModuleServerAreaContributions,
) {
  return createPhiRuntimeModuleCatalogFromAreaContributions(
    [...contributions, ...readPhiSiteModuleServerAreaContributions(siteModules, area)],
    areaDefinitions,
    area,
  );
}
