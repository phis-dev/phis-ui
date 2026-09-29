import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import {
  PHI_RATE_WIDGET_DEFINITION,
  type PhiRateWidgetConfig,
} from "./config";

export const PHI_RATE_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiRateWidgetConfig> = {
  ...PHI_RATE_WIDGET_DEFINITION,
  render: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Rate}
      componentProps={{ blockId: widget.id, config }}
    />
  ),
  renderPreview: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Rate}
      componentProps={{ blockId: widget.id, config, signalsEnabled: false }}
    />
  ),
};
