"use client";

import { definePhiRuntimeModuleAuthoringClientContribution } from "../authoring-contributions-client";
import { PHI_CORE_RUNTIME_MODULE_ID } from "../core/ids";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "../asset/ids";
import { PHI_THREADS_RUNTIME_MODULE_ID } from "../threads/ids";
import { PHI_TOUR_RUNTIME_MODULE_ID } from "../tour/ids";

export const PHI_COMMON_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTIONS = [
  definePhiRuntimeModuleAuthoringClientContribution({
    moduleId: PHI_CORE_RUNTIME_MODULE_ID,
    loadAuthoring: () => import("../core/client")
      .then((module) => module.loadPhiCoreRuntimeAuthoringClient()),
  }),
  definePhiRuntimeModuleAuthoringClientContribution({
    moduleId: PHI_ASSET_RUNTIME_MODULE_ID,
    loadAuthoring: () => import("../asset/authoring")
        .then((module) => module.PhiAssetRuntimeModuleAuthoringClient),
  }),
  definePhiRuntimeModuleAuthoringClientContribution({
    moduleId: PHI_THREADS_RUNTIME_MODULE_ID,
    loadAuthoring: () => import("../threads/authoring")
      .then((module) => module.PhiThreadsRuntimeModuleAuthoringClient),
  }),
  definePhiRuntimeModuleAuthoringClientContribution({
    moduleId: PHI_TOUR_RUNTIME_MODULE_ID,
    loadAuthoring: () => import("../tour/authoring")
      .then((module) => module.PhiTourRuntimeModuleAuthoringClient),
  }),
] as const;
