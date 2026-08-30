import { createElement, type ReactNode } from "react";

import type { PhiCmsContentWidgetNode } from "../../types/cms";
import type { PhiCmsWidgetPluginRenderArgs } from "../../types";
import {
  PhiWidgetInertPreview,
  PhiWidgetPreviewFallback,
} from "../../components/widgets/built-in/widget-preview";

export function definePhiPassiveWidgetRenderers<TConfig>(
  renderer: (args: PhiCmsWidgetPluginRenderArgs<TConfig>) => ReactNode,
) {
  return {
    render: renderer,
    renderPreview: (args: PhiCmsWidgetPluginRenderArgs<TConfig>) =>
      createElement(PhiWidgetInertPreview, null, renderer(args)),
  };
}

export function renderPhiWidgetPreviewPlaceholder(
  widget: PhiCmsContentWidgetNode,
  summary = "This widget is inactive in preview mode.",
) {
  return createElement(PhiWidgetPreviewFallback, { widget, summary });
}
