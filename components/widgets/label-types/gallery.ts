import type { PhiSequenceControlLabels } from "./sequence";

export type PhiGalleryWidgetLabels = PhiSequenceControlLabels & {
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
