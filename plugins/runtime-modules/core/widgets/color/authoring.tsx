"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiColorWidget } from "../../../../../components/widgets/client/phi-color-widget";
import { PHI_COLOR_WIDGET_DEFINITION, type PhiColorWidgetConfig } from "./config";

export const PHI_COLOR_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiColorWidgetConfig> = {
  ...PHI_COLOR_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <PhiColorWidget blockId={widget.id} config={config} disabled />
  ),
};
