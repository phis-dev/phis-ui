"use client";

import dynamic from "next/dynamic";

import { definePhiRuntimeModuleControllerClientAreaContribution } from "../area-contributions-controller-client";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "./ids";

/*
 * next/dynamic rather than a loader: rendered during the server render, it names its chunks in the
 * route's loadable manifest, and the HTML asks for them before hydration instead of after it.
 */
export const PhiLazyDashboardRuntimeControllerClient = dynamic(() =>
  import("../../../plugins/runtime-modules/dashboard/controller/client").then((module) => module.PhiDashboardRuntimeControllerClient));

export const PHI_DASHBOARD_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION =
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
    Controller: PhiLazyDashboardRuntimeControllerClient,
  });
