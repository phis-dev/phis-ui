import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiBuilderChromeControlsWidgetClient } from "./client";
import {
  PHI_BUILDER_CHROME_CONTROLS_WIDGET_DEFINITION,
  type PhiBuilderChromeControlsWidgetConfig,
} from "./config";

export const PHI_BUILDER_CHROME_CONTROLS_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiBuilderChromeControlsWidgetConfig> = {
  ...PHI_BUILDER_CHROME_CONTROLS_WIDGET_DEFINITION,
  renderEditor: ({ config }) => <PhiBuilderChromeControlsWidgetClient config={config} />,
};
