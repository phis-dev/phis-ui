"use client";

import WidgetModule from "./authoring-widgets";
import { createPhiRuntimeModuleAuthoringClient } from "../client-authoring-module";
import { PHI_BILLING_RUNTIME_MODULE_ID } from "./ids";

export const PhiBillingRuntimeModuleAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: PHI_BILLING_RUNTIME_MODULE_ID,
  WidgetModule,
});
