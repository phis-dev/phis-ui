import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import {
  PHI_MULTI_SELECT_WIDGET_DEFINITION,
  type PhiMultiSelectWidgetConfig,
} from "./config";

export const PHI_MULTI_SELECT_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiMultiSelectWidgetConfig> = {
  ...PHI_MULTI_SELECT_WIDGET_DEFINITION,
  render: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.MultiSelect}
      componentProps={{ blockId: widget.id, config }}
    />
  ),
  renderPreview: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.MultiSelect}
      componentProps={{ blockId: widget.id, config, signalsEnabled: false }}
    />
  ),
};
