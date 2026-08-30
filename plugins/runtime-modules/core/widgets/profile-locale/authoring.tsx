"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import type { PhiCmsPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";
import { PHI_PROFILE_LOCALE_WIDGET_DEFINITION } from "./config";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";

export const PHI_PROFILE_LOCALE_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsPaddingOnlyWidgetConfig> = {
  ...PHI_PROFILE_LOCALE_WIDGET_DEFINITION,
  renderEditor: ({ widget }) => (
    <PhiWidgetEditorPlaceholder
      widget={widget}
      pluginTitle={PHI_PROFILE_LOCALE_WIDGET_DEFINITION.title}
      summary="Authenticated locale preference editor."
    />
  ),
};
