"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiBuilderModeSwitchWidgetClient } from "../../../../../plugins/runtime-modules/builder/clients/mode-switch";
import { PHI_BUILDER_MODE_SWITCH_WIDGET_DEFINITION, type PhiBuilderChromeWidgetConfig } from "../chrome/config";

export const PHI_BUILDER_MODE_SWITCH_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiBuilderChromeWidgetConfig> = {
  ...PHI_BUILDER_MODE_SWITCH_WIDGET_DEFINITION,
  renderEditor: () => <PhiBuilderModeSwitchWidgetClient />,
};
