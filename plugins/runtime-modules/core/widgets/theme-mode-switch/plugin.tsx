import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import {
  PHI_THEME_MODE_SWITCH_WIDGET_DEFINITION,
  type PhiThemeModeSwitchWidgetConfig,
} from "./config";
import { PhiThemeModeSwitchWidgetServer } from "./server";

export const PHI_THEME_MODE_SWITCH_WIDGET_PLUGIN:
  PhiCmsServerWidgetPlugin<PhiThemeModeSwitchWidgetConfig> = {
    ...PHI_THEME_MODE_SWITCH_WIDGET_DEFINITION,
    render: ({ widget, config, runtime }) => (
      <PhiThemeModeSwitchWidgetServer blockId={widget.id} config={config} runtime={runtime} />
    ),
    renderPreview: ({ widget, config, runtime }) => (
      <PhiThemeModeSwitchWidgetServer blockId={widget.id} config={config} runtime={runtime} preview />
    ),
  };
