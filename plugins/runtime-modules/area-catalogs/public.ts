import { createPhiRuntimeModuleCatalogFromAreaContributions } from "../area-contributions";
import { readPhiSiteModuleServerAreaContributions } from "../site-module-contributions";
import type { PhiSiteModuleServerAreaContributions } from "../site-modules";
import { PHI_PUBLIC_RUNTIME_MODULE_AREA_CONTRIBUTIONS } from "../area-contributions/public";
import { PHI_PUBLIC_RUNTIME_AREA_DEFINITIONS } from "../area-definitions";

/**
 * The Area's catalog, optionally including the Modules this Site installed.
 *
 * The projection is passed in rather than reached for: a Site build cannot redirect an import that
 * happens inside this package, so what a Site installed has to arrive as a value.
 */
export function createPhiPublicRuntimeModuleCatalog(
  siteModules: PhiSiteModuleServerAreaContributions = {},
) {
  return createPhiRuntimeModuleCatalogFromAreaContributions(
    [
      ...PHI_PUBLIC_RUNTIME_MODULE_AREA_CONTRIBUTIONS,
      ...readPhiSiteModuleServerAreaContributions(siteModules, "public"),
    ],
    PHI_PUBLIC_RUNTIME_AREA_DEFINITIONS,
  );
}

export const PHI_PUBLIC_RUNTIME_MODULE_CATALOG = createPhiPublicRuntimeModuleCatalog();
