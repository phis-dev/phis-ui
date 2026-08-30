import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import {
  PHI_NUMBER_INPUT_WIDGET_DEFINITION,
  PHI_NUMBER_INPUT_WIDGET_PLUGIN_TYPE,
  type PhiNumberInputWidgetConfig,
} from "./config";

export const PHI_NUMBER_INPUT_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiNumberInputWidgetConfig> = {
  ...PHI_NUMBER_INPUT_WIDGET_DEFINITION,
  render: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.NumberInput}
      componentProps={{ blockId: widget.id, config }}
    />
  ),
  renderPreview: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.NumberInput}
      componentProps={{ blockId: widget.id, config, signalsEnabled: false }}
    />
  ),
};

export { PHI_NUMBER_INPUT_WIDGET_PLUGIN_TYPE };
