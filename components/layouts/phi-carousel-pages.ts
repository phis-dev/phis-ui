/**
 * Where a Carousel stops, and which of those stops it is at.
 *
 * A window `span` slots wide moves a window at a time, so it stops at `0, span, 2 span, ...` -- except
 * that the last stop is the last window, `length - span`, not the last multiple of `span`: past it the
 * window would hang off the end. With five slots two at a time the stops are 0, 2 and 3.
 *
 * Both the dots and the arrows used to count in multiples of `span` instead. The current dot was
 * `floor(index / span)`, so at the last stop, 3, it named the second dot and the third could never be
 * current, although clicking it went there; and a looping forward step from 2 went back to 0, skipping
 * the last window altogether. Everything now reads the one list of stops.
 */
export function resolvePhiCarouselPageStarts(trackLength: number, span: number): number[] {
  const width = Math.max(1, span);
  const lastStart = Math.max(0, trackLength - width);
  const starts: number[] = [];
  for (let start = 0; start < lastStart; start += width) {
    starts.push(start);
  }
  starts.push(lastStart);
  return starts;
}

/**
 * The stop a position belongs to: the last one at or before it.
 *
 * A position need not be a stop -- a signal or a pager Widget may name any slot, and the window then
 * starts there -- and it belongs to the page whose window it has already entered.
 */
export function resolvePhiCarouselCurrentPage(pageStarts: readonly number[], trackIndex: number): number {
  let current = 0;
  pageStarts.forEach((start, page) => {
    if (start <= trackIndex) current = page;
  });
  return current;
}

/**
 * The position one step moves to: the next stop past the current position, or the one before it.
 *
 * Measured from the position rather than from its page, so a window a signal left between two stops
 * steps back to the stop it has passed rather than two windows at once. Past either end a looping
 * Carousel wraps to the other end and one that does not stays where it is.
 */
export function resolvePhiCarouselStep(
  pageStarts: readonly number[],
  trackIndex: number,
  direction: 1 | -1,
  loop: boolean,
): number {
  const first = pageStarts[0] ?? 0;
  const last = pageStarts[pageStarts.length - 1] ?? 0;
  if (direction > 0) {
    const next = pageStarts.find((start) => start > trackIndex);
    return next ?? (loop ? first : last);
  }
  const previous = [...pageStarts].reverse().find((start) => start < trackIndex);
  return previous ?? (loop ? last : first);
}
