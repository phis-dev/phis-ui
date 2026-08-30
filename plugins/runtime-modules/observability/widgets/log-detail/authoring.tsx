"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import {
  PHI_OBSERVABILITY_LOG_DETAIL_WIDGET_DEFINITION,
  type PhiObservabilityLogDetailWidgetConfig,
} from "../../../../../plugins/runtime-modules/observability/widgets/log-detail/config";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";

export const PHI_OBSERVABILITY_LOG_DETAIL_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiObservabilityLogDetailWidgetConfig> = {
  ...PHI_OBSERVABILITY_LOG_DETAIL_WIDGET_DEFINITION,
  renderEditor: ({ widget }) => (
    <PhiWidgetEditorPlaceholder
      widget={widget}
      pluginTitle={PHI_OBSERVABILITY_LOG_DETAIL_WIDGET_DEFINITION.title}
      summary="The log detail opens when the connected Table emits its view action."
    />
  ),
};
