"use client";

import { definePhiRuntimeModuleControllerClientAreaContribution } from "../area-contributions-controller-client";
import { PHI_APP_RUNTIME_MODULE_ID } from "../app/ids";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../auth/ids";
import { PHI_GROUPS_RUNTIME_MODULE_ID } from "../groups/ids";
import { PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS } from "./common";

export const PHI_APP_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS = [
  ...PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS,
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_AUTH_RUNTIME_MODULE_ID,
    loadController: () => import("../auth/client")
      .then((module) => module.loadPhiAuthRuntimeControllerClient()),
  }),
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_GROUPS_RUNTIME_MODULE_ID,
    loadController: () => import("../groups/client")
      .then((module) => module.loadPhiGroupsRuntimeControllerClient()),
  }),
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_APP_RUNTIME_MODULE_ID,
    loadController: () => import("../app/client")
      .then((module) => module.loadPhiAppRuntimeControllerClient()),
  }),
] as const;
