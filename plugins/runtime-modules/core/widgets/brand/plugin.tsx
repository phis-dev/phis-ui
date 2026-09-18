import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { resolvePhiBrandWordmarkText } from "../../../../../helpers/brand-wordmark";
import { PhiBrandWidget } from "./server";
import {
  PHI_BRAND_WIDGET_DEFINITION,
  PHI_BRAND_WIDGET_PLUGIN_TYPE,
  type PhiCmsBrandWidgetConfig,
} from "./config";

/*
 * What the Widget says when the Theme's Wordmark says nothing: this Site's name, read at render.
 *
 * It is resolved here rather than written into a Preset, because a Preset is followed by every Site
 * that adopts it and a name written there is one Site's. Filling it in made the Widget carry whatever
 * the Site happened to be called the moment its Preset was taken over -- a name that then stayed put
 * while the Site's own changed underneath it. `resolvePhiBrandWordmarkText` is the same order the rest
 * of the frame reads it in: the Theme's Wordmark, then the Site's name, then its key.
 */
export const PHI_BRAND_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsBrandWidgetConfig> = {
  ...PHI_BRAND_WIDGET_DEFINITION,
  render: ({ widget, config, runtime }) => (
    <PhiBrandWidget
      key={`widget-${widget.id}`}
      fallbackTitle={config.fallbackTitle ?? resolvePhiBrandWordmarkText(runtime)}
      fallbackEyebrow={config.fallbackEyebrow}
      mode={config.mode}
      line={config.line}
      showLogo={config.showLogo}
      logoYOffset={config.logoYOffset}
    />
  ),
  renderPreview: ({ widget, config, runtime }) => (
    <PhiBrandWidget
      key={`widget-${widget.id}`}
      fallbackTitle={config.fallbackTitle ?? resolvePhiBrandWordmarkText(runtime)}
      fallbackEyebrow={config.fallbackEyebrow}
      mode={config.mode}
      line={config.line}
      showLogo={config.showLogo}
      logoYOffset={config.logoYOffset}
      interactive={false}
    />
  ),
};

export { PHI_BRAND_WIDGET_PLUGIN_TYPE };
