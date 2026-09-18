"use client";

import WidgetModule from "./authoring-widgets";
import { createPhiRuntimeModuleAuthoringClient } from "../client-authoring-module";
import { PHI_THREADS_RUNTIME_MODULE_ID } from "./ids";

export const PhiThreadsRuntimeModuleAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: PHI_THREADS_RUNTIME_MODULE_ID,
  WidgetModule,
});
