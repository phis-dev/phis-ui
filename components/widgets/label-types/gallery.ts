import type { PhiSequenceControlLabels } from "./sequence";

export type PhiGalleryWidgetLabels = PhiSequenceControlLabels & {
  unavailable: string;
  /** What the Gallery shows where it has no picture to show. */
  empty: string;
  /** The Builder canvas's hint under a Gallery whose Folder is chosen. */
  canvasFolder: string;
  /** The Builder canvas's hint under a Gallery whose Folder is not chosen yet. */
  canvasNoFolder: string;
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
  empty: "No pictures yet",
  canvasFolder: "The public pictures of the chosen media folder, read when the page is drawn.",
  canvasNoFolder: "No folder chosen yet. Pick one in the inspector; its public pictures are read when the page is drawn.",
};
