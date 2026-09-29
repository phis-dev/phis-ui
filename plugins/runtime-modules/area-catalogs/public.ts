import type { PhiSiteModuleServerAreaContributions } from "../site-modules";
import { PHI_PUBLIC_RUNTIME_MODULE_AREA_CONTRIBUTIONS } from "../area-contributions/public";
import { PHI_PUBLIC_RUNTIME_AREA_DEFINITIONS } from "../area-definitions";
import { createPhiAreaRuntimeModuleCatalog } from "./area-catalog";

/** The Public Area's catalog; see `createPhiAreaRuntimeModuleCatalog`. */
export function createPhiPublicRuntimeModuleCatalog(
  siteModules: PhiSiteModuleServerAreaContributions = {},
) {
  return createPhiAreaRuntimeModuleCatalog(
    "public",
    PHI_PUBLIC_RUNTIME_MODULE_AREA_CONTRIBUTIONS,
    PHI_PUBLIC_RUNTIME_AREA_DEFINITIONS,
    siteModules,
  );
}

export const PHI_PUBLIC_RUNTIME_MODULE_CATALOG = createPhiPublicRuntimeModuleCatalog();
