"use client";

import { definePhiRuntimeModuleControllerClientAreaContribution } from "../area-contributions-controller-client";
import { PHI_CORE_RUNTIME_MODULE_ID } from "../core/ids";
import { PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_LOADERS } from "../client-manifests/common";

export const PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS = [
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_CORE_RUNTIME_MODULE_ID,
    loadController: () => import("../core/client")
      .then((module) => module.loadPhiCoreRuntimeControllerClient()),
  }),
  ...PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_LOADERS.map(
    ([moduleId, loadController]) => definePhiRuntimeModuleControllerClientAreaContribution({
      moduleId,
      loadController,
    }),
  ),
] as const;
