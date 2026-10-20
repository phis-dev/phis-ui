export type PhiGalleryWidgetLabels = {
  previous: string;
  next: string;
  /** `%1` and `%2` are the first and last picture the page shows. */
  page: string;
  pause: string;
  play: string;
  /** The box's name for a screen reader, which calls it a carousel. */
  region: string;
  pages: string;
  unavailable: string;
};

export const PHI_GALLERY_WIDGET_DEFAULT_LABELS: PhiGalleryWidgetLabels = {
  previous: "Previous",
  next: "Next",
  page: "Show pictures %1 to %2",
  pause: "Pause",
  play: "Play",
  region: "Pictures",
  pages: "Choose pictures",
  unavailable: "The pictures could not be read.",
};
