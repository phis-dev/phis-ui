"use client";

import type { PhiBlockRuntime, PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiInputWidget } from "./client";
import {
  PHI_INPUT_WIDGET_DEFINITION,
  PHI_INPUT_WIDGET_PLUGIN_TYPE,
  type PhiCmsInputWidgetConfig,
} from "./config";

export const PHI_INPUT_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsInputWidgetConfig> = {
  ...PHI_INPUT_WIDGET_DEFINITION,
  renderEditor: ({ widget, runtime, config }) => (
    <PhiInputWidget
      blockId={widget.id}
      runtime={runtime as PhiBlockRuntime}
      config={config}
    />
  ),
};

export { PHI_INPUT_WIDGET_PLUGIN_TYPE };
