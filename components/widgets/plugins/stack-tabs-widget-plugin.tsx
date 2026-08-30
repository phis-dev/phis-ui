import type { PhiCmsServerWidgetPlugin } from "../../../types";
import { PhiWidgetInertPreview } from "../built-in/widget-preview";
import {
  PHI_TAB_BAR_WIDGET_DEFINITION,
  PHI_TAB_BAR_WIDGET_PLUGIN_TYPE,
  type PhiCmsTabBarWidgetConfig,
} from "../config/stack-tabs";
import { PhiTabBarWidget } from "../server/stack-tabs";

export const PHI_TAB_BAR_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsTabBarWidgetConfig> = {
  ...PHI_TAB_BAR_WIDGET_DEFINITION,
  render: ({ config, runtime }) => <PhiTabBarWidget config={config} runtime={runtime} />,
  renderPreview: ({ config, runtime }) => (
    <PhiWidgetInertPreview>
      <PhiTabBarWidget config={config} runtime={runtime} signalsEnabled={false} />
    </PhiWidgetInertPreview>
  ),
};

export { PHI_TAB_BAR_WIDGET_PLUGIN_TYPE };
