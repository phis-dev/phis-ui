import { createPhiCommonRuntimeModuleServerAreaContributions } from "./common";
import { createPhiAvatarRuntimeModuleServerAreaContribution } from "../avatar/server";
import { createPhiDashboardRuntimeModuleServerAreaContribution } from "../dashboard/server";
import { createPhiGroupsRuntimeModuleServerAreaContribution } from "../groups/server";
import { createPhiAuthRuntimeModuleServerAreaContribution } from "../auth/server";
import { createPhiVideoRuntimeModuleServerAreaContribution } from "../video/server";
import { createPhiSearchRuntimeModuleServerAreaContribution } from "../search/server";
import { PHI_APP_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION } from "../app/server";
import { createPhiBillingRuntimeModuleServerAreaContribution } from "../billing/server";

export const PHI_APP_RUNTIME_MODULE_AREA_CONTRIBUTIONS = [
  ...createPhiCommonRuntimeModuleServerAreaContributions(),
  createPhiAuthRuntimeModuleServerAreaContribution(),
  createPhiDashboardRuntimeModuleServerAreaContribution(),
  createPhiGroupsRuntimeModuleServerAreaContribution(),
  createPhiAvatarRuntimeModuleServerAreaContribution(),
  createPhiVideoRuntimeModuleServerAreaContribution(),
  createPhiSearchRuntimeModuleServerAreaContribution(),
  createPhiBillingRuntimeModuleServerAreaContribution(),
  PHI_APP_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION,
] as const;
