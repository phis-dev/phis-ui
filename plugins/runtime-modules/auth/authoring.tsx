"use client";

import { PHI_AUTH_RUNTIME_MODULE_ID } from "./ids";
import WidgetModule from "./authoring-widgets";
import { createPhiRuntimeModuleAuthoringClient } from "../client-authoring-module";

export const PhiAuthRuntimeModuleAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: PHI_AUTH_RUNTIME_MODULE_ID,
  WidgetModule,
});
