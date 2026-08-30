import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import {
  PHI_CHECKBOX_WIDGET_DEFINITION,
  PHI_CHECKBOX_WIDGET_PLUGIN_TYPE,
  type PhiCheckboxWidgetConfig,
} from "./config";

export const PHI_CHECKBOX_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCheckboxWidgetConfig> = {
  ...PHI_CHECKBOX_WIDGET_DEFINITION,
  render: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Checkbox}
      componentProps={{ blockId: widget.id, config }}
    />
  ),
  renderPreview: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Checkbox}
      componentProps={{ blockId: widget.id, config, signalsEnabled: false }}
    />
  ),
};

export { PHI_CHECKBOX_WIDGET_PLUGIN_TYPE };
