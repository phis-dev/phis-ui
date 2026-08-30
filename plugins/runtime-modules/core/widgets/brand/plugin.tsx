import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiBrandWidget } from "./server";
import {
  PHI_BRAND_WIDGET_DEFINITION,
  PHI_BRAND_WIDGET_PLUGIN_TYPE,
  type PhiCmsBrandWidgetConfig,
} from "./config";

export const PHI_BRAND_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsBrandWidgetConfig> = {
  ...PHI_BRAND_WIDGET_DEFINITION,
  render: ({ widget, runtime, config }) => (
    <PhiBrandWidget
      key={`widget-${widget.id}`}
      runtime={runtime}
      fallbackTitle={config.fallbackTitle}
      fallbackEyebrow={config.fallbackEyebrow}
      showLogo={config.showLogo}
      logoYOffset={config.logoYOffset}
    />
  ),
  renderPreview: ({ widget, runtime, config }) => (
    <PhiBrandWidget
      key={`widget-${widget.id}`}
      runtime={runtime}
      fallbackTitle={config.fallbackTitle}
      fallbackEyebrow={config.fallbackEyebrow}
      showLogo={config.showLogo}
      logoYOffset={config.logoYOffset}
      interactive={false}
    />
  ),
};

export { PHI_BRAND_WIDGET_PLUGIN_TYPE };
