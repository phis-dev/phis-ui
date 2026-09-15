"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";
import {
  PHI_FORM_PREVIEW_WIDGET_DEFINITION,
  type PhiCmsFormPreviewWidgetConfig,
} from "./config";

/**
 * A placeholder, because there is nothing to preview without a token.
 *
 * What this Widget shows is whatever a confirmation link turns out to be about, and a link is something
 * a visitor arrives with -- never something an author has while placing it. Standing in for it with an
 * invented record would show the Builder a page that cannot occur.
 */
export const PHI_FORM_PREVIEW_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsFormPreviewWidgetConfig> = {
  ...PHI_FORM_PREVIEW_WIDGET_DEFINITION,
  renderEditor: ({ widget }) => (
    <PhiWidgetEditorPlaceholder
      widget={widget}
      pluginTitle={PHI_FORM_PREVIEW_WIDGET_DEFINITION.title}
      summary="Shows what the token in the address is about, once a visitor arrives with one."
    />
  ),
};
