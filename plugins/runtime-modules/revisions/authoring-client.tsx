"use client";

import WidgetModule from "./authoring-widgets";
import { createPhiRuntimeModuleAuthoringClient } from "../client-authoring-module";
import { definePhiRuntimeModuleAuthoringClientContribution } from "../authoring-contributions-client";
import { PHI_REVISIONS_RUNTIME_MODULE_ID } from "./ids";

export const PhiRevisionsRuntimeModuleAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: PHI_REVISIONS_RUNTIME_MODULE_ID,
  WidgetModule,
});

export const PHI_REVISIONS_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTION =
  definePhiRuntimeModuleAuthoringClientContribution({
    moduleId: PHI_REVISIONS_RUNTIME_MODULE_ID,
    loadAuthoring: () => Promise.resolve(PhiRevisionsRuntimeModuleAuthoringClient),
  });
