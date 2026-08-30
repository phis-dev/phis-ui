"use client";

import { lazy, Suspense } from "react";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import type { PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import { PhiHtmlWidgetToolbarTools } from "../../../../../components/widgets/client/shared/phi-widget-tool-buttons";
import {
  PHI_HTML_WIDGET_DEFINITION,
  type PhiCmsHtmlWidgetConfig,
  type PhiHtmlWidgetRenderableConfig,
} from "./config";

const PhiHtmlWidgetEditor = lazy(async () => ({
  default: (await import("../../../../../components/widgets/client/html-editor")).PhiHtmlWidgetEditor,
}));
const PhiExternalDocumentEditor = lazy(async () => ({
  default: (await import("../../../../../components/widgets/client/external-document-editor")).PhiExternalDocumentEditor,
}));

export function renderPhiHtmlWidgetEditor(
  blockId: PhiCmsInstanceId,
  config: PhiHtmlWidgetRenderableConfig | undefined,
  onChange?: (html: string) => void,
  onSourceLocaleChange?: (sourceLocale: string) => void,
) {
  const sourceMode = config?.sourceMode ?? (config?.sourceUrl?.trim() ? "url" : "inline");
  return (
    <Suspense fallback={null}>
      {sourceMode === "url" ? (
        <PhiExternalDocumentEditor
          format="html"
          sourceUrl={config?.sourceUrl?.trim() ?? ""}
          sourceLocale={config?.sourceLocale?.trim()}
          onSourceLocaleChange={onSourceLocaleChange}
        />
      ) : (
        <PhiHtmlWidgetEditor
          blockId={blockId}
          html={config?.html ?? ""}
          fontFamily={config?.fontFamily ?? null}
          fontSize={config?.fontSize ?? null}
          onChange={onChange}
        />
      )}
    </Suspense>
  );
}

export const PHI_HTML_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsHtmlWidgetConfig> = {
  ...PHI_HTML_WIDGET_DEFINITION,
  editorInteraction: "authoring",
  renderEditor: ({ widget, config, authoring }) => renderPhiHtmlWidgetEditor(
    widget.id,
    config,
    authoring?.updateConfig ? (html) => authoring.updateConfig?.({ html }) : undefined,
    authoring?.updateConfig ? (sourceLocale) => authoring.updateConfig?.({ sourceLocale }) : undefined,
  ),
  renderEditorTools: ({ widget, config }) =>
    config?.sourceMode === "url" ? null : <PhiHtmlWidgetToolbarTools blockId={widget.id} />,
};
