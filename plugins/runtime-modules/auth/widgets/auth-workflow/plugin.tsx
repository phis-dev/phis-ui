import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { PhiRuntimeRenderClientType } from "../../../../../constants/runtime-render-client-types";
import {
  PHI_AUTH_WORKFLOW_WIDGET_DEFINITION,
  type PhiCmsAuthWorkflowWidgetConfig,
} from "./config";

function renderAuthWorkflow({
  widget,
  config,
}: Parameters<PhiCmsServerWidgetPlugin<PhiCmsAuthWorkflowWidgetConfig>["render"]>[0]) {
  return (
    <PhiRuntimeModuleRenderClientHost
      key={`widget-${widget.id}`}
      type={PhiRuntimeRenderClientType.AuthWorkflow}
      componentProps={{ signalRoutes: config.signalRoutes }}
    />
  );
}

export const PHI_AUTH_WORKFLOW_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsAuthWorkflowWidgetConfig> = {
  ...PHI_AUTH_WORKFLOW_WIDGET_DEFINITION,
  render: renderAuthWorkflow,
  renderPreview: renderAuthWorkflow,
};
