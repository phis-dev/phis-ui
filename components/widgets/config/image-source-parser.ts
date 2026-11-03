import { normalizePhiImageAssetVariantKey } from "../../../constants/media";
import type { PhiMediaImageSourceConfig } from "../../../types/media";
import { createPhiConfigReader } from "./strict-config-reader";

/** Where an image comes from: an Asset of the Media library, or a URL. Strict: an unknown kind is an error. */
export function readPhiMediaImageSourceConfig(
  value: Record<string, unknown>,
): PhiMediaImageSourceConfig {
  const reader = createPhiConfigReader(value);
  if ((reader.oneOf("sourceKind", ["url", "asset"] as const) ?? "url") === "asset") {
    return {
      sourceKind: "asset",
      assetId: reader.number("assetId"),
      variantKey: normalizePhiImageAssetVariantKey(value.variantKey),
      variantVersion: reader.number("variantVersion"),
    };
  }

  return {
    sourceKind: "url",
    sourceUrl: reader.string("sourceUrl"),
  };
}
