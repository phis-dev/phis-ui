import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import {
  PHI_ICON_WIDGET_DEFINITION,
  PHI_ICON_WIDGET_PLUGIN_TYPE,
  type PhiCmsIconWidgetConfig,
} from "./config";
import { PhiIconWidget } from "./server";

export const PHI_ICON_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsIconWidgetConfig> = {
  ...PHI_ICON_WIDGET_DEFINITION,
  render: ({ widget, config, runtime }) => (
    <PhiIconWidget
      blockId={widget.id}
      config={config}
      runtime={runtime}
    />
  ),
  renderPreview: ({ widget, config, runtime }) => (
    <PhiIconWidget
      blockId={widget.id}
      config={{
        ...config,
        renderMode: "preview",
      }}
      runtime={runtime}
    />
  ),
};
export { PHI_ICON_WIDGET_PLUGIN_TYPE };
