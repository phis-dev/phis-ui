import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import {
  PHI_RESULT_WIDGET_DEFINITION,
  PHI_RESULT_WIDGET_PLUGIN_TYPE,
  type PhiCmsResultWidgetConfig,
} from "./config";
import { PhiResultWidget } from "./server";

export const PHI_RESULT_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsResultWidgetConfig> = {
  ...PHI_RESULT_WIDGET_DEFINITION,
  render: ({ widget, config, runtime }) => (
    <PhiResultWidget
      key={`widget-${widget.id}`}
      config={config}
      runtime={runtime}
    />
  ),
  renderPreview: ({ widget, config, runtime }) => (
    <PhiResultWidget
      key={`widget-preview-${widget.id}`}
      config={{
        ...config,
        renderMode: "preview",
      }}
      runtime={runtime}
    />
  ),
};

export { PHI_RESULT_WIDGET_PLUGIN_TYPE };
