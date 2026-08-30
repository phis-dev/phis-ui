"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import type { PhiCmsCardWidgetConfig } from "./config";
import { PhiCardWidgetEditor } from "../../../../../components/widgets/client/card-editor";
import { PhiWidgetImageToolButton } from "../../../../../components/widgets/client/shared/phi-widget-image-tool-button";
import { PHI_CARD_WIDGET_DEFINITION } from "./config";

export const PHI_CARD_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsCardWidgetConfig> = {
  ...PHI_CARD_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <PhiCardWidgetEditor config={config} title={widget.label ?? undefined} />
  ),
  renderEditorTools: ({ widget, authoring }) => authoring?.updateConfig ? (
    <PhiWidgetImageToolButton blockId={widget.id} onChange={authoring.updateConfig} />
  ) : null,
};
