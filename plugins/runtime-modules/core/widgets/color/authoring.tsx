"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiColorWidget } from "./client";
import { PHI_COLOR_WIDGET_DEFINITION, type PhiColorWidgetConfig } from "./config";

export const PHI_COLOR_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiColorWidgetConfig> = {
  ...PHI_COLOR_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <PhiColorWidget blockId={widget.id} config={config} disabled />
  ),
};
