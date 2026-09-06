import { createPhiCmsBuilderWidgetPlugin } from "../../../../../plugins/factories/widget-builder-plugin";
import { PhiGalleryWidget } from "./client";
import {
  PHI_GALLERY_WIDGET_DEFINITION,
  PHI_GALLERY_WIDGET_PLUGIN_TYPE,
  type PhiCmsGalleryWidgetConfig,
} from "./config";

export const PHI_GALLERY_WIDGET_BUILDER_PLUGIN = createPhiCmsBuilderWidgetPlugin<PhiCmsGalleryWidgetConfig>(
  PHI_GALLERY_WIDGET_DEFINITION,
  ({ config }) => <PhiGalleryWidget config={config} />,
);

export { PHI_GALLERY_WIDGET_PLUGIN_TYPE };
