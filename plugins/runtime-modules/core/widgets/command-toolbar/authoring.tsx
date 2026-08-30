"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiCommandToolbarWidget } from "./client";
import {
  PHI_COMMAND_TOOLBAR_WIDGET_DEFINITION,
  filterPhiCommandToolbarButtonsForViewer,
  type PhiCommandToolbarWidgetConfig,
} from "./config";
import { PHI_COMMON_CONTROL_DEFAULT_LABELS } from "../../../../../components/widgets/label-types/common-controls";
import { PhiCommandToolbarAuthoringTools } from "../../../../../components/widgets/builder/command-toolbar-authoring-tools";

export const PHI_COMMAND_TOOLBAR_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCommandToolbarWidgetConfig> = {
  ...PHI_COMMAND_TOOLBAR_WIDGET_DEFINITION,
  renderEditor: ({ widget, config, runtime, registry }) => (
    <PhiCommandToolbarWidget
      blockId={widget.id}
      config={{
        ...config,
        buttons: filterPhiCommandToolbarButtonsForViewer(
          config.buttons,
          runtime.viewer,
          registry?.roleProviderIdByWidgetType.get(widget.widgetType),
        ),
      }}
      labels={PHI_COMMON_CONTROL_DEFAULT_LABELS}
    />
  ),
  renderEditorTools: ({ config, authoring }) => authoring?.updateConfig ? (
    <PhiCommandToolbarAuthoringTools
      buttons={config.buttons}
      onChange={(buttons) => authoring.updateConfig?.({ buttons })}
    />
  ) : null,
};
