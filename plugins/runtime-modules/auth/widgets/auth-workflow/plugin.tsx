import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import {
  PHI_AUTH_WORKFLOW_WIDGET_DEFINITION,
  type PhiCmsAuthWorkflowWidgetConfig,
} from "./config";
import { PhiAuthWorkflowWidget } from "./server";

export const PHI_AUTH_WORKFLOW_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsAuthWorkflowWidgetConfig> = {
  ...PHI_AUTH_WORKFLOW_WIDGET_DEFINITION,
  render: ({ runtime, config }) => (
    <PhiAuthWorkflowWidget runtime={runtime} signalRoutes={config.signalRoutes} />
  ),
};
