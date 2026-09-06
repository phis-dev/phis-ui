import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import {
  PHI_GALLERY_WIDGET_DEFINITION,
  PHI_GALLERY_WIDGET_PLUGIN_TYPE,
  type PhiCmsGalleryWidgetConfig,
} from "./config";

export const PHI_GALLERY_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsGalleryWidgetConfig> = {
  ...PHI_GALLERY_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers(({ config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Gallery}
      componentProps={{ config }}
    />
  )),
};

export { PHI_GALLERY_WIDGET_PLUGIN_TYPE };
