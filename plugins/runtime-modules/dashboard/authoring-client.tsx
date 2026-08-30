"use client";

import { createPhiAuthoringWidgetModule } from "../client-authoring-widget-module";
import { createPhiRuntimeModuleAuthoringClient } from "../client-authoring-module";
import { definePhiRuntimeModuleAuthoringClientContribution } from "../authoring-contributions-client";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "./ids";

const DashboardWidgetModule = createPhiAuthoringWidgetModule([]);

export const PhiDashboardRuntimeModuleAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
  WidgetModule: DashboardWidgetModule,
});

export const PHI_DASHBOARD_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTION =
  definePhiRuntimeModuleAuthoringClientContribution({
    moduleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
    loadAuthoring: () => Promise.resolve(PhiDashboardRuntimeModuleAuthoringClient),
  });
