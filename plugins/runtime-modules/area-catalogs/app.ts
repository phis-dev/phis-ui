import type { PhiSiteModuleServerAreaContributions } from "../site-modules";
import { PHI_APP_RUNTIME_MODULE_AREA_CONTRIBUTIONS } from "../area-contributions/app";
import { PHI_APP_RUNTIME_AREA_DEFINITIONS } from "../area-definitions";
import { createPhiAreaRuntimeModuleCatalog } from "./area-catalog";

/** The App Area's catalog; see `createPhiAreaRuntimeModuleCatalog`. */
export function createPhiAppRuntimeModuleCatalog(
  siteModules: PhiSiteModuleServerAreaContributions = {},
) {
  return createPhiAreaRuntimeModuleCatalog(
    "app",
    PHI_APP_RUNTIME_MODULE_AREA_CONTRIBUTIONS,
    PHI_APP_RUNTIME_AREA_DEFINITIONS,
    siteModules,
  );
}

export const PHI_APP_RUNTIME_MODULE_CATALOG = createPhiAppRuntimeModuleCatalog();
