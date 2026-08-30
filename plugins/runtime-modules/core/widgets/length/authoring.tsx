"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiLengthWidget } from "./client";
import {
  PHI_LENGTH_WIDGET_DEFINITION,
  PHI_LENGTH_WIDGET_PLUGIN_TYPE,
  type PhiLengthWidgetConfig,
} from "./config";

export const PHI_LENGTH_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiLengthWidgetConfig> = {
  ...PHI_LENGTH_WIDGET_DEFINITION,
  renderEditor: ({ config }) => <PhiLengthWidget config={config} />,
};

export { PHI_LENGTH_WIDGET_PLUGIN_TYPE };
