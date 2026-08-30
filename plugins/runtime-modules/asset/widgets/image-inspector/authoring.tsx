"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import type { PhiCmsAssetInspectorWidgetConfig } from "../../../../../plugins/runtime-modules/asset/widgets/image-inspector/config";
import { PHI_IMAGE_INSPECTOR_WIDGET_DEFINITION } from "../../../../../plugins/runtime-modules/asset/widgets/image-inspector/config";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";

export const PHI_IMAGE_INSPECTOR_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsAssetInspectorWidgetConfig> = {
  ...PHI_IMAGE_INSPECTOR_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <PhiWidgetEditorPlaceholder
      widget={widget}
      pluginTitle={PHI_IMAGE_INSPECTOR_WIDGET_DEFINITION.title}
      summary={config.scopeKey ? `Scope: ${config.scopeKey}` : "Builder preview for the asset inspector."}
    />
  ),
};
