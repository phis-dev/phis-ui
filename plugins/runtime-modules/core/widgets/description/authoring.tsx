"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiDescriptionWidgetEditor } from "../../../../../components/widgets/client/description-editor";
import { PhiDescriptionWidgetItemsToolButton } from "../../../../../components/widgets/client/shared/phi-widget-tool-buttons";
import { PHI_DESCRIPTION_WIDGET_DEFINITION, type PhiCmsDescriptionWidgetConfig } from "./config";

export const PHI_DESCRIPTION_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsDescriptionWidgetConfig> = {
  ...PHI_DESCRIPTION_WIDGET_DEFINITION,
  editorInteraction: "authoring",
  renderEditor: ({ config, authoring }) => (
    <PhiDescriptionWidgetEditor config={config} onChange={authoring?.updateConfig} />
  ),
  renderEditorTools: ({ config, authoring }) => authoring?.updateConfig ? (
    <PhiDescriptionWidgetItemsToolButton
      value={config.asideItems ?? null}
      onChange={(asideItems) => authoring.updateConfig?.({ asideItems })}
    />
  ) : null,
};
