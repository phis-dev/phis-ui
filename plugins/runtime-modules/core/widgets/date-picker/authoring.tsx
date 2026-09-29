"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiDatePickerWidget } from "./client";
import {
  PHI_DATE_PICKER_WIDGET_DEFINITION,
  type PhiDatePickerWidgetConfig,
} from "./config";

export const PHI_DATE_PICKER_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiDatePickerWidgetConfig> = {
  ...PHI_DATE_PICKER_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <PhiDatePickerWidget blockId={widget.id} config={config} signalsEnabled={false} />
  ),
};
