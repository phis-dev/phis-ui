"use client";

import { PHI_APP_RUNTIME_MODULE_ID } from "./ids";
import { createPhiAreaBaseRuntimeModuleAuthoringClient } from "../area-base-authoring";

export const PhiAppRuntimeModuleAuthoringClient =
  createPhiAreaBaseRuntimeModuleAuthoringClient(PHI_APP_RUNTIME_MODULE_ID);
