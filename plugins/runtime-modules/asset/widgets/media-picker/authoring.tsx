"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import type { PhiCmsMediaPickerWidgetConfig } from "../../../../../plugins/runtime-modules/asset/widgets/media-picker/config";
import { PHI_MEDIA_PICKER_WIDGET_DEFINITION } from "../../../../../plugins/runtime-modules/asset/widgets/media-picker/config";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";

export const PHI_MEDIA_PICKER_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsMediaPickerWidgetConfig> = {
  ...PHI_MEDIA_PICKER_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <PhiWidgetEditorPlaceholder
      widget={widget}
      pluginTitle={PHI_MEDIA_PICKER_WIDGET_DEFINITION.title}
      summary={`Media type ${config.mediaType ?? "image"}`}
    />
  ),
};
