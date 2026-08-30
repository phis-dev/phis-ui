import { createPhiRuntimeModuleCatalogFromAreaContributions } from "../area-contributions";
import { PHI_APP_RUNTIME_MODULE_AREA_CONTRIBUTIONS } from "../area-contributions/app";
import { PHI_APP_RUNTIME_AREA_DEFINITIONS } from "../area-definitions";

export const PHI_APP_RUNTIME_MODULE_CATALOG = createPhiRuntimeModuleCatalogFromAreaContributions(
  PHI_APP_RUNTIME_MODULE_AREA_CONTRIBUTIONS,
  PHI_APP_RUNTIME_AREA_DEFINITIONS,
);
