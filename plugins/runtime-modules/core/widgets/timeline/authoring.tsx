"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiTimelineWidget } from "./client";
import { PHI_TIMELINE_WIDGET_DEFINITION, type PhiTimelineWidgetConfig } from "./config";
import { PhiStaticTimelineToolButton } from "../../../../../components/widgets/builder/phi-static-timeline-picker";

export const PHI_TIMELINE_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiTimelineWidgetConfig> = {
  ...PHI_TIMELINE_WIDGET_DEFINITION,
  renderEditor: ({ widget, config, runtime }) => (
    <PhiTimelineWidget blockId={widget.id} config={config} locale={runtime.locale.current} showProviderErrors />
  ),
  /* The Widget's own entries, only while no Provider answers in their place. */
  renderEditorTools: ({ config, authoring }) => authoring?.updateConfig && !config.entriesProvider ? (
    <PhiStaticTimelineToolButton
      entries={config.entries}
      onApply={(entries) => authoring.updateConfig?.({ entries })}
    />
  ) : null,
};
