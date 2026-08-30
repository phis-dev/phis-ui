"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiCheckboxWidget } from "./client";
import {
  PHI_CHECKBOX_WIDGET_DEFINITION,
  PHI_CHECKBOX_WIDGET_PLUGIN_TYPE,
  type PhiCheckboxWidgetConfig,
} from "./config";

export const PHI_CHECKBOX_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCheckboxWidgetConfig> = {
  ...PHI_CHECKBOX_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <PhiCheckboxWidget blockId={widget.id} config={config} />
  ),
};

export { PHI_CHECKBOX_WIDGET_PLUGIN_TYPE };
