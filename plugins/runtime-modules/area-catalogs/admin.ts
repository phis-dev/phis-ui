import type { PhiSiteModuleServerAreaContributions } from "../site-modules";
import { PHI_ADMIN_RUNTIME_MODULE_AREA_CONTRIBUTIONS } from "../area-contributions/admin";
import { PHI_ADMIN_RUNTIME_AREA_DEFINITIONS } from "../area-definitions";
import { createPhiAreaRuntimeModuleCatalog } from "./area-catalog";

/** The Admin Area's catalog; see `createPhiAreaRuntimeModuleCatalog`. */
export function createPhiAdminRuntimeModuleCatalog(
  siteModules: PhiSiteModuleServerAreaContributions = {},
) {
  return createPhiAreaRuntimeModuleCatalog(
    "admin",
    PHI_ADMIN_RUNTIME_MODULE_AREA_CONTRIBUTIONS,
    PHI_ADMIN_RUNTIME_AREA_DEFINITIONS,
    siteModules,
  );
}

export const PHI_ADMIN_RUNTIME_MODULE_CATALOG = createPhiAdminRuntimeModuleCatalog();
