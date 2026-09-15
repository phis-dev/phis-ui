"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";
import {
  PHI_AUTH_METHODS_WIDGET_DEFINITION,
  type PhiCmsAuthMethodsWidgetConfig,
} from "./config";

/**
 * A placeholder, because what it offers is read from the Site's own configuration: which identity
 * providers are switched on is an operator's decision in the Admin, not an author's in the Builder.
 */
export const PHI_AUTH_METHODS_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsAuthMethodsWidgetConfig> = {
  ...PHI_AUTH_METHODS_WIDGET_DEFINITION,
  renderEditor: ({ widget }) => (
    <PhiWidgetEditorPlaceholder
      widget={widget}
      pluginTitle={PHI_AUTH_METHODS_WIDGET_DEFINITION.title}
      summary="The identity providers this Site is configured to accept."
    />
  ),
};
