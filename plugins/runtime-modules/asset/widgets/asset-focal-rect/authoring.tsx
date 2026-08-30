"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import type { PhiCmsAssetFocalRectWidgetConfig } from "../../../../../plugins/runtime-modules/asset/widgets/asset-focal-rect/config";
import { PHI_ASSET_FOCAL_RECT_WIDGET_DEFINITION } from "../../../../../plugins/runtime-modules/asset/widgets/asset-focal-rect/config";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";

export const PHI_ASSET_FOCAL_RECT_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsAssetFocalRectWidgetConfig> = {
  ...PHI_ASSET_FOCAL_RECT_WIDGET_DEFINITION,
  renderEditor: ({ widget }) => (
    <PhiWidgetEditorPlaceholder
      widget={widget}
      pluginTitle={PHI_ASSET_FOCAL_RECT_WIDGET_DEFINITION.title}
      summary="Authoring preview for the Asset focal rectangle editor."
    />
  ),
};
