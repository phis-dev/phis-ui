"use client";

import WidgetModule from "./authoring-widgets";
import { createPhiRuntimeModuleAuthoringClient } from "../client-authoring-module";
import { PHI_CDN_RUNTIME_MODULE_ID } from "./ids";

export const PhiCdnRuntimeModuleAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: PHI_CDN_RUNTIME_MODULE_ID,
  WidgetModule,
});
