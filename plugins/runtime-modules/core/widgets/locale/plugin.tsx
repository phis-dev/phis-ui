import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiLocaleWidget } from "./server";
import { PHI_LOCALE_WIDGET_DEFINITION, PHI_LOCALE_WIDGET_PLUGIN_TYPE } from "./config";

export const PHI_LOCALE_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<Record<string, never>> = {
  ...PHI_LOCALE_WIDGET_DEFINITION,
  render: ({ widget, runtime }) => (
    <PhiLocaleWidget
      key={`widget-${widget.id}`}
      runtime={runtime}
      interactive={true}
    />
  ),
  renderPreview: ({ widget, runtime }) => (
    <PhiLocaleWidget
      key={`widget-${widget.id}`}
      runtime={runtime}
      interactive={false}
    />
  ),
};

export { PHI_LOCALE_WIDGET_PLUGIN_TYPE };
