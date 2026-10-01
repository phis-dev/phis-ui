import { PHI_SHARED_PACKAGE_NAME } from "../../constants/package";
import { createPhiRuntimeModuleId } from "../../constants/module-identity";
import type { PhiBuilderAreaKey } from "../../constants/cms-areas";
import type { PhiRuntimeModuleId } from "../../types";

/*
 * The Modules named here are named by id, as data. Importing their `ids.ts` bound every file that
 * reads this one -- the Foundation among them -- to the Module folders at compile time (MODULES.md,
 * "The dependency rule").
 */
const firstPartyModuleId = (moduleKey: string) =>
  createPhiRuntimeModuleId(PHI_SHARED_PACKAGE_NAME, moduleKey);
const PHI_ASSET_RUNTIME_MODULE_ID = firstPartyModuleId("asset");
const PHI_AUTH_RUNTIME_MODULE_ID = firstPartyModuleId("auth");
const PHI_THEME_RUNTIME_MODULE_ID = firstPartyModuleId("theme");
const PHI_LOCALIZATION_RUNTIME_MODULE_ID = firstPartyModuleId("localization");
const PHI_OBSERVABILITY_RUNTIME_MODULE_ID = firstPartyModuleId("observability");
const PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID = firstPartyModuleId("user-management");
const PHI_DASHBOARD_RUNTIME_MODULE_ID = firstPartyModuleId("dashboard");
const PHI_NEWS_RUNTIME_MODULE_ID = firstPartyModuleId("news");
const PHI_REVISIONS_RUNTIME_MODULE_ID = firstPartyModuleId("revisions");

export function createPhiDefaultAreaRuntimeModuleIds(
  area: PhiBuilderAreaKey,
): PhiRuntimeModuleId[] {
  if (area === "public") {
    return [PHI_AUTH_RUNTIME_MODULE_ID];
  }

  if (area === "app") {
    return [PHI_AUTH_RUNTIME_MODULE_ID, PHI_DASHBOARD_RUNTIME_MODULE_ID];
  }

  if (area === "builder") {
    return [
      PHI_DASHBOARD_RUNTIME_MODULE_ID,
      PHI_REVISIONS_RUNTIME_MODULE_ID,
      PHI_THEME_RUNTIME_MODULE_ID,
      PHI_ASSET_RUNTIME_MODULE_ID,
    ];
  }

  if (area === "admin") {
    return [
      PHI_AUTH_RUNTIME_MODULE_ID,
      PHI_ASSET_RUNTIME_MODULE_ID,
      PHI_DASHBOARD_RUNTIME_MODULE_ID,
      PHI_LOCALIZATION_RUNTIME_MODULE_ID,
      PHI_OBSERVABILITY_RUNTIME_MODULE_ID,
      PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
    ];
  }

  if (area === "editor") {
    /*
     * News belongs here for the same reason localization does: the Area ships a Page for it, and its
     * sidebar offers the entry. A default that left the Module out would give every Site that has not
     * configured its Editor a menu item leading to a Table that reports its Provider missing.
     */
    return [
      PHI_LOCALIZATION_RUNTIME_MODULE_ID,
      PHI_NEWS_RUNTIME_MODULE_ID,
      PHI_DASHBOARD_RUNTIME_MODULE_ID,
    ];
  }

  if (area === "accounting") {
    return [PHI_DASHBOARD_RUNTIME_MODULE_ID];
  }

  return [];
}
