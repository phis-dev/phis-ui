import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { renderPhiWidgetPreviewPlaceholder } from "../../../../../plugins/factories/widget-renderers";
import {
  PHI_BUILDER_CHROME_CONTROLS_WIDGET_DEFINITION,
  type PhiBuilderChromeControlsWidgetConfig,
} from "./config";
import { PhiBuilderChromeControlsWidget } from "./server";

export const PHI_BUILDER_CHROME_CONTROLS_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiBuilderChromeControlsWidgetConfig> = {
  ...PHI_BUILDER_CHROME_CONTROLS_WIDGET_DEFINITION,
  render: ({ config }) => <PhiBuilderChromeControlsWidget config={config} />,
  renderPreview: ({ widget }) => renderPhiWidgetPreviewPlaceholder(widget),
};
