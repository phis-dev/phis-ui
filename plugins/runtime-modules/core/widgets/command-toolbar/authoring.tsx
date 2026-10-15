"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiCommandToolbarWidget } from "./client";
import {
  PHI_COMMAND_TOOLBAR_BUTTON_BOUNDS,
  PHI_COMMAND_TOOLBAR_WIDGET_DEFINITION,
  type PhiCommandToolbarWidgetConfig,
} from "./config";
import { filterPhiCommandButtonsForViewer } from "../../../../../components/widgets/config/command-buttons";
import { PHI_COMMON_CONTROL_DEFAULT_LABELS } from "../../../../../components/widgets/label-types/common-controls";
import { PhiCommandButtonsAuthoringTools } from "../../../../../components/widgets/client/shared/phi-command-buttons-authoring-tools";

export const PHI_COMMAND_TOOLBAR_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCommandToolbarWidgetConfig> = {
  ...PHI_COMMAND_TOOLBAR_WIDGET_DEFINITION,
  renderEditor: ({ widget, config, runtime, registry }) => (
    <PhiCommandToolbarWidget
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
    />
  ),
  renderEditorTools: ({ config, authoring }) => authoring?.updateConfig ? (
    <PhiCommandButtonsAuthoringTools
      buttons={config.buttons}
      bounds={PHI_COMMAND_TOOLBAR_BUTTON_BOUNDS}
      onChange={(buttons) => authoring.updateConfig?.({ buttons })}
    />
  ) : null,
};
