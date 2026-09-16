"use client";

import { definePhiRuntimeModuleControllerClientAreaContribution } from "../area-contributions-controller-client";
import { PHI_BUILDER_RUNTIME_MODULE_ID } from "../builder/ids";
import { PHI_THEME_RUNTIME_MODULE_ID } from "../theme/ids";
import { PHI_FORM_BUILDER_RUNTIME_MODULE_ID } from "../form-builder/ids";
import { PHI_REVISIONS_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION } from "../revisions/client";
import { PHI_DASHBOARD_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION } from "../dashboard/client";
import { PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS } from "./common";
import { PhiLazyBuilderRuntimeControllerClient } from "../builder/client";
import { PhiLazyFormBuilderRuntimeControllerClient } from "../form-builder/client";
import { PhiLazyThemeRuntimeControllerClient } from "../theme/client";

export const PHI_BUILDER_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS = [
  ...PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS,
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    Controller: PhiLazyBuilderRuntimeControllerClient,
  }),
  PHI_DASHBOARD_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION,
  PHI_REVISIONS_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION,
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_FORM_BUILDER_RUNTIME_MODULE_ID,
    Controller: PhiLazyFormBuilderRuntimeControllerClient,
  }),
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_THEME_RUNTIME_MODULE_ID,
    Controller: PhiLazyThemeRuntimeControllerClient,
  }),
] as const;
