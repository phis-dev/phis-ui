"use client";

import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "./ids";
import { createPhiAreaBaseRuntimeModuleAuthoringClient } from "../area-base-authoring";

export const PhiPublicRuntimeModuleAuthoringClient =
  createPhiAreaBaseRuntimeModuleAuthoringClient(PHI_PUBLIC_RUNTIME_MODULE_ID);
