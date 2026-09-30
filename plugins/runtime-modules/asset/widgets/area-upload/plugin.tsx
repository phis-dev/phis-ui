import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { renderPhiWidgetPreviewPlaceholder } from "../../../../../plugins/factories/widget-renderers";
import type { PhiCmsAreaUploadWidgetConfig } from "../../../../../types/media";
import { PhiAreaUploadWidgetServer } from "./server";
import { PHI_AREA_UPLOAD_WIDGET_DEFINITION } from "./config";

export const PHI_AREA_UPLOAD_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsAreaUploadWidgetConfig> = {
  ...PHI_AREA_UPLOAD_WIDGET_DEFINITION,
  render: ({ widget, runtime, config }) => (
    <PhiAreaUploadWidgetServer key={`widget-${widget.id}`} runtime={runtime} config={config} />
  ),
  renderPreview: ({ widget }) => renderPhiWidgetPreviewPlaceholder(widget),
};
