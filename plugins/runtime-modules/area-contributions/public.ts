import { createPhiCommonRuntimeModuleServerAreaContributions } from "./common";
import { createPhiAuthRuntimeModuleServerAreaContribution } from "../auth/server";
import { createPhiNewsRuntimeModuleServerAreaContribution } from "../news/server";
import { createPhiBlogRuntimeModuleServerAreaContribution } from "../blog/server";
import { PHI_PUBLIC_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION } from "../public/server";
import { createPhiVideoRuntimeModuleServerAreaContribution } from "../video/server";

export const PHI_PUBLIC_RUNTIME_MODULE_AREA_CONTRIBUTIONS = [
  ...createPhiCommonRuntimeModuleServerAreaContributions(),
  PHI_PUBLIC_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION,
  createPhiAuthRuntimeModuleServerAreaContribution(),
  createPhiNewsRuntimeModuleServerAreaContribution(),
  createPhiBlogRuntimeModuleServerAreaContribution(),
  createPhiVideoRuntimeModuleServerAreaContribution(),
] as const;
