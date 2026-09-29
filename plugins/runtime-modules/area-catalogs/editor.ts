import type { PhiSiteModuleServerAreaContributions } from "../site-modules";
import { PHI_EDITOR_RUNTIME_MODULE_AREA_CONTRIBUTIONS } from "../area-contributions/editor";
import { PHI_EDITOR_RUNTIME_AREA_DEFINITIONS } from "../area-definitions";
import { createPhiAreaRuntimeModuleCatalog } from "./area-catalog";

/** The Editor Area's catalog; see `createPhiAreaRuntimeModuleCatalog`. */
export function createPhiEditorRuntimeModuleCatalog(
  siteModules: PhiSiteModuleServerAreaContributions = {},
) {
  return createPhiAreaRuntimeModuleCatalog(
    "editor",
    PHI_EDITOR_RUNTIME_MODULE_AREA_CONTRIBUTIONS,
    PHI_EDITOR_RUNTIME_AREA_DEFINITIONS,
    siteModules,
  );
}

export const PHI_EDITOR_RUNTIME_MODULE_CATALOG = createPhiEditorRuntimeModuleCatalog();
