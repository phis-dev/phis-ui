"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiDimensionWidget } from "./client";
import {
  PHI_DIMENSION_WIDGET_DEFINITION,
  PHI_DIMENSION_WIDGET_PLUGIN_TYPE,
  type PhiDimensionWidgetConfig,
} from "./config";

export const PHI_DIMENSION_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiDimensionWidgetConfig> = {
  ...PHI_DIMENSION_WIDGET_DEFINITION,
  renderEditor: ({ config }) => <PhiDimensionWidget config={config} />,
};

export { PHI_DIMENSION_WIDGET_PLUGIN_TYPE };
