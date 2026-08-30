"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import type { PhiCmsAreaUploadWidgetConfig } from "../../../../../plugins/runtime-modules/asset/widgets/area-upload/config";
import { PHI_AREA_UPLOAD_WIDGET_DEFINITION } from "../../../../../plugins/runtime-modules/asset/widgets/area-upload/config";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";

export const PHI_AREA_UPLOAD_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsAreaUploadWidgetConfig> = {
  ...PHI_AREA_UPLOAD_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <PhiWidgetEditorPlaceholder
      widget={widget}
      pluginTitle={PHI_AREA_UPLOAD_WIDGET_DEFINITION.title}
      summary={config.folderPath ? `Folder: ${config.folderPath}` : "Builder preview for the area upload wall."}
    />
  ),
};
