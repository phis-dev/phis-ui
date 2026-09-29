import { describe, expect, it } from "vitest";

import {
  resolvePhiCarouselCurrentPage,
  resolvePhiCarouselPageStarts,
  resolvePhiCarouselStep,
} from "./phi-carousel-pages";

/*
 * The last window is a stop of its own. Counted in multiples of the window, five slots two at a time
 * had a third dot that could be clicked but never shown as current.
 */
describe("where a Carousel stops", () => {
  it("stops a window at a time and at the last window", () => {
    expect(resolvePhiCarouselPageStarts(5, 2)).toEqual([0, 2, 3]);
    expect(resolvePhiCarouselPageStarts(6, 2)).toEqual([0, 2, 4]);
    expect(resolvePhiCarouselPageStarts(3, 1)).toEqual([0, 1, 2]);
  });

  it("has one stop when everything fits", () => {
    expect(resolvePhiCarouselPageStarts(2, 3)).toEqual([0]);
    expect(resolvePhiCarouselPageStarts(0, 1)).toEqual([0]);
  });
});

describe("which stop is current", () => {
  const starts = resolvePhiCarouselPageStarts(5, 2);

  it("makes the last dot current at the last window", () => {
    expect(resolvePhiCarouselCurrentPage(starts, 3)).toBe(2);
  });

  it("names the page whose window a position between stops has entered", () => {
    expect(resolvePhiCarouselCurrentPage(starts, 0)).toBe(0);
    expect(resolvePhiCarouselCurrentPage(starts, 1)).toBe(0);
    expect(resolvePhiCarouselCurrentPage(starts, 2)).toBe(1);
  });
});

describe("where a step goes", () => {
  const starts = resolvePhiCarouselPageStarts(5, 2);

  it("walks the stops forwards and backwards", () => {
    expect(resolvePhiCarouselStep(starts, 0, 1, false)).toBe(2);
    expect(resolvePhiCarouselStep(starts, 2, 1, false)).toBe(3);
    expect(resolvePhiCarouselStep(starts, 3, -1, false)).toBe(2);
    expect(resolvePhiCarouselStep(starts, 2, -1, false)).toBe(0);
  });

  it("reaches the last window before it loops", () => {
    expect(resolvePhiCarouselStep(starts, 2, 1, true)).toBe(3);
    expect(resolvePhiCarouselStep(starts, 3, 1, true)).toBe(0);
    expect(resolvePhiCarouselStep(starts, 0, -1, true)).toBe(3);
  });

  it("stays at either end without a loop", () => {
    expect(resolvePhiCarouselStep(starts, 3, 1, false)).toBe(3);
    expect(resolvePhiCarouselStep(starts, 0, -1, false)).toBe(0);
  });

  it("steps from a position between stops to the neighbouring stops", () => {
    expect(resolvePhiCarouselStep(starts, 1, 1, false)).toBe(2);
    expect(resolvePhiCarouselStep(starts, 1, -1, false)).toBe(0);
  });
});
