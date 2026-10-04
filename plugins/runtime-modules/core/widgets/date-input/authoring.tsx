"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiDateInputWidget } from "./client";
import {
  PHI_DATE_INPUT_WIDGET_DEFINITION,
  type PhiDateInputWidgetConfig,
} from "./config";

export const PHI_DATE_INPUT_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiDateInputWidgetConfig> = {
  ...PHI_DATE_INPUT_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <PhiDateInputWidget blockId={widget.id} config={config} signalsEnabled={false} />
  ),
};
