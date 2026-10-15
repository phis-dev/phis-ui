"use client";

import { createPhiCmsBuilderWidgetPlugin } from "../../../../../plugins/factories/widget-builder-plugin";
import { PhiTimelineWidget } from "./client";
import { PHI_TIMELINE_WIDGET_DEFINITION, type PhiTimelineWidgetConfig } from "./config";

export const PHI_TIMELINE_WIDGET_BUILDER_PLUGIN = createPhiCmsBuilderWidgetPlugin<PhiTimelineWidgetConfig>(
  PHI_TIMELINE_WIDGET_DEFINITION,
  ({ config }) => <PhiTimelineWidget config={config} />,
);
