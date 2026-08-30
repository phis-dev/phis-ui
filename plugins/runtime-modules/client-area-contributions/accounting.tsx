"use client";

import { definePhiRuntimeModuleControllerClientAreaContribution } from "../area-contributions-controller-client";
import { PHI_ACCOUNTING_RUNTIME_MODULE_ID } from "../accounting/ids";
import { PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS } from "./common";

export const PHI_ACCOUNTING_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS = [
  ...PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS,
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
    loadController: () => import("../accounting/client")
      .then((module) => module.loadPhiAccountingRuntimeControllerClient()),
  }),
] as const;
