/**
 * The words around a run that moves: its buttons, its dots, and its name for a screen reader.
 *
 * Every Widget that draws `PhiSequenceRun` brings them from its own Label Set, because what is being
 * stepped through is its own -- pictures in a Gallery, entries in a list -- and "Show pictures 1 to 3"
 * is not a sentence about News.
 */
export type PhiSequenceControlLabels = {
  previous: string;
  next: string;
  /** `%1` and `%2` are the first and last item the page shows. */
  page: string;
  pause: string;
  play: string;
  /** The box's name for a screen reader, which calls it a carousel. */
  region: string;
  pages: string;
};
