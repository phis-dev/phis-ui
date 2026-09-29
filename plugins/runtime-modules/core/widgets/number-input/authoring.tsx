"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiNumberInputWidget } from "./client";
import {
  PHI_NUMBER_INPUT_WIDGET_DEFINITION,
  type PhiNumberInputWidgetConfig,
} from "./config";

export const PHI_NUMBER_INPUT_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiNumberInputWidgetConfig> = {
  ...PHI_NUMBER_INPUT_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <PhiNumberInputWidget blockId={widget.id} config={config} />
  ),
};
