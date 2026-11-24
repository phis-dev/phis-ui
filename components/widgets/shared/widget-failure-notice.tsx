import { PhiAlertControl } from "../../controls/phi-alert-control";
import type { PhiWidgetFailureProps } from "./widget-failure";

/*
 * Apart from `widget-failure.tsx`, which writes the warning: the card is drawn in the browser for a
 * failure the server decided too (`PhiWidgetFailureNotice`), and that Client needs the card and not the
 * log writer.
 */

/**
 * The card itself, or nothing on a live page for anyone but Staff (`staff`, read from
 * `usePhiWidgetFailureStaff`). Both variants draw through this, so they cannot drift.
 */
export function renderPhiWidgetFailureNotice(
  { renderMode, widgetType, widgetId, title, description }: PhiWidgetFailureProps,
  staff: boolean,
) {
  if (renderMode === "live" && !staff) {
    return null;
  }
  return (
    <div
      data-phi-widget-failure={widgetType}
      data-phi-widget-failure-id={widgetId == null ? undefined : String(widgetId)}
    >
      <PhiAlertControl level="error" showIcon title={title} description={description ?? undefined} />
    </div>
  );
}
