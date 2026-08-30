import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import type { PhiCmsImageWidgetConfig } from "./config";
import { PhiImageWidgetServer } from "./server";
import { PHI_IMAGE_WIDGET_DEFINITION, PHI_IMAGE_WIDGET_PLUGIN_TYPE } from "./config";

export const PHI_IMAGE_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsImageWidgetConfig> = {
  ...PHI_IMAGE_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers(({ widget, runtime, config }) => (
    <PhiImageWidgetServer
      key={`widget-${widget.id}`}
      runtime={runtime}
      widget={widget}
      config={config}
    />
  )),
};

export { PHI_IMAGE_WIDGET_PLUGIN_TYPE };
