"use client";

import { definePhiRuntimeModuleControllerClientAreaContribution } from "../area-contributions-controller-client";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "./ids";

export const loadPhiDashboardRuntimeControllerClient = () =>
  import("../../../plugins/runtime-modules/dashboard/controller/client")
    .then((module) => module.PhiDashboardRuntimeControllerClient);

export const PHI_DASHBOARD_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION =
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
    loadController: () => loadPhiDashboardRuntimeControllerClient(),
  });
