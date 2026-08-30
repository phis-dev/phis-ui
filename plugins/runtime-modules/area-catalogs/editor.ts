import { createPhiRuntimeModuleCatalogFromAreaContributions } from "../area-contributions";
import { PHI_EDITOR_RUNTIME_MODULE_AREA_CONTRIBUTIONS } from "../area-contributions/editor";
import { PHI_EDITOR_RUNTIME_AREA_DEFINITIONS } from "../area-definitions";

export const PHI_EDITOR_RUNTIME_MODULE_CATALOG = createPhiRuntimeModuleCatalogFromAreaContributions(
  PHI_EDITOR_RUNTIME_MODULE_AREA_CONTRIBUTIONS,
  PHI_EDITOR_RUNTIME_AREA_DEFINITIONS,
);
