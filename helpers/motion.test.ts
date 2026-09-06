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

  it("falls back rather than passing an unknown word to an animation", () => {
    expect(readPhiMotionEasing("ease-in-out", undefined)).toBe("ease-in-out");
    expect(readPhiMotionEasing("cubic-bezier(0.2, 0, 0, 1)", undefined)).toBeUndefined();
    expect(readPhiMotionEasing(null, "linear")).toBe("linear");
  });
});

describe("how long a sequence may take", () => {
  it("lifts anything below the floor, where a transition stops being one", () => {
    // Under a tenth of a second the eye reads a jump, and the animation only costs a frame nobody
    // sees -- so the floor is where the setting starts meaning something, not zero.
    expect(clampPhiSequenceTransitionMs(10, 400)).toBe(100);
  });

  it("allows a very slow dissolve, because a display board is a real thing to build", () => {
    expect(clampPhiSequenceTransitionMs(600_000, 400)).toBe(600_000);
    expect(clampPhiSequenceTransitionMs(900_000, 400)).toBe(600_000);
  });

  it("takes the caller's fallback for anything that is not a number", () => {
    expect(clampPhiSequenceTransitionMs(undefined, 400)).toBe(400);
    expect(clampPhiSequenceTransitionMs("400", 400)).toBe(400);
    expect(clampPhiSequenceTransitionMs(Number.NaN, 400)).toBe(400);
  });
});

describe("reading a theme's duration token", () => {
  it("understands both units the tokens are written in", () => {
    expect(resolvePhiMotionDurationMs("0.3s")).toBeCloseTo(300);
    expect(resolvePhiMotionDurationMs("300ms")).toBe(300);
  });
});
