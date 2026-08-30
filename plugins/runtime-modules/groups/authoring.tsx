"use client";

import { PHI_GROUPS_RUNTIME_MODULE_ID } from "./ids";
import { createPhiAreaBaseRuntimeModuleAuthoringClient } from "../area-base-authoring";

export const PhiGroupsRuntimeModuleAuthoringClient =
  createPhiAreaBaseRuntimeModuleAuthoringClient(PHI_GROUPS_RUNTIME_MODULE_ID);
