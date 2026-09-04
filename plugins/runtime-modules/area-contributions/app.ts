import { createPhiCommonRuntimeModuleServerAreaContributions } from "./common";
import { createPhiAvatarRuntimeModuleServerAreaContribution } from "../avatar/server";
import { createPhiDashboardRuntimeModuleServerAreaContribution } from "../dashboard/server";
import { createPhiGroupsRuntimeModuleServerAreaContribution } from "../groups/server";
import { createPhiAuthRuntimeModuleServerAreaContribution } from "../auth/server";
import { PHI_APP_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION } from "../app/server";

export const PHI_APP_RUNTIME_MODULE_AREA_CONTRIBUTIONS = [
  ...createPhiCommonRuntimeModuleServerAreaContributions({ area: "app" }),
  createPhiAuthRuntimeModuleServerAreaContribution("app"),
  createPhiDashboardRuntimeModuleServerAreaContribution("app"),
  createPhiGroupsRuntimeModuleServerAreaContribution("app"),
  createPhiAvatarRuntimeModuleServerAreaContribution("app"),
  PHI_APP_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION,
] as const;
