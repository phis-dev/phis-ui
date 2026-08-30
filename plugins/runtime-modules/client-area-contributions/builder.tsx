"use client";

import { definePhiRuntimeModuleControllerClientAreaContribution } from "../area-contributions-controller-client";
import { PHI_BUILDER_RUNTIME_MODULE_ID } from "../builder/ids";
import { PHI_THEME_RUNTIME_MODULE_ID } from "../theme/ids";
import { PHI_FORM_BUILDER_RUNTIME_MODULE_ID } from "../form-builder/ids";
import { PHI_REVISIONS_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION } from "../revisions/client";
import { PHI_DASHBOARD_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION } from "../dashboard/client";
import { PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS } from "./common";

export const PHI_BUILDER_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS = [
  ...PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS,
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    loadController: () => import("../builder/client")
      .then((module) => module.loadPhiBuilderRuntimeControllerClient()),
  }),
  PHI_DASHBOARD_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION,
  PHI_REVISIONS_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION,
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_FORM_BUILDER_RUNTIME_MODULE_ID,
    loadController: () => import("../form-builder/client")
      .then((module) => module.loadPhiFormBuilderRuntimeControllerClient()),
  }),
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_THEME_RUNTIME_MODULE_ID,
    loadController: () => import("../theme/client")
      .then((module) => module.loadPhiThemeRuntimeControllerClient()),
  }),
] as const;
