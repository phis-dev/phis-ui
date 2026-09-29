"use client";

import { createPhiCmsBuilderWidgetPlugin } from "../../../../../plugins/factories/widget-builder-plugin";
import type { PhiCmsAssetFocalRectWidgetConfig } from "../../../../../plugins/runtime-modules/asset/widgets/asset-focal-rect/config";
import { PHI_ASSET_FOCAL_RECT_WIDGET_DEFINITION } from "../../../../../plugins/runtime-modules/asset/widgets/asset-focal-rect/config";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";

export const PHI_ASSET_FOCAL_RECT_WIDGET_BUILDER_PLUGIN =
  createPhiCmsBuilderWidgetPlugin<PhiCmsAssetFocalRectWidgetConfig>(
    PHI_ASSET_FOCAL_RECT_WIDGET_DEFINITION,
    ({ widget }) => (
      <PhiWidgetEditorPlaceholder
        widget={widget}
        pluginTitle={PHI_ASSET_FOCAL_RECT_WIDGET_DEFINITION.title}
        summary="Authoring preview for the Asset focal rectangle editor."
      />
    ),
  );
