"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import {
  PHI_BUILDER_INSPECTOR_HEADER_WIDGET_DEFINITION,
  type PhiBuilderChromeWidgetConfig,
} from "../chrome/config";

export const PHI_BUILDER_INSPECTOR_HEADER_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiBuilderChromeWidgetConfig> = {
  ...PHI_BUILDER_INSPECTOR_HEADER_WIDGET_DEFINITION,
  renderEditor: () => null,
};
