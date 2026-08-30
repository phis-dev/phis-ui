"use client";

import type { ComponentType } from "react";

import type { PhiRuntimeModuleId } from "./contracts";
import {
  createPhiAuthoringWidgetModule,
  type PhiAuthoringWidgetModuleProps,
} from "./client-authoring-widget-module";
import { createPhiRuntimeModuleAuthoringClient } from "./client-authoring-module";

const EMPTY_AREA_BASE_WIDGET_MODULE = createPhiAuthoringWidgetModule([]);

export function createPhiAreaBaseRuntimeModuleAuthoringClient(
  moduleId: PhiRuntimeModuleId,
  WidgetModule: ComponentType<PhiAuthoringWidgetModuleProps> = EMPTY_AREA_BASE_WIDGET_MODULE,
) {
  return createPhiRuntimeModuleAuthoringClient({
    moduleId,
    WidgetModule,
  });
}
