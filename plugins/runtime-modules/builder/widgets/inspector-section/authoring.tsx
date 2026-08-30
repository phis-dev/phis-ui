"use client";

import type { PhiCmsBuilderWidgetPlugin, PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiBuilderChromeWidgetConfig } from "../chrome/config";

export function createPhiBuilderInspectorSectionWidgetBuilderPlugin(
  definition: Omit<PhiCmsWidgetPlugin<PhiBuilderChromeWidgetConfig>, "render" | "renderPreview">,
): PhiCmsBuilderWidgetPlugin<PhiBuilderChromeWidgetConfig> {
  return {
    ...definition,
    renderEditor: () => null,
  };
}
