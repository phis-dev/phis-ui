"use client";

import type { ReactNode } from "react";

import type { PhiCmsContentWidgetNode } from "../../../types/cms";
import { PhiWidgetPreviewFallback } from "../built-in/widget-preview";

export type PhiWidgetEditorPlaceholderProps = {
  widget: PhiCmsContentWidgetNode;
  pluginTitle?: string | null;
  summary?: ReactNode;
  children?: ReactNode;
};

export function PhiWidgetEditorPlaceholder({
  widget,
  pluginTitle,
  summary,
  children,
}: PhiWidgetEditorPlaceholderProps) {
  return (
    <PhiWidgetPreviewFallback
      widget={widget}
      pluginTitle={pluginTitle}
      summary={summary}
    >
      {children}
    </PhiWidgetPreviewFallback>
  );
}
