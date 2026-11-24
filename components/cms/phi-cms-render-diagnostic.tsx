"use client";

import { lazy, Suspense } from "react";

import type { PhiCmsRenderIssue } from "../../types/cms-plugins";
import { usePhiWidgetFailureStaff } from "../widgets/shared/widget-failure-audience";

/**
 * Lazy boundary for the render diagnostic. The layout renderer references the diagnostic from
 * the server graph on every route, so a direct implementation here would put its antd surface
 * (Alert, Typography) into every first load even though the diagnostic only ever renders for a
 * broken widget or layout. The boundary keeps that cost in an on-demand chunk.
 */
const PhiCmsRenderDiagnosticImplementation = lazy(async () => ({
  default: (await import("./phi-cms-render-diagnostic-client")).PhiCmsRenderDiagnostic,
}));

/**
 * `live` for a block that failed on a live page: drawn for Staff only (`usePhiWidgetFailureStaff`), in
 * its place and without the notification a workspace raises, and for a visitor not at all -- the chunk
 * is not even fetched.
 */
export function PhiCmsRenderDiagnostic({ issue, live = false }: { issue: PhiCmsRenderIssue; live?: boolean }) {
  const staff = usePhiWidgetFailureStaff();
  if (live && !staff) {
    return null;
  }
  return (
    <Suspense fallback={null}>
      <PhiCmsRenderDiagnosticImplementation issue={issue} quiet={live} />
    </Suspense>
  );
}
