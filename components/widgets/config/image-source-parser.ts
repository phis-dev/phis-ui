import { normalizePhiImageAssetVariantKey } from "../../../constants/media";
import type { PhiMediaImageSourceConfig } from "../../../types/media";
import { readNumber, readString } from "./parser-primitives";

export function readPhiImageSourceKind(value: unknown): "url" | "asset" {
  return readString(value) === "asset" ? "asset" : "url";
}

export function readPhiImageVariantKey(value: unknown) {
  return normalizePhiImageAssetVariantKey(value);
}

export function readPhiMediaImageSourceConfig(
  value: Record<string, unknown>,
): PhiMediaImageSourceConfig {
  if (readPhiImageSourceKind(value.sourceKind) === "asset") {
    return {
      sourceKind: "asset",
      assetId: readNumber(value.assetId),
      variantKey: readPhiImageVariantKey(value.variantKey),
      variantVersion: readNumber(value.variantVersion),
    };
  }

  return {
    sourceKind: "url",
    sourceUrl: readString(value.sourceUrl),
  };
}
