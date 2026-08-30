"use client";

import WidgetModule from "./authoring-widgets";
import { createPhiRuntimeModuleAuthoringClient } from "../client-authoring-module";
import { PHI_EDITOR_RUNTIME_MODULE_ID } from "./ids";

export const PhiEditorRuntimeModuleAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: PHI_EDITOR_RUNTIME_MODULE_ID,
  WidgetModule,
});
