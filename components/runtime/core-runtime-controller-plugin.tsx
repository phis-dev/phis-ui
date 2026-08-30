"use client";

import type { PhiRuntimeControllerPlugin } from "../../types";
import { createPhiRuntimeControllerClient } from "./runtime-controller-client-factory";
import {
  PHI_CORE_RUNTIME_CONTROLLER_DEFINITION,
  type PhiCoreRuntimeControllerConfig,
} from "./core-runtime-controller-definition";

export const PHI_CORE_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_CORE_RUNTIME_CONTROLLER_DEFINITION,
  renderController: () => null,
} satisfies PhiRuntimeControllerPlugin<PhiCoreRuntimeControllerConfig>;

export const PhiCoreRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_CORE_RUNTIME_CONTROLLER_PLUGIN,
);
