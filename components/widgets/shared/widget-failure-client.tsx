"use client";

import { useEffect, useEffectEvent } from "react";

import { logPhiWidgetFailure, renderPhiWidgetFailureNotice, type PhiWidgetFailureProps } from "./widget-failure";

/**
 * A Widget's data or configuration failure, found in the browser -- a Provider the Area does not offer,
 * a read that failed after hydration.
 *
 * The warning is written from an effect, once for each distinct failure while the Widget stays mounted:
 * a Client re-renders for reasons that have nothing to do with the failure, and a line per render would
 * bury the one that matters. See `PhiWidgetFailureProps` for what counts and who sees it.
 */
export function PhiWidgetFailure(props: PhiWidgetFailureProps) {
  const { renderMode, widgetType, widgetId, title, description } = props;
  // `error` is read, not watched: it is a new object whenever the same failure is raised again.
  const log = useEffectEvent(() => logPhiWidgetFailure(props));
  useEffect(() => {
    log();
  }, [description, renderMode, title, widgetId, widgetType]);
  return renderPhiWidgetFailureNotice(props);
}
