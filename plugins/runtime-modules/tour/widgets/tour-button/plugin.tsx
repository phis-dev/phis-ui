import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PHI_TOUR_BUTTON_WIDGET_DEFINITION, type PhiTourButtonWidgetConfig } from "./config";
import { PhiTourButtonWidgetServer } from "./server";

export const PHI_TOUR_BUTTON_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiTourButtonWidgetConfig> = {
  ...PHI_TOUR_BUTTON_WIDGET_DEFINITION,
  render: ({ config, runtime }) => <PhiTourButtonWidgetServer config={config} runtime={runtime} />,
  renderPreview: ({ config, runtime }) => <PhiTourButtonWidgetServer config={config} runtime={runtime} preview />,
};
