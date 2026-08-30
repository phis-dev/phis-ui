import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { PHI_SWITCH_WIDGET_DEFINITION, type PhiSwitchWidgetConfig } from "./config";

export const PHI_SWITCH_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiSwitchWidgetConfig> = {
  ...PHI_SWITCH_WIDGET_DEFINITION,
  render: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Switch}
      componentProps={{ blockId: widget.id, config }}
    />
  ),
  renderPreview: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Switch}
      componentProps={{
        blockId: widget.id,
        config,
        disabled: true,
        signalsEnabled: false,
      }}
    />
  ),
};
