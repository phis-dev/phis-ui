"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PHI_TOUR_WIDGET_DEFAULT_LABELS } from "../../../../../components/widgets/label-types/tour";
import { PhiTourButtonWidget } from "./client";
import { PHI_TOUR_BUTTON_WIDGET_DEFINITION, type PhiTourButtonWidgetConfig } from "./config";

export const PHI_TOUR_BUTTON_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiTourButtonWidgetConfig> = {
  ...PHI_TOUR_BUTTON_WIDGET_DEFINITION,
  // Drawn, not armed: placing the button must not start a Tour of the Builder.
  renderEditor: ({ config }) => (
    <PhiTourButtonWidget config={config} labels={PHI_TOUR_WIDGET_DEFAULT_LABELS} signalsEnabled={false} />
  ),
};
