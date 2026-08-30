"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PHI_PROFILE_OVERVIEW_WIDGET_DEFINITION } from "./config";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";

export const PHI_PROFILE_OVERVIEW_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<Record<string, never>> = {
  ...PHI_PROFILE_OVERVIEW_WIDGET_DEFINITION,
  renderEditor: ({ widget }) => (
    <PhiWidgetEditorPlaceholder
      widget={widget}
      pluginTitle={PHI_PROFILE_OVERVIEW_WIDGET_DEFINITION.title}
      summary="Authenticated profile overview."
    />
  ),
};
