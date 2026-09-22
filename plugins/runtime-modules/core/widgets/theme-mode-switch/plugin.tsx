import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import {
  PHI_THEME_MODE_SWITCH_WIDGET_DEFINITION,
  type PhiThemeModeSwitchWidgetConfig,
} from "./config";

export const PHI_THEME_MODE_SWITCH_WIDGET_PLUGIN:
  PhiCmsServerWidgetPlugin<PhiThemeModeSwitchWidgetConfig> = {
    ...PHI_THEME_MODE_SWITCH_WIDGET_DEFINITION,
    render: ({ widget, config }) => (
      <PhiRuntimeModuleRenderClientHost
        type={PhiCmsWidgetType.ThemeModeSwitch}
        componentProps={{ blockId: widget.id, config }}
      />
    ),
    /*
     * A preview may not change the Site it is previewing. `signalsEnabled: false` is what stops the
     * flip from reaching the Controller; the switch still draws the mode, because that is read.
     */
    renderPreview: ({ widget, config }) => (
      <PhiRuntimeModuleRenderClientHost
        type={PhiCmsWidgetType.ThemeModeSwitch}
        componentProps={{
          blockId: widget.id,
          config,
          disabled: true,
          signalsEnabled: false,
        }}
      />
    ),
  };
