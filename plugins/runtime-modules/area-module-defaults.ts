import type { PhiBuilderAreaKey } from "../../constants/cms-areas";
import type { PhiRuntimeModuleId } from "../../types";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "./asset/ids";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "./auth/ids";
import { PHI_THEME_RUNTIME_MODULE_ID } from "./theme/ids";
import { PHI_LOCALIZATION_RUNTIME_MODULE_ID } from "./localization/ids";
import { PHI_OBSERVABILITY_RUNTIME_MODULE_ID } from "./observability/ids";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID } from "./user-management/ids";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "./dashboard/ids";
import { PHI_NEWS_RUNTIME_MODULE_ID } from "./news/ids";
import { PHI_REVISIONS_RUNTIME_MODULE_ID } from "./revisions/ids";

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
