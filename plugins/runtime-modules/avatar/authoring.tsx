"use client";

import WidgetModule from "./authoring-widgets";
import { createPhiRuntimeModuleAuthoringClient } from "../client-authoring-module";
import { PHI_AVATAR_RUNTIME_MODULE_ID } from "./ids";

export const PhiAvatarRuntimeModuleAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: PHI_AVATAR_RUNTIME_MODULE_ID,
  WidgetModule,
});
