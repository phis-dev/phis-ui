import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { renderPhiWidgetPreviewPlaceholder } from "../../../../../plugins/factories/widget-renderers";
import type { PhiCmsAssetInspectorWidgetConfig } from "./config";
import { PhiAssetConfigWidgetServer } from "./server";
import {
  PHI_IMAGE_INSPECTOR_WIDGET_DEFINITION,
} from "./config";

export const PHI_IMAGE_INSPECTOR_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsAssetInspectorWidgetConfig> = {
  ...PHI_IMAGE_INSPECTOR_WIDGET_DEFINITION,
  render: ({ widget, runtime, config }) => (
    <PhiAssetConfigWidgetServer key={`widget-${widget.id}`} runtime={runtime} config={config} />
  ),
  renderPreview: ({ widget }) => renderPhiWidgetPreviewPlaceholder(widget),
};
