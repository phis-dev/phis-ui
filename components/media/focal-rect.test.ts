import { describe, expect, it } from "vitest";

import { resolveFocalRectInCoverCrop, resolveFocalRectObjectPositionForFrame } from "./focal-rect";

/**
 * A variant cropped again keeps its focus.
 *
 * The server crops the original around its focal rectangle to the variant's proportion; a card that
 * shows the variant in a flatter box crops it once more, and that second crop is positioned by where the
 * focal rectangle stands inside the variant.
 */
describe("the focal rectangle inside a variant", () => {
  it("is where the original's focus landed in the crop", () => {
    // A 3000x2000 original, focus in the right third, cropped to a square.
    const rect = resolveFocalRectInCoverCrop(3000, 2000, 400, 400, { x: 0.7, y: 0.4, width: 0.1, height: 0.2 });

    // The 2000x2000 crop is pushed to the right edge, so the focus sits right of the variant's middle.
    expect(rect.x).toBeCloseTo((2100 - 1000) / 2000);
    expect(rect.width).toBeCloseTo(300 / 2000);
    expect(rect.y).toBeCloseTo(0.4);
    expect(rect.height).toBeCloseTo(0.2);
  });

  it("stays inside the variant where the crop cut the focus", () => {
    const rect = resolveFocalRectInCoverCrop(3000, 1000, 100, 100, { x: 0.0, y: 0.0, width: 1, height: 1 });

    expect(rect.x).toBe(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(1);
  });
});

/**
 * A box of known proportion shows the focal rectangle whole.
 *
 * Centring on the rectangle's centre cut the crown off a head in the top quarter of a portrait shown in
 * a wide frame; with the frame's proportion the crop is known and can start at the top instead.
 */
describe("the position of a cover crop in a frame of known proportion", () => {
  it("starts at the top where the focus sits near the top and fits", () => {
    // A 500x660 portrait, the head in the top 27%, in a 16:9 frame: the crop is 281 tall and holds the head.
    expect(resolveFocalRectObjectPositionForFrame(500, 660, 16 / 9, { x: 0.36, y: 0.01, width: 0.26, height: 0.26 })).toBe("50% 0%");
  });

  it("centres on the focus where the crop cannot hold all of it", () => {
    // The whole picture is the focus: nothing to prefer, so the crop sits in the middle -- to the pixel
    // the crop is cut at, which is why the share is a tenth off the exact half.
    expect(resolveFocalRectObjectPositionForFrame(500, 660, 16 / 9, { x: 0, y: 0, width: 1, height: 1 })).toBe("50% 50.1%");
  });

  it("moves sideways for a wide picture in a tall frame", () => {
    expect(resolveFocalRectObjectPositionForFrame(3000, 1000, 1, { x: 0.8, y: 0.2, width: 0.1, height: 0.5 })).toBe("100% 50%");
  });

  it("answers nothing without a proportion or a size", () => {
    expect(resolveFocalRectObjectPositionForFrame(500, 660, null, { x: 0, y: 0, width: 1, height: 1 })).toBeNull();
    expect(resolveFocalRectObjectPositionForFrame(null, 660, 16 / 9, null)).toBeNull();
  });
});
