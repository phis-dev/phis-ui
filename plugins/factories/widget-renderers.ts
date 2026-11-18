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

/**
 * The house placeholder in a Preview: the Widget's name and type, still.
 *
 * Drawn by the renderer for a Widget whose Preview policy is `visualPlaceholder`; a Widget does not
 * call it from a `renderPreview` of its own.
 */
export function renderPhiWidgetPreviewPlaceholder(
  widget: PhiCmsContentWidgetNode,
  pluginTitle?: string | null,
) {
  return createElement(PhiWidgetPreviewFallback, {
    widget,
    pluginTitle,
    summary: "This widget is inactive in preview mode.",
  });
}
