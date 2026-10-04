import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import {
  PHI_DATE_INPUT_WIDGET_DEFINITION,
  type PhiDateInputWidgetConfig,
} from "./config";

export const PHI_DATE_INPUT_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiDateInputWidgetConfig> = {
  ...PHI_DATE_INPUT_WIDGET_DEFINITION,
  render: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.DateInput}
      componentProps={{ blockId: widget.id, config }}
    />
  ),
  renderPreview: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.DateInput}
      componentProps={{ blockId: widget.id, config, signalsEnabled: false }}
    />
  ),
};
