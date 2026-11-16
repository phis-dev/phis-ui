import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { PHI_TIMELINE_WIDGET_DEFINITION, type PhiTimelineWidgetConfig } from "./config";

/*
 * The entries' own words arrive translated (server-helpers/cms-widget-texts.ts), the time among them: an
 * author writes "Yesterday" or "Spring 2026" as often as a date. A Provider's entries are its own to
 * translate, as an options Provider's are.
 */
export const PHI_TIMELINE_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiTimelineWidgetConfig> = {
  ...PHI_TIMELINE_WIDGET_DEFINITION,
  render: ({ widget, config, runtime }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Timeline}
      componentProps={{ blockId: widget.id, config, locale: runtime.locale.current }}
    />
  ),
  renderPreview: ({ widget, config, runtime }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Timeline}
      componentProps={{ blockId: widget.id, config, locale: runtime.locale.current }}
    />
  ),
};
