"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiTestBlockWidget } from "./client";
import { PHI_TEST_BLOCK_WIDGET_DEFINITION, type PhiCmsTestBlockWidgetConfig } from "./config";

export const PHI_TEST_BLOCK_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsTestBlockWidgetConfig> = {
  ...PHI_TEST_BLOCK_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <PhiTestBlockWidget
      key={`widget-${widget.id}`}
      labels={{ text: config.text ?? widget.label ?? "Test block" }}
      config={config}
    />
  ),
};
