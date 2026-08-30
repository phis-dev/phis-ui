import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PHI_AREA_MENU_WIDGET_DEFINITION, PHI_AREA_MENU_WIDGET_PLUGIN_TYPE } from "./config";
import { PhiAreaMenuWidget } from "./server";
import { PhiRuntimeRenderClientType } from "../../../../../constants/runtime-render-client-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";

export const PHI_AREA_MENU_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<Record<string, never>> = {
  ...PHI_AREA_MENU_WIDGET_DEFINITION,
  render: ({ widget, runtime }) => (
    <PhiAreaMenuWidget
      key={`widget-${widget.id}`}
      runtime={runtime}
    />
  ),
  renderPreview: ({ runtime }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.AreaMenuPreview}
      componentProps={{ locale: runtime.locale }}
    />
  ),
};
export { PHI_AREA_MENU_WIDGET_PLUGIN_TYPE };
