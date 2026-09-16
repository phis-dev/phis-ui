"use client";

import { definePhiRuntimeModuleControllerClientAreaContribution } from "../area-contributions-controller-client";
import { PHI_LOCALIZATION_RUNTIME_MODULE_ID } from "../localization/ids";
import { PHI_EDITOR_RUNTIME_MODULE_ID } from "../editor/ids";
import { PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS } from "./common";
import { PHI_DASHBOARD_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION } from "../dashboard/client";
import { loadPhiLocalizationRuntimeControllerClient } from "../localization/client";
import { loadPhiEditorRuntimeControllerClient } from "../editor/client";

export const PHI_EDITOR_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS = [
  ...PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS,
  PHI_DASHBOARD_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION,
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
    loadController: loadPhiLocalizationRuntimeControllerClient,
  }),
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_EDITOR_RUNTIME_MODULE_ID,
    loadController: loadPhiEditorRuntimeControllerClient,
  }),
];
