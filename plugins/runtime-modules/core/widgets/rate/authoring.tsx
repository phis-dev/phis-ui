"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiRateWidget } from "./client";
import {
  PHI_RATE_WIDGET_DEFINITION,
  PHI_RATE_WIDGET_PLUGIN_TYPE,
  type PhiRateWidgetConfig,
} from "./config";

export const PHI_RATE_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiRateWidgetConfig> = {
  ...PHI_RATE_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <PhiRateWidget blockId={widget.id} config={config} signalsEnabled={false} />
  ),
};

export { PHI_RATE_WIDGET_PLUGIN_TYPE };
