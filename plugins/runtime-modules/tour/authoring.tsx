"use client";

import WidgetModule from "./authoring-widgets";
import { createPhiRuntimeModuleAuthoringClient } from "../client-authoring-module";
import { PHI_TOUR_RUNTIME_MODULE_ID } from "./ids";

export const PhiTourRuntimeModuleAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: PHI_TOUR_RUNTIME_MODULE_ID,
  WidgetModule,
});
