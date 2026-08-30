"use client";

import { lazy, Suspense } from "react";

import type { PhiCmsRenderIssue } from "../../types/cms-plugins";

/**
 * Lazy boundary for the render diagnostic. The layout renderer references the diagnostic from
 * the server graph on every route, so a direct implementation here would put its antd surface
 * (Alert, Typography) into every first load even though the diagnostic only ever renders for a
 * broken widget or layout. The boundary keeps that cost in an on-demand chunk.
 */
const PhiCmsRenderDiagnosticImplementation = lazy(async () => ({
  default: (await import("./phi-cms-render-diagnostic-client")).PhiCmsRenderDiagnostic,
}));

export function PhiCmsRenderDiagnostic({ issue }: { issue: PhiCmsRenderIssue }) {
  return (
    <Suspense fallback={null}>
      <PhiCmsRenderDiagnosticImplementation issue={issue} />
    </Suspense>
  );
}
