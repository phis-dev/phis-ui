import { createPhiRuntimeModuleCatalogFromAreaContributions } from "../area-contributions";
import { phiSiteModuleServerAreaContributions } from "../site-module-contributions";
import { PHI_APP_RUNTIME_MODULE_AREA_CONTRIBUTIONS } from "../area-contributions/app";
import { PHI_APP_RUNTIME_AREA_DEFINITIONS } from "../area-definitions";

export const PHI_APP_RUNTIME_MODULE_CATALOG = createPhiRuntimeModuleCatalogFromAreaContributions(
  [
    ...PHI_APP_RUNTIME_MODULE_AREA_CONTRIBUTIONS,
    ...phiSiteModuleServerAreaContributions("app"),
  ],
  PHI_APP_RUNTIME_AREA_DEFINITIONS,
);
