import "server-only";

import { logPhiWidgetFailure, renderPhiWidgetFailureNotice, type PhiWidgetFailureProps } from "./widget-failure";

/**
 * A Widget's data or configuration failure, decided while the page is drawn on the server.
 *
 * The warning is written here, during the render, because this render happens once per request and on
 * the machine whose log an operator reads. See `PhiWidgetFailureProps` for what counts and who sees it.
 */
export function PhiWidgetFailureServer(props: PhiWidgetFailureProps) {
  logPhiWidgetFailure(props);
  return renderPhiWidgetFailureNotice(props);
}
