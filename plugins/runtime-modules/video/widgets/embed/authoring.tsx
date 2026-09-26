"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";
import { PHI_VIDEO_EMBED_WIDGET_DEFINITION, type PhiVideoEmbedWidgetConfig } from "./config";

export const PHI_VIDEO_EMBED_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiVideoEmbedWidgetConfig> = {
  ...PHI_VIDEO_EMBED_WIDGET_DEFINITION,
  /*
   * A placeholder rather than the live Widget, because the Builder canvas is not where a request should
   * leave for a provider. The Inspector's own fields are the editing surface; what the Widget looks like
   * is what the preview is for.
   */
  renderEditor: ({ widget }) => (
    <PhiWidgetEditorPlaceholder
      widget={widget}
      pluginTitle={PHI_VIDEO_EMBED_WIDGET_DEFINITION.title}
      summary="Paste the address of the video. A visitor sees a still and a button, and nothing is fetched until they press it."
    />
  ),
};
