"use client";

import { definePhiRuntimeModuleControllerClientAreaContribution } from "../area-contributions-controller-client";
import { PHI_ADMIN_RUNTIME_MODULE_ID } from "../admin/ids";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../auth/ids";
import { PHI_GROUPS_RUNTIME_MODULE_ID } from "../groups/ids";
import { PHI_LOCALIZATION_RUNTIME_MODULE_ID } from "../localization/ids";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID } from "../user-management/ids";
import { PHI_DASHBOARD_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION } from "../dashboard/client";
import { PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS } from "./common";
import { loadPhiAuthRuntimeControllerClient } from "../auth/client";
import { loadPhiGroupsRuntimeControllerClient } from "../groups/client";
import { loadPhiLocalizationRuntimeControllerClient } from "../localization/client";
import { loadPhiUserManagementRuntimeControllerClient } from "../user-management/client";
import { loadPhiAdminRuntimeControllerClient } from "../admin/client";

export const PHI_ADMIN_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS = [
  ...PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS,
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_AUTH_RUNTIME_MODULE_ID,
    loadController: loadPhiAuthRuntimeControllerClient,
  }),
  PHI_DASHBOARD_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION,
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_GROUPS_RUNTIME_MODULE_ID,
    loadController: loadPhiGroupsRuntimeControllerClient,
  }),
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
    loadController: loadPhiLocalizationRuntimeControllerClient,
  }),
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
    loadController: loadPhiUserManagementRuntimeControllerClient,
  }),
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_ADMIN_RUNTIME_MODULE_ID,
    loadController: loadPhiAdminRuntimeControllerClient,
  }),
];
