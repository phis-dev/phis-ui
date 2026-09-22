"use client";

import type { PhiBlockRuntime, PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiThemeModeSwitchWidget } from "./client";
import {
  PHI_THEME_MODE_SWITCH_WIDGET_DEFINITION,
  type PhiThemeModeSwitchWidgetConfig,
} from "./config";

export const PHI_THEME_MODE_SWITCH_WIDGET_BUILDER_PLUGIN:
  PhiCmsBuilderWidgetPlugin<PhiThemeModeSwitchWidgetConfig> = {
    ...PHI_THEME_MODE_SWITCH_WIDGET_DEFINITION,
    /*
     * Drawn, not armed: an author arranging a Page should see the switch in the mode they are working
     * in, and should not flip the whole Builder by dragging it into place.
     */
    renderEditor: ({ runtime, config }) => (
      <PhiThemeModeSwitchWidget
        runtime={runtime as PhiBlockRuntime}
        config={config}
        signalsEnabled={false}
      />
    ),
  };
