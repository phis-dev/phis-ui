import { describe, expect, it } from "vitest";

import { resolvePhiSequenceWindowStart } from "./phi-sequence-viewport";

/**
 * Where the window sits.
 *
 * Once more than one item is visible, "active" stops being a single thing: there is what somebody is
 * looking at and there is what the window stands on. The anchor is the answer to which of the two an
 * index means, and it is the decision that has to be made rather than discovered -- a pager whose
 * fifth dot puts item five on the left behaves differently from one that centres it, and neither is
 * wrong until somebody has said which.
 */

function start(activeIndex: number, visibleCount: number, itemCount: number, anchor: "start" | "center") {
  return resolvePhiSequenceWindowStart({ activeIndex, visibleCount, itemCount, anchor });
}

describe("anchored at the start", () => {
  it("puts the active item at the leading edge", () => {
    expect(start(3, 3, 10, "start")).toBe(3);
  });

  it("stops the window at the tail instead of hanging it off the end", () => {
    // Otherwise the last item sits beside empty space, which reads as a broken layout rather than as
    // the end of a list.
    expect(start(9, 3, 10, "start")).toBe(7);
  });
});

describe("anchored at the centre", () => {
  it("keeps the active item in the middle of the window", () => {
    expect(start(4, 3, 10, "center")).toBe(3);
  });

  it("gives an even window the seat left of centre", () => {
    expect(start(4, 4, 10, "center")).toBe(3);
  });

  it("still stops at both ends", () => {
    expect(start(0, 3, 10, "center")).toBe(0);
    expect(start(9, 3, 10, "center")).toBe(7);
  });
});

describe("degenerate sequences", () => {
  it("stays at zero when there is nothing to show", () => {
    expect(start(4, 3, 0, "start")).toBe(0);
  });

  it("shows what there is when the window is wider than the sequence", () => {
    expect(start(1, 5, 2, "start")).toBe(0);
  });
});
