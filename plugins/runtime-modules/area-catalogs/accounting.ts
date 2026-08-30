import { createPhiRuntimeModuleCatalogFromAreaContributions } from "../area-contributions";
import { PHI_ACCOUNTING_RUNTIME_MODULE_AREA_CONTRIBUTIONS } from "../area-contributions/accounting";
import { PHI_ACCOUNTING_RUNTIME_AREA_DEFINITIONS } from "../area-definitions";

export const PHI_ACCOUNTING_RUNTIME_MODULE_CATALOG = createPhiRuntimeModuleCatalogFromAreaContributions(
  PHI_ACCOUNTING_RUNTIME_MODULE_AREA_CONTRIBUTIONS,
  PHI_ACCOUNTING_RUNTIME_AREA_DEFINITIONS,
);
