import type { PhiSiteModuleServerAreaContributions } from "../site-modules";
import { PHI_ACCOUNTING_RUNTIME_MODULE_AREA_CONTRIBUTIONS } from "../area-contributions/accounting";
import { PHI_ACCOUNTING_RUNTIME_AREA_DEFINITIONS } from "../area-definitions";
import { createPhiAreaRuntimeModuleCatalog } from "./area-catalog";

/** The Accounting Area's catalog; see `createPhiAreaRuntimeModuleCatalog`. */
export function createPhiAccountingRuntimeModuleCatalog(
  siteModules: PhiSiteModuleServerAreaContributions = {},
) {
  return createPhiAreaRuntimeModuleCatalog(
    "accounting",
    PHI_ACCOUNTING_RUNTIME_MODULE_AREA_CONTRIBUTIONS,
    PHI_ACCOUNTING_RUNTIME_AREA_DEFINITIONS,
    siteModules,
  );
}

export const PHI_ACCOUNTING_RUNTIME_MODULE_CATALOG = createPhiAccountingRuntimeModuleCatalog();
