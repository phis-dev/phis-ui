"use client";

import WidgetModule from "./authoring-widgets";
import { createPhiRuntimeModuleAuthoringClient } from "../client-authoring-module";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID } from "./ids";

export const PhiUserManagementRuntimeModuleAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
  WidgetModule,
});
