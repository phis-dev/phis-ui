"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import type { PhiCmsPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";
import { PHI_AUTH_LOGOUT_WIDGET_DEFINITION } from "../../../../../plugins/runtime-modules/auth/widgets/logout/config";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";

export const PHI_AUTH_LOGOUT_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsPaddingOnlyWidgetConfig> = {
  ...PHI_AUTH_LOGOUT_WIDGET_DEFINITION,
  renderEditor: ({ widget }) => (
    <PhiWidgetEditorPlaceholder
      widget={widget}
      pluginTitle={PHI_AUTH_LOGOUT_WIDGET_DEFINITION.title}
      summary="Builder preview for the logout transition."
    />
  ),
};
