import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import {
  PhiSidebarNavigationWidget,
  PhiSidebarNavigationWidgetPreview,
} from "./server";
import {
  PHI_SIDEBAR_NAVIGATION_WIDGET_DEFINITION,
  PHI_SIDEBAR_NAVIGATION_WIDGET_PLUGIN_TYPE,
  type PhiCmsSidebarNavigationWidgetConfig,
} from "./config";

export const PHI_SIDEBAR_NAVIGATION_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsSidebarNavigationWidgetConfig> = {
  ...PHI_SIDEBAR_NAVIGATION_WIDGET_DEFINITION,
  render: ({ widget, runtime, config }) => (
    <PhiSidebarNavigationWidget
      key={`widget-${widget.id}`}
      runtime={runtime}
      navKey={config.navKey ?? `${runtime.area}:sidebar`}
      config={config}
    />
  ),
  renderPreview: ({ runtime, config }) => (
    <PhiSidebarNavigationWidgetPreview
      runtime={runtime}
      navKey={config.navKey ?? `${runtime.area}:sidebar`}
      config={config}
    />
  ),
};

export { PHI_SIDEBAR_NAVIGATION_WIDGET_PLUGIN_TYPE };
