"use client";

import { lazy, Suspense } from "react";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiMarkdownWidgetToolbarTools } from "../../../../../components/widgets/client/shared/phi-widget-tool-buttons";
import { PHI_MARKDOWN_WIDGET_DEFINITION, type PhiCmsMarkdownWidgetConfig } from "./config";

const PhiMarkdownWidgetEditor = lazy(async () => ({
  default: (await import("../../../../../components/widgets/client/markdown-editor")).PhiMarkdownWidgetEditor,
}));

export const PHI_MARKDOWN_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsMarkdownWidgetConfig> = {
  ...PHI_MARKDOWN_WIDGET_DEFINITION,
  editorInteraction: "authoring",
  renderEditor: ({ widget, config, authoring }) => (
    <Suspense fallback={null}>
      <PhiMarkdownWidgetEditor
        blockId={widget.id}
        config={config}
        onChange={authoring?.updateConfig ? (markdown) => authoring.updateConfig?.({ markdown }) : undefined}
        onSourceLocaleChange={authoring?.updateConfig
          ? (sourceLocale) => authoring.updateConfig?.({ sourceLocale })
          : undefined}
      />
    </Suspense>
  ),
  renderEditorTools: ({ widget, config }) => config?.sourceMode === "url"
    ? null
    : <PhiMarkdownWidgetToolbarTools blockId={widget.id} />,
};
