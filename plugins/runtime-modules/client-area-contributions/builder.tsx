"use client";

import { definePhiRuntimeModuleControllerClientAreaContribution } from "../area-contributions-controller-client";
import { PHI_BUILDER_RUNTIME_MODULE_ID } from "../builder/ids";
import { PHI_THEME_RUNTIME_MODULE_ID } from "../theme/ids";
import { PHI_FORM_BUILDER_RUNTIME_MODULE_ID } from "../form-builder/ids";
import { PHI_REVISIONS_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION } from "../revisions/client";
import { PHI_DASHBOARD_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION } from "../dashboard/client";
import { PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS } from "./common";
import { loadPhiBuilderRuntimeControllerClient } from "../builder/client";
import { loadPhiFormBuilderRuntimeControllerClient } from "../form-builder/client";
import { loadPhiThemeRuntimeControllerClient } from "../theme/client";

export const PHI_BUILDER_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS = [
  ...PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS,
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    loadController: loadPhiBuilderRuntimeControllerClient,
  }),
  PHI_DASHBOARD_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION,
  PHI_REVISIONS_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION,
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_FORM_BUILDER_RUNTIME_MODULE_ID,
    loadController: loadPhiFormBuilderRuntimeControllerClient,
  }),
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_THEME_RUNTIME_MODULE_ID,
    loadController: loadPhiThemeRuntimeControllerClient,
  }),
] as const;
