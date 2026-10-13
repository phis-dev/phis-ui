"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PHI_THEME_MODE_SWITCH_WIDGET_DEFAULT_LABELS } from "../../../../../components/widgets/label-types/theme-mode-switch";
import { PhiThemeModeSwitchWidget } from "./client";
import {
  PHI_THEME_MODE_SWITCH_WIDGET_DEFINITION,
  type PhiThemeModeSwitchWidgetConfig,
} from "./config";

export const PHI_THEME_MODE_SWITCH_WIDGET_BUILDER_PLUGIN:
  PhiCmsBuilderWidgetPlugin<PhiThemeModeSwitchWidgetConfig> = {
    ...PHI_THEME_MODE_SWITCH_WIDGET_DEFINITION,
    /*
     * Drawn, not armed: an author arranging a Page should see the button in the mode they are working
     * in, and should not flip the whole Builder by dragging it into place.
     */
    renderEditor: ({ config }) => (
      <PhiThemeModeSwitchWidget
        config={config}
        labels={PHI_THEME_MODE_SWITCH_WIDGET_DEFAULT_LABELS}
        signalsEnabled={false}
      />
    ),
  };
