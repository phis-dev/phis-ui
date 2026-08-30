import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import {
  PHI_INPUT_WIDGET_DEFINITION,
  PHI_INPUT_WIDGET_PLUGIN_TYPE,
  type PhiCmsInputWidgetConfig,
} from "./config";

export const PHI_INPUT_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsInputWidgetConfig> = {
  ...PHI_INPUT_WIDGET_DEFINITION,
  render: ({ widget, runtime, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Input}
      componentProps={{
        blockId: widget.id,
        runtime: { site: runtime.site, locale: runtime.locale, area: runtime.area },
        config,
      }}
    />
  ),
  renderPreview: ({ widget, runtime, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Input}
      componentProps={{
        blockId: widget.id,
        runtime: { site: runtime.site, locale: runtime.locale, area: runtime.area },
        config,
        signalsEnabled: false,
      }}
    />
  ),
};

export { PHI_INPUT_WIDGET_PLUGIN_TYPE };
