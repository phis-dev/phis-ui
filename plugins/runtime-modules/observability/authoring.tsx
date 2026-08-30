"use client";

import WidgetModule from "./authoring-widgets";
import { createPhiRuntimeModuleAuthoringClient } from "../client-authoring-module";
import { PHI_OBSERVABILITY_RUNTIME_MODULE_ID } from "./ids";

export const PhiObservabilityRuntimeModuleAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: PHI_OBSERVABILITY_RUNTIME_MODULE_ID,
  WidgetModule,
});
