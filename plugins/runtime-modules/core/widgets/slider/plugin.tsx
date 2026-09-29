import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import {
  PHI_SLIDER_WIDGET_DEFINITION,
  type PhiSliderWidgetConfig,
} from "./config";

export const PHI_SLIDER_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiSliderWidgetConfig> = {
  ...PHI_SLIDER_WIDGET_DEFINITION,
  render: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Slider}
      componentProps={{ blockId: widget.id, config }}
    />
  ),
  renderPreview: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Slider}
      componentProps={{ blockId: widget.id, config, signalsEnabled: false }}
    />
  ),
};
