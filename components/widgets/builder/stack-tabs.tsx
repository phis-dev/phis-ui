"use client";

import { createPhiCmsBuilderWidgetPlugin } from "../../../plugins/factories/widget-builder-plugin";
import {
  PHI_TAB_BAR_WIDGET_DEFINITION,
  PHI_TAB_BAR_WIDGET_PLUGIN_TYPE,
  type PhiCmsTabBarWidgetConfig,
} from "../config/stack-tabs";
import { PhiTabBarWidgetClient } from "../client/stack-tabs";

export const PHI_TAB_BAR_WIDGET_BUILDER_PLUGIN = createPhiCmsBuilderWidgetPlugin<PhiCmsTabBarWidgetConfig>(
  PHI_TAB_BAR_WIDGET_DEFINITION,
  ({ config }) => <PhiTabBarWidgetClient config={config} />,
);

export { PHI_TAB_BAR_WIDGET_PLUGIN_TYPE };
