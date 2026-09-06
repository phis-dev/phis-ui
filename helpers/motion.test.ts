import { describe, expect, it } from "vitest";

import {
  PHI_MOTION_EASINGS,
  clampPhiSequenceTransitionMs,
  readPhiMotionEasing,
  resolvePhiMotionDurationMs,
} from "./motion";

/**
 * One list of curves and one range for how long a sequence takes to move.
 *
 * The curves used to exist three times over -- a union, a literal array in the Builder's effects form
 * and a chain of comparisons in the serializer -- which stays consistent exactly as long as nobody
 * adds a sixth.
 */

describe("the curves", () => {
  it("are CSS keywords, so the same word works in CSS and in the Web Animations API", () => {
    expect([...PHI_MOTION_EASINGS]).toEqual(["linear", "ease", "ease-in", "ease-out", "ease-in-out"]);
  });

  it("refuses a word it does not know rather than quietly using the theme's", () => {
    expect(readPhiMotionEasing("ease-in-out", undefined)).toBe("ease-in-out");
    expect(() => readPhiMotionEasing("cubic-bezier(0.2, 0, 0, 1)", undefined))
      .toThrow(/Invalid Phi motion easing/);
  });

  it("leaves an absent curve absent, which is not the same as a wrong one", () => {
    // Nothing was said, so the caller's own default stands. A free-form cubic-bezier would be a
    // sixth member of the list, not a value this function should let through unchecked.
    expect(readPhiMotionEasing(null, "linear")).toBe("linear");
    expect(readPhiMotionEasing(undefined, undefined)).toBeUndefined();
  });
});

describe("how long a sequence may take", () => {
  it("lifts anything below the floor, where a transition stops being one", () => {
    // Under a tenth of a second the eye reads a jump, and the animation only costs a frame nobody
    // sees -- so the floor is where the setting starts meaning something, not zero.
    expect(clampPhiSequenceTransitionMs(10)).toBe(100);
  });

  it("allows a very slow dissolve, because a display board is a real thing to build", () => {
    expect(clampPhiSequenceTransitionMs(600_000)).toBe(600_000);
    expect(clampPhiSequenceTransitionMs(900_000)).toBe(600_000);
  });

  it("refuses anything that is not a number instead of inventing one", () => {
    /*
     * Clamping is the stated rule; guessing is not. A duration written as "400" or left out of the
     * call entirely is a mistake in the document, and a Widget that animates anyway hides it -- the
     * page renders, nothing reports an error, and the motion is simply not what somebody wrote.
     */
    expect(() => clampPhiSequenceTransitionMs("400")).toThrow(/Expected a number/);
    expect(() => clampPhiSequenceTransitionMs(undefined)).toThrow(/Expected a number/);
    expect(() => clampPhiSequenceTransitionMs(Number.NaN)).toThrow(/Expected a number/);
  });
});

describe("reading a theme's duration token", () => {
  it("understands both units the tokens are written in", () => {
    expect(resolvePhiMotionDurationMs("0.3s")).toBeCloseTo(300);
    expect(resolvePhiMotionDurationMs("300ms")).toBe(300);
  });
});
