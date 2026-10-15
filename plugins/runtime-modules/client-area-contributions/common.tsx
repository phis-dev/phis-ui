"use client";

import { definePhiRuntimeModuleControllerClientAreaContribution } from "../area-contributions-controller-client";
import { PHI_CORE_RUNTIME_MODULE_ID } from "../core/ids";
import { PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_LOADERS } from "../client-manifests/common";
import { PhiLazyCoreRuntimeControllerClient } from "../core/client";
import { PHI_THREADS_RUNTIME_MODULE_ID } from "../threads/ids";
import { PhiLazyThreadsRuntimeControllerClient } from "../threads/client";

export const PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS = [
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_CORE_RUNTIME_MODULE_ID,
    Controller: PhiLazyCoreRuntimeControllerClient,
  }),
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_THREADS_RUNTIME_MODULE_ID,
    Controller: PhiLazyThreadsRuntimeControllerClient,
  }),
  ...PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_LOADERS.map(
    ([moduleId, Controller]) => definePhiRuntimeModuleControllerClientAreaContribution({
      moduleId,
      Controller,
    }),
  ),
] as const;
