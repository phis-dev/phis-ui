import { createPhiRuntimeModuleCatalogFromAreaContributions } from "./area-contributions";
import { PHI_BUILDER_RUNTIME_MODULE_AREA_CONTRIBUTIONS } from "./area-contributions/builder";
import { PHI_ALL_RUNTIME_AREA_DEFINITIONS } from "./area-definitions";
import { resolvePhiCmsDescriptorCatalog } from "./descriptor-compiler";
import { phiAllSiteModuleServerAreaContributions } from "./site-module-contributions";

export const PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG = createPhiRuntimeModuleCatalogFromAreaContributions(
  [
    ...PHI_BUILDER_RUNTIME_MODULE_AREA_CONTRIBUTIONS,
    ...phiAllSiteModuleServerAreaContributions(),
  ],
  PHI_ALL_RUNTIME_AREA_DEFINITIONS,
);

resolvePhiCmsDescriptorCatalog(PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG);
