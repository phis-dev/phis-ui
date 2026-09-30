import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { renderPhiWidgetPreviewPlaceholder } from "../../../../../plugins/factories/widget-renderers";
import type { PhiCmsAssetFocalRectWidgetConfig } from "./config";
import { PhiAssetFocalRectWidgetServer } from "./server";
import {
  PHI_ASSET_FOCAL_RECT_WIDGET_DEFINITION,
} from "./config";

export const PHI_ASSET_FOCAL_RECT_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsAssetFocalRectWidgetConfig> = {
  ...PHI_ASSET_FOCAL_RECT_WIDGET_DEFINITION,
  render: ({ widget, runtime, config }) => (
    <PhiAssetFocalRectWidgetServer key={`widget-${widget.id}`} runtime={runtime} config={config} />
  ),
  renderPreview: ({ widget }) => renderPhiWidgetPreviewPlaceholder(widget),
};
