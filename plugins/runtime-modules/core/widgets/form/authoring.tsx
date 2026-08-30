"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PHI_FORM_WIDGET_DEFINITION, type PhiCmsFormWidgetConfig } from "./config";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";

export const PHI_FORM_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsFormWidgetConfig> = {
  ...PHI_FORM_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <PhiWidgetEditorPlaceholder
      widget={widget}
      pluginTitle={PHI_FORM_WIDGET_DEFINITION.title}
      summary={config.formId ?? "Select a Preset Form in the Inspector."}
    />
  ),
};
