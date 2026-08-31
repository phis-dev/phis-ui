import { createPhiRuntimeModuleCatalogFromAreaContributions } from "./area-contributions";
import { PHI_BUILDER_RUNTIME_MODULE_AREA_CONTRIBUTIONS } from "./area-contributions/builder";
import { PHI_ALL_RUNTIME_AREA_DEFINITIONS } from "./area-definitions";
import { resolvePhiCmsDescriptorCatalog } from "./descriptor-compiler";
import { readAllPhiSiteModuleServerAreaContributions } from "./site-module-contributions";
import type { PhiSiteModuleServerAreaContributions } from "./site-modules";

/**
 * The Builder's catalog: every Area's Modules at once, so a Module can be authored inside an isolated
 * target-Area Canvas without being mounted in the Builder Area itself.
 *
 * Descriptor resolution is memoised per catalog object, so each catalog compiles its own once.
 */
export function createPhiBuilderRuntimeModuleCatalog(
  siteModules: PhiSiteModuleServerAreaContributions = {},
) {
  const catalog = createPhiRuntimeModuleCatalogFromAreaContributions(
    [
      ...PHI_BUILDER_RUNTIME_MODULE_AREA_CONTRIBUTIONS,
      ...readAllPhiSiteModuleServerAreaContributions(siteModules),
    ],
    PHI_ALL_RUNTIME_AREA_DEFINITIONS,
  );
  resolvePhiCmsDescriptorCatalog(catalog);
  return catalog;
}

export const PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG = createPhiBuilderRuntimeModuleCatalog();
