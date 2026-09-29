import { createPhiCmsBuilderWidgetPlugin } from "../../../../../plugins/factories/widget-builder-plugin";
import { PhiSpacerWidget } from "./client";
import { PHI_SPACER_WIDGET_DEFINITION } from "./config";

export const PHI_SPACER_WIDGET_BUILDER_PLUGIN = createPhiCmsBuilderWidgetPlugin<Record<string, never>>(
  PHI_SPACER_WIDGET_DEFINITION,
  ({ config }) => <PhiSpacerWidget config={config} />,
);
