import type { PhiBuilderAreaKey } from "../../../constants/cms-areas";
import type { PhiRuntimeModuleId } from "../../../types";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/asset/ids";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/auth/ids";
import { PHI_THEME_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/theme/ids";
import { PHI_LOCALIZATION_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/localization/ids";
import { PHI_OBSERVABILITY_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/observability/ids";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/user-management/ids";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/dashboard/ids";
import { PHI_REVISIONS_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/revisions/ids";

export function createPhiDefaultAreaRuntimeModuleIds(
  area: PhiBuilderAreaKey,
): PhiRuntimeModuleId[] {
  if (area === "public") {
    return [PHI_AUTH_RUNTIME_MODULE_ID];
  }

  if (area === "app") {
    return [PHI_AUTH_RUNTIME_MODULE_ID];
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
    return [PHI_LOCALIZATION_RUNTIME_MODULE_ID];
  }

  return [];
}
