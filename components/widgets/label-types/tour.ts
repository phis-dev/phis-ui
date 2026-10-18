import type { PhiTourLabels } from "../../../types/tours";

/** The words around every Tour, and the button that starts one. */
export type PhiTourWidgetLabels = PhiTourLabels & {
  /** The button's own word. */
  button: string;
  /** What pressing it does, as its tooltip. */
  start: string;
};

export const PHI_TOUR_WIDGET_DEFAULT_LABELS: PhiTourWidgetLabels = {
  next: "Next",
  previous: "Back",
  finish: "Done",
  button: "Tour",
  start: "Show the tour of this page",
};
