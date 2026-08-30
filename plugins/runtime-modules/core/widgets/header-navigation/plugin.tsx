import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import {
  PHI_HEADER_NAVIGATION_WIDGET_DEFINITION,
  PHI_HEADER_NAVIGATION_WIDGET_PLUGIN_TYPE,
  type PhiCmsHeaderNavigationWidgetConfig,
} from "./config";
import { PhiHeaderNavigationWidget } from "./server";

export const PHI_HEADER_NAVIGATION_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsHeaderNavigationWidgetConfig> = {
  ...PHI_HEADER_NAVIGATION_WIDGET_DEFINITION,
  render: ({ widget, runtime, regionConfig, config }) => (
    <PhiHeaderNavigationWidget
      key={`widget-${widget.id}`}
      runtime={runtime}
      navKey={config.navKey ?? `${runtime.area}:header`}
      height={regionConfig?.size?.height ?? undefined}
      align={config.align}
      interactive={true}
    />
  ),
  renderPreview: ({ widget, runtime, regionConfig, config }) => (
    <PhiHeaderNavigationWidget
      key={`widget-${widget.id}`}
      runtime={runtime}
      navKey={config.navKey ?? `${runtime.area}:header`}
      height={regionConfig?.size?.height ?? undefined}
      align={config.align}
      interactive={false}
    />
  ),
};
export { PHI_HEADER_NAVIGATION_WIDGET_PLUGIN_TYPE };
