import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import { PhiBreadcrumbWidget } from "./server";
import {
  PHI_BREADCRUMB_WIDGET_DEFINITION,
  PHI_BREADCRUMB_WIDGET_PLUGIN_TYPE,
  type PhiCmsBreadcrumbWidgetConfig,
} from "./config";

export const PHI_BREADCRUMB_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsBreadcrumbWidgetConfig> = {
  ...PHI_BREADCRUMB_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers(({ widget, runtime, config }) => (
    <PhiBreadcrumbWidget
      key={`widget-${widget.id}`}
      runtime={runtime}
      config={config}
    />
  )),
};

export { PHI_BREADCRUMB_WIDGET_PLUGIN_TYPE };
