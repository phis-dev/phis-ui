import { createPhiDashboardRuntimeModuleServerAreaContribution } from "../dashboard/server";
import { createPhiCommonRuntimeModuleServerAreaContributions } from "./common";
import { createPhiLocalizationRuntimeModuleServerAreaContribution } from "../localization/server";
import { createPhiGroupsRuntimeModuleServerAreaContribution } from "../groups/server";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION } from "../user-management/server";
import { PHI_OBSERVABILITY_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION } from "../observability/server";
import { createPhiAuthRuntimeModuleServerAreaContribution } from "../auth/server";
import { PHI_ADMIN_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION } from "../admin/server";

export const PHI_ADMIN_RUNTIME_MODULE_AREA_CONTRIBUTIONS = [
  ...createPhiCommonRuntimeModuleServerAreaContributions({
    area: "admin",
  }),
  createPhiAuthRuntimeModuleServerAreaContribution("admin"),
  createPhiDashboardRuntimeModuleServerAreaContribution("admin"),
  createPhiGroupsRuntimeModuleServerAreaContribution("admin"),
  createPhiLocalizationRuntimeModuleServerAreaContribution("admin"),
  PHI_OBSERVABILITY_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION,
  PHI_USER_MANAGEMENT_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION,
  PHI_ADMIN_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION,
] as const;
