"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import type { PhiCmsCardWidgetConfig } from "./config";
import { PhiCardWidgetEditor } from "./editor";
import { PHI_CARD_WIDGET_DEFINITION } from "./config";

export const PHI_CARD_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsCardWidgetConfig> = {
  ...PHI_CARD_WIDGET_DEFINITION,
  // Its words are fields on the canvas, so a click there reaches them instead of only selecting the card.
  editorInteraction: "authoring",
  renderEditor: ({ config, authoring }) => (
    <PhiCardWidgetEditor config={config} {...(authoring?.updateConfig ? { onChange: authoring.updateConfig } : {})} />
  ),
};
