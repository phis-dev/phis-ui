import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { renderPhiWidgetPreviewPlaceholder } from "../../../../../plugins/factories/widget-renderers";
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
  /*
   * A placeholder rather than the real body, as the account security Widget does: drawing it would start
   * an enrolment against Core from inside the Builder.
   */
  renderPreview: ({ widget }) => renderPhiWidgetPreviewPlaceholder(widget),
};
