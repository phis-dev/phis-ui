import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { PHI_STEPS_WIDGET_DEFINITION, type PhiStepsWidgetConfig } from "./config";

/*
 * The steps' titles and the lines under them arrive translated (server-helpers/cms-widget-texts.ts); the
 * values stay as they are, they are what the steps send. Steps that follow a Stack take their titles
 * from its slots at runtime, and those are the Stack's to translate.
 */
export const PHI_STEPS_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiStepsWidgetConfig> = {
  ...PHI_STEPS_WIDGET_DEFINITION,
  render: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Steps}
      componentProps={{ blockId: widget.id, config }}
    />
  ),
  renderPreview: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Steps}
      componentProps={{ blockId: widget.id, config, signalsEnabled: false }}
    />
  ),
};
