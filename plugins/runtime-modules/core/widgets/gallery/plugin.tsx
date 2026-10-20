import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import {
  PHI_GALLERY_WIDGET_DEFINITION,
  type PhiCmsGalleryWidgetConfig,
} from "./config";
import { PhiGalleryWidgetServer } from "./server";

export const PHI_GALLERY_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsGalleryWidgetConfig> = {
  ...PHI_GALLERY_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers(({ widget, runtime, registry, config }) => (
    <PhiGalleryWidgetServer key={`widget-${widget.id}`} runtime={runtime} registry={registry} config={config} />
  )),
};
