import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import {
  PHI_DATE_PICKER_WIDGET_DEFINITION,
  PHI_DATE_PICKER_WIDGET_PLUGIN_TYPE,
  type PhiDatePickerWidgetConfig,
} from "./config";

export const PHI_DATE_PICKER_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiDatePickerWidgetConfig> = {
  ...PHI_DATE_PICKER_WIDGET_DEFINITION,
  render: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.DatePicker}
      componentProps={{ blockId: widget.id, config }}
    />
  ),
  renderPreview: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.DatePicker}
      componentProps={{ blockId: widget.id, config, signalsEnabled: false }}
    />
  ),
};

export { PHI_DATE_PICKER_WIDGET_PLUGIN_TYPE };
