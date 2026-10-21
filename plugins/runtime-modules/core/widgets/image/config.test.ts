import { describe, expect, it } from "vitest";

import { PhiImageAssetVariantKey } from "../../../../../constants/media";
import { normalizePhiImageWidgetConfig } from "./config";

describe("the Image's variant", () => {
  it("is the Card variant for an Asset that names none", () => {
    expect(normalizePhiImageWidgetConfig({ sourceKind: "asset", assetId: 1 }).variantKey)
      .toBe(PhiImageAssetVariantKey.Card);
  });

  it("stays the original where the Inspector chose Original", () => {
    expect(normalizePhiImageWidgetConfig({ sourceKind: "asset", assetId: 1, variantKey: null }).variantKey)
      .toBeNull();
  });
});
