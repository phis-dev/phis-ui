"use client";

import { PHI_ACCOUNTING_RUNTIME_MODULE_ID } from "./ids";
import { createPhiAreaBaseRuntimeModuleAuthoringClient } from "../area-base-authoring";

export const PhiAccountingRuntimeModuleAuthoringClient =
  createPhiAreaBaseRuntimeModuleAuthoringClient(PHI_ACCOUNTING_RUNTIME_MODULE_ID);
