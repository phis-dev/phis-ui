import { describe, expect, it } from "vitest";

import { PhiImageAssetVariantKey } from "../../../constants/media";
import {
  resolvePhiCardImageVariantKey,
  resolvePhiCardMediaAspectRatioCss,
  resolvePhiCardMediaAspectRatioValue,
} from "./card-vocabulary";

describe("card picture proportion", () => {
  it("shows a Media picture as the Card variant when the box is that variant's proportion", () => {
    for (const mediaAspectRatio of [undefined, "auto", "3:2"] as const) {
      expect(resolvePhiCardImageVariantKey({ sourceKind: "asset", variantKey: null, mediaAspectRatio }))
        .toBe(PhiImageAssetVariantKey.Card);
    }
  });

  it("keeps a variant the card names, whatever the box", () => {
    expect(resolvePhiCardImageVariantKey({
      sourceKind: "asset",
      variantKey: PhiImageAssetVariantKey.Landscape,
      mediaAspectRatio: "1:1",
    })).toBe(PhiImageAssetVariantKey.Landscape);
  });

  it("shows the original for Original and for a box of another proportion, and nothing for an address", () => {
    expect(resolvePhiCardImageVariantKey({ sourceKind: "asset", variantKey: null, mediaAspectRatio: "original" })).toBeNull();
    expect(resolvePhiCardImageVariantKey({ sourceKind: "asset", variantKey: null, mediaAspectRatio: "16:9" })).toBeNull();
    expect(resolvePhiCardImageVariantKey({ sourceKind: "url", variantKey: null, mediaAspectRatio: "auto" })).toBeNull();
  });

  it("states a box only for a step", () => {
    expect(resolvePhiCardMediaAspectRatioCss("16:9")).toBe("16 / 9");
    expect(resolvePhiCardMediaAspectRatioValue("2:1")).toBe(2);
    expect(resolvePhiCardMediaAspectRatioCss("auto")).toBeNull();
    expect(resolvePhiCardMediaAspectRatioValue("original")).toBeNull();
    expect(resolvePhiCardMediaAspectRatioCss(undefined)).toBeNull();
  });
});
