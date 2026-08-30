import { createPhiRuntimeModuleCatalogFromAreaContributions } from "../area-contributions";
import { PHI_PUBLIC_RUNTIME_MODULE_AREA_CONTRIBUTIONS } from "../area-contributions/public";
import { PHI_PUBLIC_RUNTIME_AREA_DEFINITIONS } from "../area-definitions";

export const PHI_PUBLIC_RUNTIME_MODULE_CATALOG = createPhiRuntimeModuleCatalogFromAreaContributions(
  PHI_PUBLIC_RUNTIME_MODULE_AREA_CONTRIBUTIONS,
  PHI_PUBLIC_RUNTIME_AREA_DEFINITIONS,
);
