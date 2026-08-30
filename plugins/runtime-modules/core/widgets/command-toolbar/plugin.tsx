import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import {
  PHI_COMMAND_TOOLBAR_WIDGET_DEFINITION,
  filterPhiCommandToolbarButtonsForViewer,
  type PhiCommandToolbarWidgetConfig,
} from "./config";
import { getPhiCommonControlLabelsForRuntime } from "../../../../../components/widgets/label-sets/common-controls";

export const PHI_COMMAND_TOOLBAR_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiCommandToolbarWidgetConfig> = {
  ...PHI_COMMAND_TOOLBAR_WIDGET_DEFINITION,
  render: async ({ widget, config, runtime, registry }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.CommandToolbar}
      componentProps={{
        blockId: widget.id,
        config: {
          ...config,
          buttons: filterPhiCommandToolbarButtonsForViewer(
            config.buttons,
            runtime.viewer,
            registry?.roleProviderIdByWidgetType.get(widget.widgetType),
          ),
        },
        labels: await getPhiCommonControlLabelsForRuntime(runtime),
      }}
    />
  ),
  renderPreview: async ({ widget, config, runtime, registry }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.CommandToolbar}
      componentProps={{
        blockId: widget.id,
        config: {
          ...config,
          buttons: filterPhiCommandToolbarButtonsForViewer(
            config.buttons,
            runtime.viewer,
            registry?.roleProviderIdByWidgetType.get(widget.widgetType),
          ),
        },
        labels: await getPhiCommonControlLabelsForRuntime(runtime),
        disabled: true,
        signalsEnabled: false,
      }}
    />
  ),
};
