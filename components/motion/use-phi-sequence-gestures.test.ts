import { describe, expect, it } from "vitest";

import { resolvePhiSwipeStep } from "./use-phi-sequence-gestures";

describe("what counts as a swipe", () => {
  it("moves forward on a finger going left, and back on one going right", () => {
    expect(resolvePhiSwipeStep(-80, 4)).toBe(1);
    expect(resolvePhiSwipeStep(80, -4)).toBe(-1);
  });

  it("leaves a tap and a short drag alone", () => {
    expect(resolvePhiSwipeStep(0, 0)).toBeNull();
    expect(resolvePhiSwipeStep(-39, 0)).toBeNull();
    expect(resolvePhiSwipeStep(-40, 0)).toBe(1);
  });

  it("leaves a scroll to the page, however far it went sideways", () => {
    expect(resolvePhiSwipeStep(-60, 90)).toBeNull();
    expect(resolvePhiSwipeStep(-60, -60)).toBeNull();
  });
});
