"use client";

import WidgetModule from "./authoring-widgets";
import { createPhiRuntimeModuleAuthoringClient } from "../client-authoring-module";
import { PHI_LOCALIZATION_RUNTIME_MODULE_ID } from "./ids";

export const PhiLocalizationRuntimeModuleAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
  WidgetModule,
});
