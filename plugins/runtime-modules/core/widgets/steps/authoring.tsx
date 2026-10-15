"use client";

import { createPhiCmsBuilderWidgetPlugin } from "../../../../../plugins/factories/widget-builder-plugin";
import { PhiStepsWidget } from "./client";
import { PHI_STEPS_WIDGET_DEFINITION, type PhiStepsWidgetConfig } from "./config";

export const PHI_STEPS_WIDGET_BUILDER_PLUGIN = createPhiCmsBuilderWidgetPlugin<PhiStepsWidgetConfig>(
  PHI_STEPS_WIDGET_DEFINITION,
  ({ config }) => <PhiStepsWidget config={config} />,
);
