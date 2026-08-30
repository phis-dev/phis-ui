import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { PHI_SEGMENTED_WIDGET_DEFINITION, type PhiSegmentedWidgetConfig } from "./config";

export const PHI_SEGMENTED_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiSegmentedWidgetConfig> = {
  ...PHI_SEGMENTED_WIDGET_DEFINITION,
  render: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Segmented}
      componentProps={{ blockId: widget.id, config }}
    />
  ),
  renderPreview: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Segmented}
      componentProps={{ blockId: widget.id, config, signalsEnabled: false }}
    />
  ),
};
