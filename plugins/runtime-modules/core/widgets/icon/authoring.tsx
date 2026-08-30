"use client";

import { lazy, Suspense } from "react";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PHI_ICON_WIDGET_DEFINITION, type PhiCmsIconWidgetConfig } from "./config";

const PhiIconWidgetEditor = lazy(async () => ({
  default: (await import("../../../../../components/widgets/builder/icon-editor")).PhiIconWidgetEditor,
}));

const PhiIconWidgetEditorTools = lazy(async () => ({
  default: (await import("../../../../../components/widgets/builder/icon-editor")).PhiIconWidgetEditorTools,
}));

export const PHI_ICON_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsIconWidgetConfig> = {
  ...PHI_ICON_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <Suspense fallback={null}>
      <PhiIconWidgetEditor blockId={widget.id} config={config} />
    </Suspense>
  ),
  renderEditorTools: ({ config, authoring }) => authoring?.updateConfig ? (
    <Suspense fallback={null}>
      <PhiIconWidgetEditorTools config={config} onChange={authoring.updateConfig} />
    </Suspense>
  ) : null,
};
