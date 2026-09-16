"use client";

import { definePhiRuntimeModuleControllerClientAreaContribution } from "../area-contributions-controller-client";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../public/ids";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../auth/ids";
import { PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS } from "./common";
import { loadPhiPublicRuntimeControllerClient } from "../public/client";
import { loadPhiAuthRuntimeControllerClient } from "../auth/client";

export const PHI_PUBLIC_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS = [
  ...PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS,
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    loadController: loadPhiPublicRuntimeControllerClient,
  }),
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_AUTH_RUNTIME_MODULE_ID,
    loadController: loadPhiAuthRuntimeControllerClient,
  }),
] as const;
