import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { PHI_SPACER_WIDGET_DEFINITION, type PhiSpacerWidgetConfig } from "./config";

export const PHI_SPACER_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiSpacerWidgetConfig> = {
  ...PHI_SPACER_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers(({ config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Spacer}
      componentProps={{ config }}
    />
  )),
};
