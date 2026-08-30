import { createPhiCommonRuntimeModuleServerAreaContributions } from "./common";
import { createPhiAuthRuntimeModuleServerAreaContribution } from "../auth/server";
import { PHI_PUBLIC_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION } from "../public/server";

export const PHI_PUBLIC_RUNTIME_MODULE_AREA_CONTRIBUTIONS = [
  ...createPhiCommonRuntimeModuleServerAreaContributions({ area: "public" }),
  PHI_PUBLIC_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION,
  createPhiAuthRuntimeModuleServerAreaContribution("public"),
] as const;
