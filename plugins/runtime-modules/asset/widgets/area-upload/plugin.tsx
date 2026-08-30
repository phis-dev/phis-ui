import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { renderPhiWidgetPreviewPlaceholder } from "../../../../../plugins/factories/widget-renderers";
import type { PhiCmsAreaUploadWidgetConfig } from "./config";
import { PhiAreaUploadWidgetServer } from "../../../../../components/media/phi-area-upload-server";
import { PHI_AREA_UPLOAD_WIDGET_DEFINITION, PHI_AREA_UPLOAD_WIDGET_PLUGIN_TYPE } from "./config";

export const PHI_AREA_UPLOAD_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsAreaUploadWidgetConfig> = {
  ...PHI_AREA_UPLOAD_WIDGET_DEFINITION,
  render: ({ widget, runtime, config }) => (
    <PhiAreaUploadWidgetServer key={`widget-${widget.id}`} runtime={runtime} config={config} />
  ),
  renderPreview: ({ widget }) => renderPhiWidgetPreviewPlaceholder(widget),
};

export { PHI_AREA_UPLOAD_WIDGET_PLUGIN_TYPE };
