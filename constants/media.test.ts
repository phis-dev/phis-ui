import { describe, expect, it } from "vitest";

import {
  PhiMediaDeliveryPolicy,
  PhiMediaLifecycleStatus,
  isPhiMediaAssetOriginalOptimizable,
  isPhiMediaSvgContentType,
} from "./media";

const publicAsset = {
  deliveryPolicy: PhiMediaDeliveryPolicy.Public,
  lifecycleStatus: PhiMediaLifecycleStatus.Ready,
};

describe("isPhiMediaSvgContentType", () => {
  it("recognises SVG in any spelling, and only SVG", () => {
    expect(isPhiMediaSvgContentType("image/svg+xml")).toBe(true);
    expect(isPhiMediaSvgContentType(" Image/SVG+XML; charset=utf-8 ")).toBe(true);
    expect(isPhiMediaSvgContentType("image/png")).toBe(false);
    expect(isPhiMediaSvgContentType(null)).toBe(false);
  });
});

describe("isPhiMediaAssetOriginalOptimizable", () => {
  it("lets the optimiser serve a public raster original", () => {
    expect(isPhiMediaAssetOriginalOptimizable({ ...publicAsset, contentType: "image/jpeg" })).toBe(true);
  });

  it("keeps a public SVG original away from the optimiser, which refuses the type", () => {
    expect(isPhiMediaAssetOriginalOptimizable({ ...publicAsset, contentType: "image/svg+xml" })).toBe(false);
  });

  it("keeps a restricted original away from the optimiser whatever its type", () => {
    expect(isPhiMediaAssetOriginalOptimizable({
      deliveryPolicy: PhiMediaDeliveryPolicy.Authenticated,
      lifecycleStatus: PhiMediaLifecycleStatus.Ready,
      contentType: "image/jpeg",
    })).toBe(false);
  });
});
