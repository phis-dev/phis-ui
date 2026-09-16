"use client";

import { definePhiRuntimeModuleControllerClientAreaContribution } from "../area-contributions-controller-client";
import { PHI_ADMIN_RUNTIME_MODULE_ID } from "../admin/ids";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../auth/ids";
import { PHI_GROUPS_RUNTIME_MODULE_ID } from "../groups/ids";
import { PHI_LOCALIZATION_RUNTIME_MODULE_ID } from "../localization/ids";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID } from "../user-management/ids";
import { PHI_DASHBOARD_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION } from "../dashboard/client";
import { PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS } from "./common";
import { PhiLazyAuthRuntimeControllerClient } from "../auth/client";
import { PhiLazyGroupsRuntimeControllerClient } from "../groups/client";
import { PhiLazyLocalizationRuntimeControllerClient } from "../localization/client";
import { PhiLazyUserManagementRuntimeControllerClient } from "../user-management/client";
import { PhiLazyAdminRuntimeControllerClient } from "../admin/client";

export const PHI_ADMIN_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS = [
  ...PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS,
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_AUTH_RUNTIME_MODULE_ID,
    Controller: PhiLazyAuthRuntimeControllerClient,
  }),
  PHI_DASHBOARD_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION,
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_GROUPS_RUNTIME_MODULE_ID,
    Controller: PhiLazyGroupsRuntimeControllerClient,
  }),
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
    Controller: PhiLazyLocalizationRuntimeControllerClient,
  }),
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
    Controller: PhiLazyUserManagementRuntimeControllerClient,
  }),
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_ADMIN_RUNTIME_MODULE_ID,
    Controller: PhiLazyAdminRuntimeControllerClient,
  }),
];
