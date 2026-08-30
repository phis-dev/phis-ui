"use client";

import { createPhiCmsBuilderWidgetPlugin } from "../../../../../plugins/factories/widget-builder-plugin";
import { PhiSegmentedWidget } from "./client";
import { PHI_SEGMENTED_WIDGET_DEFINITION, type PhiSegmentedWidgetConfig } from "./config";

export const PHI_SEGMENTED_WIDGET_BUILDER_PLUGIN = createPhiCmsBuilderWidgetPlugin<PhiSegmentedWidgetConfig>(
  PHI_SEGMENTED_WIDGET_DEFINITION,
  ({ config }) => <PhiSegmentedWidget config={config} />,
);
