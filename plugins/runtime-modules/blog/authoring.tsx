"use client";

import WidgetModule from "./authoring-widgets";
import { createPhiRuntimeModuleAuthoringClient } from "../client-authoring-module";
import { PHI_BLOG_RUNTIME_MODULE_ID } from "./ids";

export const PhiBlogRuntimeModuleAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: PHI_BLOG_RUNTIME_MODULE_ID,
  WidgetModule,
});
