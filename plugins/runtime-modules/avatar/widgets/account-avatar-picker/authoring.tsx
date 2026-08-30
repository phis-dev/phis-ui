"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import type { PhiCmsPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";
import { PHI_ACCOUNT_AVATAR_PICKER_WIDGET_DEFINITION } from "../../../../../plugins/runtime-modules/avatar/widgets/account-avatar-picker/config";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";

export const PHI_ACCOUNT_AVATAR_PICKER_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsPaddingOnlyWidgetConfig> = {
  ...PHI_ACCOUNT_AVATAR_PICKER_WIDGET_DEFINITION,
  renderEditor: ({ widget }) => (
    <PhiWidgetEditorPlaceholder
      widget={widget}
      pluginTitle={PHI_ACCOUNT_AVATAR_PICKER_WIDGET_DEFINITION.title}
      summary="Uploads a picture into the viewer's own Media Space."
    />
  ),
};
