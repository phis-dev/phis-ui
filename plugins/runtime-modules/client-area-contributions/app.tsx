"use client";

import { definePhiRuntimeModuleControllerClientAreaContribution } from "../area-contributions-controller-client";
import { PHI_APP_RUNTIME_MODULE_ID } from "../app/ids";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../auth/ids";
import { PHI_GROUPS_RUNTIME_MODULE_ID } from "../groups/ids";
import { PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS } from "./common";
import { PHI_DASHBOARD_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION } from "../dashboard/client";
import { loadPhiAuthRuntimeControllerClient } from "../auth/client";
import { loadPhiGroupsRuntimeControllerClient } from "../groups/client";
import { loadPhiAppRuntimeControllerClient } from "../app/client";

export const PHI_APP_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS = [
  ...PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS,
  PHI_DASHBOARD_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION,
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_AUTH_RUNTIME_MODULE_ID,
    loadController: loadPhiAuthRuntimeControllerClient,
  }),
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_GROUPS_RUNTIME_MODULE_ID,
    loadController: loadPhiGroupsRuntimeControllerClient,
  }),
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_APP_RUNTIME_MODULE_ID,
    loadController: loadPhiAppRuntimeControllerClient,
  }),
] as const;
