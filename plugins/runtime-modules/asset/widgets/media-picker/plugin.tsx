import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { renderPhiWidgetPreviewPlaceholder } from "../../../../../plugins/factories/widget-renderers";
import type { PhiCmsMediaPickerWidgetConfig } from "./config";
import { PhiMediaPickerWidgetServer } from "../../../../../components/media/phi-media-picker-server";
import { PHI_MEDIA_PICKER_WIDGET_DEFINITION, PHI_MEDIA_PICKER_WIDGET_PLUGIN_TYPE } from "./config";

export const PHI_MEDIA_PICKER_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsMediaPickerWidgetConfig> = {
  ...PHI_MEDIA_PICKER_WIDGET_DEFINITION,
  render: ({ widget, runtime, config }) => (
    <PhiMediaPickerWidgetServer key={`widget-${widget.id}`} runtime={runtime} config={config} />
  ),
  renderPreview: ({ widget }) => renderPhiWidgetPreviewPlaceholder(widget),
};

export { PHI_MEDIA_PICKER_WIDGET_PLUGIN_TYPE };
