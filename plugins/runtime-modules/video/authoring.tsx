"use client";

import WidgetModule from "./authoring-widgets";
import { createPhiRuntimeModuleAuthoringClient } from "../client-authoring-module";
import { PHI_VIDEO_RUNTIME_MODULE_ID } from "./ids";

export const PhiVideoRuntimeModuleAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: PHI_VIDEO_RUNTIME_MODULE_ID,
  WidgetModule,
});
