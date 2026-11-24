"use client";

import type { PhiWidgetFailureProps } from "./widget-failure";
import { usePhiWidgetFailureStaff } from "./widget-failure-audience";
import { renderPhiWidgetFailureNotice } from "./widget-failure-notice";

/**
 * The card for a failure the server decided and has already written down (`PhiWidgetFailureServer`):
 * drawn here because only the browser's side of the page knows whether the viewer is Staff.
 */
export function PhiWidgetFailureNotice(props: Omit<PhiWidgetFailureProps, "error">) {
  return renderPhiWidgetFailureNotice(props, usePhiWidgetFailureStaff());
}
