"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";
import {
  PHI_AUTH_WORKFLOW_WIDGET_DEFINITION,
  type PhiCmsAuthWorkflowWidgetConfig,
} from "./config";

/**
 * A placeholder: this step exists only once a sign-in has asked for a second factor, so there is no
 * state an author could be shown here that is not invented.
 */
export const PHI_AUTH_WORKFLOW_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsAuthWorkflowWidgetConfig> = {
  ...PHI_AUTH_WORKFLOW_WIDGET_DEFINITION,
  renderEditor: ({ widget }) => (
    <PhiWidgetEditorPlaceholder
      widget={widget}
      pluginTitle={PHI_AUTH_WORKFLOW_WIDGET_DEFINITION.title}
      summary="Takes over when a sign-in needs a second factor."
    />
  ),
};
