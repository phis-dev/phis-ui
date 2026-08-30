"use client";

import { definePhiRuntimeModuleAuthoringClientContribution } from "../authoring-contributions-client";
import { PHI_CORE_RUNTIME_MODULE_ID } from "../core/ids";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "../asset/ids";

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
] as const;
