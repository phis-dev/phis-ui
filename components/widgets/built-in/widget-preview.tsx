"use client";

import { lazy, Suspense, type ReactNode } from "react";

import type { PhiWidgetPreviewFallbackProps } from "./widget-preview-client";

export type { PhiWidgetPreviewFallbackProps } from "./widget-preview-client";

export function PhiWidgetInertPreview({ children }: { children: ReactNode }) {
  return (
    <div inert style={{ width: "100%", minWidth: 0 }}>
      {children}
    </div>
  );
}

/**
 * Lazy boundary for the widget preview fallback. Widget plugin definitions reference the
 * preview from the server graph of every Area catalog, so a direct implementation here would
 * carry its antd surface (Skeleton, Typography) into every first load even though the preview
 * only renders while authoring. The boundary keeps that cost in an on-demand chunk.
 */
const PhiWidgetPreviewFallbackImplementation = lazy(async () => ({
  default: (await import("./widget-preview-client")).PhiWidgetPreviewFallback,
}));

export function PhiWidgetPreviewFallback(props: PhiWidgetPreviewFallbackProps) {
  return (
    <Suspense fallback={null}>
      <PhiWidgetPreviewFallbackImplementation {...props} />
    </Suspense>
  );
}
