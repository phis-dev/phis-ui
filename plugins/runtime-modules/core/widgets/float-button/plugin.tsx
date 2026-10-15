import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { filterPhiCommandButtonsForViewer } from "../../../../../components/widgets/config/command-buttons";
import { getPhiCommonControlLabelsForRuntime } from "../../../../../components/widgets/label-sets/common-controls";
import {
  PHI_FLOAT_BUTTON_WIDGET_DEFINITION,
  type PhiFloatButtonWidgetConfig,
} from "./config";

export const PHI_FLOAT_BUTTON_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiFloatButtonWidgetConfig> = {
  ...PHI_FLOAT_BUTTON_WIDGET_DEFINITION,
  render: async ({ widget, config, runtime, registry }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.FloatButton}
      componentProps={{
        blockId: widget.id,
        config: {
          ...config,
          buttons: filterPhiCommandButtonsForViewer(
            config.buttons,
            runtime.viewer,
            registry?.roleProviderIdByWidgetType.get(widget.widgetType),
          ),
        },
        labels: await getPhiCommonControlLabelsForRuntime(runtime),
      }}
    />
  ),
  /* A preview shows the buttons where the Widget stands; fixed, they would float over whatever frames it. */
  renderPreview: async ({ widget, config, runtime, registry }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.FloatButton}
      componentProps={{
        blockId: widget.id,
        config: {
          ...config,
          buttons: filterPhiCommandButtonsForViewer(
            config.buttons,
            runtime.viewer,
            registry?.roleProviderIdByWidgetType.get(widget.widgetType),
          ),
        },
        labels: await getPhiCommonControlLabelsForRuntime(runtime),
        disabled: true,
        signalsEnabled: false,
        inPlace: true,
      }}
    />
  ),
};
