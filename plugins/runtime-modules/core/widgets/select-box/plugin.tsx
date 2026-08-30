import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import {
  PHI_SELECT_BOX_WIDGET_DEFINITION,
  type PhiSelectBoxWidgetConfig,
} from "./config";

export const PHI_SELECT_BOX_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiSelectBoxWidgetConfig> = {
  ...PHI_SELECT_BOX_WIDGET_DEFINITION,
  render: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.SelectBox}
      componentProps={{ blockId: widget.id, config }}
    />
  ),
  renderPreview: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.SelectBox}
      componentProps={{ blockId: widget.id, config, signalsEnabled: false }}
    />
  ),
};
