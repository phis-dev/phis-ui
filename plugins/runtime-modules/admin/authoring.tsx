"use client";

import WidgetModule from "./authoring-widgets";
import { createPhiRuntimeModuleAuthoringClient } from "../client-authoring-module";
import { PHI_ADMIN_RUNTIME_MODULE_ID } from "./ids";

export const PhiAdminRuntimeModuleAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: PHI_ADMIN_RUNTIME_MODULE_ID,
  WidgetModule,
});
