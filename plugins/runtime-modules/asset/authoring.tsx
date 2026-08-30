"use client";

import WidgetModule from "./authoring-widgets";
import { createPhiRuntimeModuleAuthoringClient } from "../client-authoring-module";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "./ids";

export const PhiAssetRuntimeModuleAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: PHI_ASSET_RUNTIME_MODULE_ID,
  WidgetModule,
});
