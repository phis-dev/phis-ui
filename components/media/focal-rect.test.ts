import { describe, expect, it } from "vitest";

import { resolveFocalRectInCoverCrop } from "./focal-rect";

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
