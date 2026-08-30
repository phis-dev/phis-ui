"use client";

import type { PhiRuntimeControllerPlugin } from "../../../../types";
import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import {
  PHI_DASHBOARD_RUNTIME_CONTROLLER_DEFINITION,
  type PhiDashboardControllerConfig,
} from "./definition";

export const PHI_DASHBOARD_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_DASHBOARD_RUNTIME_CONTROLLER_DEFINITION,
  renderController: () => null,
} satisfies PhiRuntimeControllerPlugin<PhiDashboardControllerConfig>;

export const PhiDashboardRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_DASHBOARD_RUNTIME_CONTROLLER_PLUGIN,
);
