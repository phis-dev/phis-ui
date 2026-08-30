import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import {
  PHI_CHECKBOX_GROUP_WIDGET_DEFINITION,
  PHI_CHECKBOX_GROUP_WIDGET_PLUGIN_TYPE,
  type PhiCheckboxGroupWidgetConfig,
} from "./config";

export const PHI_CHECKBOX_GROUP_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCheckboxGroupWidgetConfig> = {
  ...PHI_CHECKBOX_GROUP_WIDGET_DEFINITION,
  render: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.CheckboxGroup}
      componentProps={{ blockId: widget.id, config }}
    />
  ),
  renderPreview: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.CheckboxGroup}
      componentProps={{ blockId: widget.id, config, signalsEnabled: false }}
    />
  ),
};

export { PHI_CHECKBOX_GROUP_WIDGET_PLUGIN_TYPE };
