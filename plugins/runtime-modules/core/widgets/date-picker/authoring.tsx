"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiDatePickerWidget } from "./client";
import {
  PHI_DATE_PICKER_WIDGET_DEFINITION,
  PHI_DATE_PICKER_WIDGET_PLUGIN_TYPE,
  type PhiDatePickerWidgetConfig,
} from "./config";

export const PHI_DATE_PICKER_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiDatePickerWidgetConfig> = {
  ...PHI_DATE_PICKER_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <PhiDatePickerWidget blockId={widget.id} config={config} signalsEnabled={false} />
  ),
};

export { PHI_DATE_PICKER_WIDGET_PLUGIN_TYPE };
