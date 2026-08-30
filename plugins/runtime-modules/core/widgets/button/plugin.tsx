import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { PHI_BUTTON_WIDGET_DEFINITION, type PhiButtonWidgetConfig } from "./config";
import { getPhiCommonControlLabelsForRuntime } from "../../../../../components/widgets/label-sets/common-controls";

export const PHI_BUTTON_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiButtonWidgetConfig> = {
  ...PHI_BUTTON_WIDGET_DEFINITION,
  render: async ({ widget, config, runtime }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Button}
      componentProps={{
        blockId: widget.id,
        config,
        labels: await getPhiCommonControlLabelsForRuntime(runtime),
      }}
    />
  ),
  renderPreview: async ({ widget, config, runtime }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Button}
      componentProps={{
        blockId: widget.id,
        config,
        labels: await getPhiCommonControlLabelsForRuntime(runtime),
        disabled: true,
        signalsEnabled: false,
      }}
    />
  ),
};
