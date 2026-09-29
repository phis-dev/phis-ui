"use client";

import { createPhiCmsBuilderWidgetPlugin } from "../../../../../plugins/factories/widget-builder-plugin";
import type { PhiCmsAreaUploadWidgetConfig } from "../../../../../plugins/runtime-modules/asset/widgets/area-upload/config";
import { PHI_AREA_UPLOAD_WIDGET_DEFINITION } from "../../../../../plugins/runtime-modules/asset/widgets/area-upload/config";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";

export const PHI_AREA_UPLOAD_WIDGET_BUILDER_PLUGIN =
  createPhiCmsBuilderWidgetPlugin<PhiCmsAreaUploadWidgetConfig>(
    PHI_AREA_UPLOAD_WIDGET_DEFINITION,
    ({ widget, config }) => (
      <PhiWidgetEditorPlaceholder
        widget={widget}
        pluginTitle={PHI_AREA_UPLOAD_WIDGET_DEFINITION.title}
        summary={config.folderPath
          ? `Folder: ${config.folderPath}`
          : "Builder preview for the area upload wall."}
      />
    ),
  );
