"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiRateWidget } from "./client";
import {
  PHI_RATE_WIDGET_DEFINITION,
  type PhiRateWidgetConfig,
} from "./config";

export const PHI_RATE_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiRateWidgetConfig> = {
  ...PHI_RATE_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <PhiRateWidget blockId={widget.id} config={config} signalsEnabled={false} />
  ),
};
