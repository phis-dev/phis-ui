"use client";

import type { PhiBlockRuntime, PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiSwitchWidget } from "./client";
import { PHI_SWITCH_WIDGET_DEFINITION, type PhiSwitchWidgetConfig } from "./config";

export const PHI_SWITCH_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiSwitchWidgetConfig> = {
  ...PHI_SWITCH_WIDGET_DEFINITION,
  renderEditor: ({ runtime, config }) => (
    <PhiSwitchWidget
      runtime={runtime as PhiBlockRuntime}
      config={config}
    />
  ),
};
