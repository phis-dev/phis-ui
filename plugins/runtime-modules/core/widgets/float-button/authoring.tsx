"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiFloatButtonWidget } from "./client";
import {
  PHI_FLOAT_BUTTON_BOUNDS,
  PHI_FLOAT_BUTTON_WIDGET_DEFINITION,
  type PhiFloatButtonWidgetConfig,
} from "./config";
import { filterPhiCommandButtonsForViewer } from "../../../../../components/widgets/config/command-buttons";
import { PHI_COMMON_CONTROL_DEFAULT_LABELS } from "../../../../../components/widgets/label-types/common-controls";
import { PhiCommandButtonsAuthoringTools } from "../../../../../components/widgets/client/shared/phi-command-buttons-authoring-tools";

export const PHI_FLOAT_BUTTON_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiFloatButtonWidgetConfig> = {
  ...PHI_FLOAT_BUTTON_WIDGET_DEFINITION,
  /* In its slot, not in the corner: fixed, it would float over the editor and could not be selected. */
  renderEditor: ({ widget, config, runtime, registry }) => (
    <PhiFloatButtonWidget
      blockId={widget.id}
      config={{
        ...config,
        buttons: filterPhiCommandButtonsForViewer(
          config.buttons,
          runtime.viewer,
          registry?.roleProviderIdByWidgetType.get(widget.widgetType),
        ),
      }}
      labels={PHI_COMMON_CONTROL_DEFAULT_LABELS}
      inPlace
    />
  ),
  renderEditorTools: ({ config, authoring }) => authoring?.updateConfig ? (
    <PhiCommandButtonsAuthoringTools
      buttons={config.buttons}
      bounds={PHI_FLOAT_BUTTON_BOUNDS}
      onChange={(buttons) => authoring.updateConfig?.({ buttons })}
    />
  ) : null,
};
