"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiButtonWidget } from "./client";
import { PhiWidgetIconToolButton } from "../../../../../components/widgets/client/shared/phi-widget-tool-buttons";
import { PHI_BUTTON_WIDGET_DEFINITION, type PhiButtonWidgetConfig } from "./config";
import { PHI_COMMON_CONTROL_DEFAULT_LABELS } from "../../../../../components/widgets/label-types/common-controls";

export const PHI_BUTTON_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiButtonWidgetConfig> = {
  ...PHI_BUTTON_WIDGET_DEFINITION,
  renderEditor: ({ config }) => (
    <PhiButtonWidget config={config} labels={PHI_COMMON_CONTROL_DEFAULT_LABELS} />
  ),
  renderEditorTools: ({ config, authoring }) => authoring?.updateConfig ? (
    <PhiWidgetIconToolButton
      value={config.icon ?? null}
      ariaLabel="Button icon"
      onChange={(icon) => authoring.updateConfig?.({ icon: icon ?? undefined })}
    />
  ) : null,
};
