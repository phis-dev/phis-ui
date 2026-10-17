import { createPhiCommonRuntimeModuleServerAreaContributions } from "./common";
import { createPhiDashboardRuntimeModuleServerAreaContribution } from "../dashboard/server";
import { PHI_EDITOR_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION } from "../editor/server";
import { createPhiLocalizationRuntimeModuleServerAreaContribution } from "../localization/server";
import { createPhiNewsRuntimeModuleServerAreaContribution } from "../news/server";
import { createPhiBlogRuntimeModuleServerAreaContribution } from "../blog/server";

export const PHI_EDITOR_RUNTIME_MODULE_AREA_CONTRIBUTIONS = [
  ...createPhiCommonRuntimeModuleServerAreaContributions(),
  createPhiDashboardRuntimeModuleServerAreaContribution(),
  createPhiLocalizationRuntimeModuleServerAreaContribution(),
  createPhiNewsRuntimeModuleServerAreaContribution(),
  createPhiBlogRuntimeModuleServerAreaContribution(),
  PHI_EDITOR_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION,
] as const;
