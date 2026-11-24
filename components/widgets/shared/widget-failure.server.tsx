import "server-only";

import { logPhiWidgetFailure, type PhiWidgetFailureProps } from "./widget-failure";
import { PhiWidgetFailureNotice } from "./widget-failure-notice-client";

/**
 * A Widget's data or configuration failure, decided while the page is drawn on the server.
 *
 * The warning is written here, during the render, because this render happens once per request and on
 * the machine whose log an operator reads. The card is the browser's to draw or leave out, which knows
 * whether the viewer is Staff (`PhiWidgetFailureNotice`). See `PhiWidgetFailureProps` for what counts and
 * who sees it.
 */
export function PhiWidgetFailureServer(props: PhiWidgetFailureProps) {
  logPhiWidgetFailure(props);
  const { error: _logged, ...notice } = props;
  return <PhiWidgetFailureNotice {...notice} />;
}
