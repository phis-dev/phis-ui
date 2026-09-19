"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";
import type { PhiRecordWidgetConfig } from "../../../../../types/record-widget";
import { PHI_RECORD_WIDGET_DEFINITION } from "./config";

export const PHI_RECORD_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiRecordWidgetConfig> = {
  ...PHI_RECORD_WIDGET_DEFINITION,
  renderEditor: ({ widget }) => (
    <PhiWidgetEditorPlaceholder
      widget={widget}
      pluginTitle={PHI_RECORD_WIDGET_DEFINITION.title}
      summary="The record fills when a connected Table emits its open action."
    />
  ),
};
