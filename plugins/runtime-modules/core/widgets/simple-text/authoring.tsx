"use client";

import { lazy, Suspense } from "react";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PHI_SIMPLE_TEXT_WIDGET_DEFINITION, type PhiCmsSimpleTextWidgetConfig } from "./config";

const PhiSimpleTextWidgetEditorPluginBody = lazy(async () => ({
  default: (await import("../../../../../components/widgets/builder/simple-text-editor")).PhiSimpleTextWidgetEditorPluginBody,
}));

const PhiSimpleTextWidgetEditorPluginTools = lazy(async () => ({
  default: (await import("../../../../../components/widgets/builder/simple-text-editor")).PhiSimpleTextWidgetEditorPluginTools,
}));

export const PHI_SIMPLE_TEXT_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsSimpleTextWidgetConfig> = {
  ...PHI_SIMPLE_TEXT_WIDGET_DEFINITION,
  editorInteraction: "authoring",
  renderEditor: ({ widget, config, authoring }) => (
    <Suspense fallback={null}>
      <PhiSimpleTextWidgetEditorPluginBody
        label={widget.label}
        config={config}
        onChange={authoring?.updateConfig}
      />
    </Suspense>
  ),
  renderEditorTools: ({ config, authoring }) => authoring?.updateConfig ? (
    <Suspense fallback={null}>
      <PhiSimpleTextWidgetEditorPluginTools config={config} onChange={authoring.updateConfig} />
    </Suspense>
  ) : null,
};
