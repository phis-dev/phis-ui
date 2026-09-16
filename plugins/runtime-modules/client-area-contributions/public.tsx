"use client";

import { definePhiRuntimeModuleControllerClientAreaContribution } from "../area-contributions-controller-client";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../public/ids";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../auth/ids";
import { PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS } from "./common";
import { PhiLazyPublicRuntimeControllerClient } from "../public/client";
import { PhiLazyAuthRuntimeControllerClient } from "../auth/client";

export const PHI_PUBLIC_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS = [
  ...PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS,
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    Controller: PhiLazyPublicRuntimeControllerClient,
  }),
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_AUTH_RUNTIME_MODULE_ID,
    Controller: PhiLazyAuthRuntimeControllerClient,
  }),
] as const;
