"use client";

import WidgetModule from "./authoring-widgets";
import {
  createPhiRuntimeModuleAuthoringClient,
  definePhiAuthoringLayoutModuleLoader,
} from "../client-authoring-module";
import { PHI_BUILDER_RUNTIME_MODULE_ID } from "./ids";
import { PHI_BUILDER_RUNTIME_MODULE_LAYOUTS } from "./layouts";

export const PhiBuilderRuntimeModuleAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: PHI_BUILDER_RUNTIME_MODULE_ID,
  WidgetModule,
  layouts: PHI_BUILDER_RUNTIME_MODULE_LAYOUTS.map((entry) => definePhiAuthoringLayoutModuleLoader({
    type: `${entry.definition.pluginKey}/${entry.definition.typeKey}`,
    title: entry.definition.title,
    slotSizePolicy: entry.definition.slotSizePolicy,
    renderPolicies: entry.renderPolicies,
    load: entry.loadRuntime,
  })),
});
