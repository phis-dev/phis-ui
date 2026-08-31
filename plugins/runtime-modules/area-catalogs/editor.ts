import { createPhiRuntimeModuleCatalogFromAreaContributions } from "../area-contributions";
import { phiSiteModuleServerAreaContributions } from "../site-module-contributions";
import { PHI_EDITOR_RUNTIME_MODULE_AREA_CONTRIBUTIONS } from "../area-contributions/editor";
import { PHI_EDITOR_RUNTIME_AREA_DEFINITIONS } from "../area-definitions";

export const PHI_EDITOR_RUNTIME_MODULE_CATALOG = createPhiRuntimeModuleCatalogFromAreaContributions(
  [
    ...PHI_EDITOR_RUNTIME_MODULE_AREA_CONTRIBUTIONS,
    ...phiSiteModuleServerAreaContributions("editor"),
  ],
  PHI_EDITOR_RUNTIME_AREA_DEFINITIONS,
);
