import { createPhiCommonRuntimeModuleServerAreaContributions } from "./common";
import { createPhiDashboardRuntimeModuleServerAreaContribution } from "../dashboard/server";
import { PHI_ACCOUNTING_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION } from "../accounting/server";
import { createPhiBillingRuntimeModuleServerAreaContribution } from "../billing/server";

export const PHI_ACCOUNTING_RUNTIME_MODULE_AREA_CONTRIBUTIONS = [
  ...createPhiCommonRuntimeModuleServerAreaContributions(),
  createPhiDashboardRuntimeModuleServerAreaContribution(),
  PHI_ACCOUNTING_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION,
  createPhiBillingRuntimeModuleServerAreaContribution(),
] as const;
