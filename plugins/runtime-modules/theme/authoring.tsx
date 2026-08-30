"use client";

import WidgetModule from "./authoring-widgets";
import { createPhiRuntimeModuleAuthoringClient } from "../client-authoring-module";
import { PHI_THEME_RUNTIME_MODULE_ID } from "./ids";

export const PhiThemeRuntimeModuleAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: PHI_THEME_RUNTIME_MODULE_ID,
  WidgetModule,
});
