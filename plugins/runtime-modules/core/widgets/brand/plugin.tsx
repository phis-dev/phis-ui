import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiBrandWidget } from "./server";
import {
  PHI_BRAND_WIDGET_DEFINITION,
  PHI_BRAND_WIDGET_PLUGIN_TYPE,
  type PhiCmsBrandWidgetConfig,
} from "./config";

export const PHI_BRAND_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsBrandWidgetConfig> = {
  ...PHI_BRAND_WIDGET_DEFINITION,
  render: ({ widget, config }) => (
    <PhiBrandWidget
      key={`widget-${widget.id}`}
      fallbackTitle={config.fallbackTitle}
      fallbackEyebrow={config.fallbackEyebrow}
      showLogo={config.showLogo}
      logoYOffset={config.logoYOffset}
    />
  ),
  renderPreview: ({ widget, config }) => (
    <PhiBrandWidget
      key={`widget-${widget.id}`}
      fallbackTitle={config.fallbackTitle}
      fallbackEyebrow={config.fallbackEyebrow}
      showLogo={config.showLogo}
      logoYOffset={config.logoYOffset}
      interactive={false}
    />
  ),
};

export { PHI_BRAND_WIDGET_PLUGIN_TYPE };
