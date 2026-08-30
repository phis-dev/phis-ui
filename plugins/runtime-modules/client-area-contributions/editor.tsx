"use client";

import { definePhiRuntimeModuleControllerClientAreaContribution } from "../area-contributions-controller-client";
import { PHI_LOCALIZATION_RUNTIME_MODULE_ID } from "../localization/ids";
import { PHI_EDITOR_RUNTIME_MODULE_ID } from "../editor/ids";
import { PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS } from "./common";

export const PHI_EDITOR_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS = [
  ...PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS,
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
    loadController: () => import("../localization/client")
      .then((module) => module.loadPhiLocalizationRuntimeControllerClient()),
  }),
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_EDITOR_RUNTIME_MODULE_ID,
    loadController: () => import("../editor/client")
      .then((module) => module.loadPhiEditorRuntimeControllerClient()),
  }),
];
