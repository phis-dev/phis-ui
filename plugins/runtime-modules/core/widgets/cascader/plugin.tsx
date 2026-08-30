import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import {
  PHI_CASCADER_WIDGET_DEFINITION,
  type PhiCascaderWidgetConfig,
} from "./config";

export const PHI_CASCADER_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiCascaderWidgetConfig> = {
  ...PHI_CASCADER_WIDGET_DEFINITION,
  render: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Cascader}
      componentProps={{ blockId: widget.id, config }}
    />
  ),
  renderPreview: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Cascader}
      componentProps={{ blockId: widget.id, config, signalsEnabled: false }}
    />
  ),
};
