import { createPhiCmsBuilderWidgetPlugin } from "../../../../../plugins/factories/widget-builder-plugin";
import { PhiSpacerWidget } from "./client";
import { PHI_SPACER_WIDGET_DEFINITION, type PhiSpacerWidgetConfig } from "./config";

export const PHI_SPACER_WIDGET_BUILDER_PLUGIN = createPhiCmsBuilderWidgetPlugin<PhiSpacerWidgetConfig>(
  PHI_SPACER_WIDGET_DEFINITION,
  ({ config }) => <PhiSpacerWidget config={config} />,
);
