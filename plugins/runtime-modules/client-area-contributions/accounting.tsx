"use client";

import { definePhiRuntimeModuleControllerClientAreaContribution } from "../area-contributions-controller-client";
import { PHI_ACCOUNTING_RUNTIME_MODULE_ID } from "../accounting/ids";
import { PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS } from "./common";
import { PHI_DASHBOARD_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION } from "../dashboard/client";
import { PhiLazyAccountingRuntimeControllerClient } from "../accounting/client";

export const PHI_ACCOUNTING_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS = [
  ...PHI_COMMON_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTIONS,
  PHI_DASHBOARD_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION,
  definePhiRuntimeModuleControllerClientAreaContribution({
    moduleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
    Controller: PhiLazyAccountingRuntimeControllerClient,
  }),
] as const;
