import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { renderPhiWidgetPreviewPlaceholder } from "../../../../../plugins/factories/widget-renderers";
import { PHI_VIDEO_EMBED_WIDGET_DEFINITION, type PhiVideoEmbedWidgetConfig } from "./config";
import { PhiVideoEmbedWidgetServer } from "./server";

export const PHI_VIDEO_EMBED_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiVideoEmbedWidgetConfig> = {
  ...PHI_VIDEO_EMBED_WIDGET_DEFINITION,
  render: ({ runtime, config }) => <PhiVideoEmbedWidgetServer runtime={runtime} config={config} />,
  renderPreview: ({ widget }) => renderPhiWidgetPreviewPlaceholder(widget),
};
