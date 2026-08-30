"use client";

import type { PhiRuntimeControllerPlugin } from "../../../../types";
import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import {
  PHI_ADMIN_RUNTIME_CONTROLLER_DEFINITION,
  type PhiAdminControllerConfig,
} from "../controller/definition";

export const PHI_ADMIN_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_ADMIN_RUNTIME_CONTROLLER_DEFINITION,
  renderController: () => null,
} satisfies PhiRuntimeControllerPlugin<PhiAdminControllerConfig>;

export const PhiAdminRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_ADMIN_RUNTIME_CONTROLLER_PLUGIN,
);
