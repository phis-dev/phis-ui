"use client";

import WidgetModule from "./authoring-widgets";
import { createPhiRuntimeModuleAuthoringClient } from "../client-authoring-module";
import { PHI_SEARCH_RUNTIME_MODULE_ID } from "./ids";

export const PhiSearchRuntimeModuleAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: PHI_SEARCH_RUNTIME_MODULE_ID,
  WidgetModule,
});
