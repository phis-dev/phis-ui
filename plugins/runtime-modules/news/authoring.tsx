"use client";

import WidgetModule from "./authoring-widgets";
import { createPhiRuntimeModuleAuthoringClient } from "../client-authoring-module";
import { PHI_NEWS_RUNTIME_MODULE_ID } from "./ids";

export const PhiNewsRuntimeModuleAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: PHI_NEWS_RUNTIME_MODULE_ID,
  WidgetModule,
});
