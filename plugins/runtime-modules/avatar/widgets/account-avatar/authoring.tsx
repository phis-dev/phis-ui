"use client";

import { createPhiCmsBuilderWidgetPlugin } from "../../../../../plugins/factories/widget-builder-plugin";
import type { PhiCmsPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";
import { PHI_ACCOUNT_AVATAR_WIDGET_DEFINITION } from "../../../../../plugins/runtime-modules/avatar/widgets/account-avatar/config";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";

export const PHI_ACCOUNT_AVATAR_WIDGET_BUILDER_PLUGIN =
  createPhiCmsBuilderWidgetPlugin<PhiCmsPaddingOnlyWidgetConfig>(
    PHI_ACCOUNT_AVATAR_WIDGET_DEFINITION,
    ({ widget }) => (
      <PhiWidgetEditorPlaceholder
        widget={widget}
        pluginTitle={PHI_ACCOUNT_AVATAR_WIDGET_DEFINITION.title}
        summary="The signed-in person's own picture, with a control to change it."
      />
    ),
  );
