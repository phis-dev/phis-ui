"use client";

import WidgetModule from "./authoring-widgets";
import { createPhiRuntimeModuleAuthoringClient } from "../client-authoring-module";
import { PHI_FORM_BUILDER_RUNTIME_MODULE_ID } from "./ids";

export const PhiFormBuilderRuntimeModuleAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: PHI_FORM_BUILDER_RUNTIME_MODULE_ID,
  WidgetModule,
});
