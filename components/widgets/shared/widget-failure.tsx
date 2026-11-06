import { logRuntimeEvent } from "../../../net/log";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiRenderableBlockRenderMode } from "../../../types/renderable-block";
import { PhiAlertControl } from "../../controls/phi-alert-control";

/**
 * A Widget that cannot show what it was placed to show, because its data or its configuration failed:
 * the Provider it is bound to is not offered, the binding does not hold, the record cannot be read, the
 * renderer it names is gone, the read itself failed.
 *
 * Said to the person who can do something about it, as the renderer says an unrenderable block
 * (`renderCmsDiagnostic`). In the Builder that is the author, and the card stands in the Widget's own
 * place with the cause. On a live page -- a revision preview is one -- it is nobody: a visitor cannot
 * rebind a Provider, and a heading over an error, or over an empty frame, reads as a broken Site or as
 * one that published nothing. So the Widget is absent and the rest of the page stands. The warning is
 * written either way, which is where an operator finds it.
 *
 * What a visitor is meant to read -- a form's own answer, an empty state, a refusal addressed to them --
 * is content, not a failure, and does not come here.
 */
export type PhiWidgetFailureProps = {
  renderMode: PhiRenderableBlockRenderMode;
  /** The Widget type, as the log names it; the card does not, the author already knows what they placed. */
  widgetType: string;
  widgetId?: PhiCmsInstanceId | null;
  title: string;
  description?: string | null;
  /** What was thrown, for the log only; the card says `title` and `description`. */
  error?: unknown;
};

export const PHI_WIDGET_FAILURE_LOG_EVENT = "cms.widget.unavailable";

export function logPhiWidgetFailure({
  renderMode,
  widgetType,
  widgetId,
  title,
  description,
  error,
}: PhiWidgetFailureProps) {
  logRuntimeEvent("warn", PHI_WIDGET_FAILURE_LOG_EVENT, {
    message: `Widget "${widgetType}" is unavailable: ${title}${description ? ` ${description}` : ""}`,
    targetType: "widget",
    targetId: widgetId == null ? null : String(widgetId),
    error,
    meta: { widgetType, title, description: description ?? null, renderMode },
  });
}

/** The card itself, or nothing on a live page. Both variants draw through this, so they cannot drift. */
export function renderPhiWidgetFailureNotice({
  renderMode,
  widgetType,
  widgetId,
  title,
  description,
}: PhiWidgetFailureProps) {
  if (renderMode === "live") {
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
