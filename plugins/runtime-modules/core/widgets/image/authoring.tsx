"use client";

import { lazy, Suspense } from "react";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import type { PhiCmsImageWidgetConfig } from "./config";
import { PHI_IMAGE_WIDGET_DEFINITION } from "./config";

const PhiImageWidgetEditor = lazy(async () => ({
  default: (await import("../../../../../components/widgets/client/image-editor")).PhiImageWidgetEditor,
}));

const PhiImageWidgetEditorTools = lazy(async () => ({
  default: (await import("../../../../../components/widgets/client/image-editor")).PhiImageWidgetEditorTools,
}));

export const PHI_IMAGE_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsImageWidgetConfig> = {
  ...PHI_IMAGE_WIDGET_DEFINITION,
  renderEditor: ({ config, authoring }) => (
    <Suspense fallback={null}>
      <PhiImageWidgetEditor config={config} onChange={authoring?.updateConfig} />
    </Suspense>
  ),
  renderEditorTools: ({ widget, config, authoring }) => authoring ? (
    <Suspense fallback={null}>
      <PhiImageWidgetEditorTools blockId={widget.id} config={config} onChange={authoring.updateConfig} />
    </Suspense>
  ) : null,
};
