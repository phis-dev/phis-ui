"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiSliderWidget } from "./client";
import {
  PHI_SLIDER_WIDGET_DEFINITION,
  PHI_SLIDER_WIDGET_PLUGIN_TYPE,
  type PhiSliderWidgetConfig,
} from "./config";

export const PHI_SLIDER_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiSliderWidgetConfig> = {
  ...PHI_SLIDER_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <PhiSliderWidget blockId={widget.id} config={config} />
  ),
};

export { PHI_SLIDER_WIDGET_PLUGIN_TYPE };
