import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { PHI_COLOR_WIDGET_DEFINITION, type PhiColorWidgetConfig } from "./config";
import { getPhiColorPickerLabelsForRuntime } from "../../../../../components/widgets/label-sets/color-picker";

export const PHI_COLOR_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiColorWidgetConfig> = {
  ...PHI_COLOR_WIDGET_DEFINITION,
  render: async ({ widget, config, runtime }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Color}
      componentProps={{
        blockId: widget.id,
        config,
        labels: await getPhiColorPickerLabelsForRuntime(runtime),
      }}
    />
  ),
  renderPreview: async ({ widget, config, runtime }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Color}
      componentProps={{
        blockId: widget.id,
        config,
        labels: await getPhiColorPickerLabelsForRuntime(runtime),
        disabled: true,
        signalsEnabled: false,
      }}
    />
  ),
};
