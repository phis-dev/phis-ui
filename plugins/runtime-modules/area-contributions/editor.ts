import { createPhiCommonRuntimeModuleServerAreaContributions } from "./common";
import { createPhiDashboardRuntimeModuleServerAreaContribution } from "../dashboard/server";
import { PHI_EDITOR_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION } from "../editor/server";
import { createPhiLocalizationRuntimeModuleServerAreaContribution } from "../localization/server";

export const PHI_EDITOR_RUNTIME_MODULE_AREA_CONTRIBUTIONS = [
  ...createPhiCommonRuntimeModuleServerAreaContributions({ area: "editor" }),
  createPhiDashboardRuntimeModuleServerAreaContribution("editor"),
  createPhiLocalizationRuntimeModuleServerAreaContribution("editor"),
  PHI_EDITOR_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION,
] as const;
