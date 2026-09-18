"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import type { PhiCmsPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";
import { PHI_THREAD_COMPOSER_WIDGET_DEFINITION } from "./config";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";

export const PHI_THREAD_COMPOSER_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsPaddingOnlyWidgetConfig> = {
  ...PHI_THREAD_COMPOSER_WIDGET_DEFINITION,
  // Nothing to author: which conversation it writes into is a runtime answer, not a Builder one.
  renderEditor: ({ widget }) => (
    <PhiWidgetEditorPlaceholder
      widget={widget}
      pluginTitle={PHI_THREAD_COMPOSER_WIDGET_DEFINITION.title}
      summary="Writes into the conversation the page has selected."
    />
  ),
};
