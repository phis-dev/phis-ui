"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiDraftStatusWidget } from "./client";
import { PHI_DRAFT_STATUS_WIDGET_DEFINITION, type PhiDraftStatusWidgetConfig } from "./config";

export const PHI_DRAFT_STATUS_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiDraftStatusWidgetConfig> = {
  ...PHI_DRAFT_STATUS_WIDGET_DEFINITION,
  // Drawn, not wired: on the canvas it would ask the Controller of the Builder, not of the Page.
  renderEditor: ({ widget, config }) => (
    <PhiDraftStatusWidget blockId={widget.id} config={config} signalsEnabled={false} />
  ),
};
