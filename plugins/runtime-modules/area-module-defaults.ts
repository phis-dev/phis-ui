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
/*
 * Conversations are a Site's communication system, so every Area with a sidebar starts with them: the
 * Area ships the Page and its sidebar offers the entry, and a default without the Module would offer an
 * entry leading nowhere. Public has neither.
 */
const PHI_THREADS_RUNTIME_MODULE_ID = firstPartyModuleId("threads");

export function createPhiDefaultAreaRuntimeModuleIds(
  area: PhiBuilderAreaKey,
): PhiRuntimeModuleId[] {
  if (area === "public") {
    return [PHI_AUTH_RUNTIME_MODULE_ID];
  }

  if (area === "app") {
    return [PHI_AUTH_RUNTIME_MODULE_ID, PHI_DASHBOARD_RUNTIME_MODULE_ID, PHI_THREADS_RUNTIME_MODULE_ID];
  }

  if (area === "builder") {
    return [
      PHI_DASHBOARD_RUNTIME_MODULE_ID,
      PHI_REVISIONS_RUNTIME_MODULE_ID,
      PHI_THEME_RUNTIME_MODULE_ID,
      PHI_ASSET_RUNTIME_MODULE_ID,
      PHI_THREADS_RUNTIME_MODULE_ID,
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
      PHI_THREADS_RUNTIME_MODULE_ID,
    ];
  }

  if (area === "editor") {
    /*
     * News belongs here for the same reason localization does: it is what an Editor is for on most
     * Sites. Blog is not here -- a Site that writes one switches it on in the Public Area and here.
     */
    return [
      PHI_LOCALIZATION_RUNTIME_MODULE_ID,
      PHI_NEWS_RUNTIME_MODULE_ID,
      PHI_DASHBOARD_RUNTIME_MODULE_ID,
      PHI_THREADS_RUNTIME_MODULE_ID,
    ];
  }

  if (area === "accounting") {
    return [PHI_DASHBOARD_RUNTIME_MODULE_ID, PHI_THREADS_RUNTIME_MODULE_ID];
  }

  return [];
}
