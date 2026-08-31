import { createPhiRuntimeModuleCatalogFromAreaContributions } from "../area-contributions";
import { phiSiteModuleServerAreaContributions } from "../site-module-contributions";
import { PHI_ADMIN_RUNTIME_MODULE_AREA_CONTRIBUTIONS } from "../area-contributions/admin";
import { PHI_ADMIN_RUNTIME_AREA_DEFINITIONS } from "../area-definitions";

export const PHI_ADMIN_RUNTIME_MODULE_CATALOG = createPhiRuntimeModuleCatalogFromAreaContributions(
  [
    ...PHI_ADMIN_RUNTIME_MODULE_AREA_CONTRIBUTIONS,
    ...phiSiteModuleServerAreaContributions("admin"),
  ],
  PHI_ADMIN_RUNTIME_AREA_DEFINITIONS,
);
