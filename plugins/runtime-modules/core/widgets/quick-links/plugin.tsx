import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiQuickLinksWidget } from "./server";
import {
  PHI_QUICK_LINKS_WIDGET_DEFINITION,
  PHI_QUICK_LINKS_WIDGET_PLUGIN_TYPE,
  type PhiCmsQuickLinksWidgetConfig,
} from "./config";

export const PHI_QUICK_LINKS_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsQuickLinksWidgetConfig> = {
  ...PHI_QUICK_LINKS_WIDGET_DEFINITION,
  render: ({ widget, runtime, config }) => (
    <PhiQuickLinksWidget
      key={`widget-${widget.id}`}
      runtime={runtime}
      navKey={config.navKey}
      title={config.title}
      columns={config.columns}
      separator={config.separator}
    />
  ),
  renderPreview: ({ widget, runtime, config }) => (
    <PhiQuickLinksWidget
      key={`widget-${widget.id}`}
      runtime={runtime}
      navKey={config.navKey}
      title={config.title}
      columns={config.columns}
      separator={config.separator}
      interactive={false}
    />
  ),
};

export { PHI_QUICK_LINKS_WIDGET_PLUGIN_TYPE };
