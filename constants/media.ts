/*
 * The bit values are the contract phis validates against, so they live in `@phis/contracts/media` and
 * are only carried through here, where the rest of the Media vocabulary already is.
 */
export { PhiMediaAssetFlags } from "@phis/contracts/media";
export type { PhiMediaAssetFlag } from "@phis/contracts/media";

/**
 * Where an Asset came from, kept in `meta.source`.
 *
 * Provenance, never purpose: it says who put the bytes there, while what an Asset is good for is the
 * flag's job. The two are apart because the list filter is an OR over the bit field and could not ask
 * for a purpose and an origin at once. An ordinary upload has no `source`; it needs no word of its own.
 *
 * Not in the contract package: phis stores `meta` and never reads it, so nothing outside the site UI
 * has to agree on these words yet.
 */
export const PhiMediaAssetSource = {
  /**
   * A picture that came with a Theme ground and was taken over when the Theme was saved.
   *
   * See `plugins/runtime-modules/theme/materialize-images.ts`: the ground a Module ships is copied into
   * the Site's own library at that moment, which is where an Asset gets the `Background` flag without
   * anybody choosing it.
   */
  ThemeGround: "theme-ground",
  /** A Logo a Theme Set offered, taken over when the Theme was saved. */
  ThemeBrandLogo: "theme-brand-logo",
  /** Fetched from the Iconify catalogue by the Mask picker. */
  Iconify: "iconify",
} as const;

import { PHI_FONT_SUBSET_VERSION, PhiMediaDeliveryPolicy, PhiMediaLifecycleStatus } from "@phis/contracts/media";

export { PhiMediaDeliveryPolicy, PhiMediaLifecycleStatus } from "@phis/contracts/media";

/*
 * Kind names, Folder flags and the image variant vocabulary are the contract, not this package's own:
 * they are carried through from `@phis/contracts/media`, where phis reads the same values. What stays
 * below belongs to the site UI alone -- how a delivery URL is built and what `next/image` may be handed.
 */
export {
  PhiImageAssetVariantKey,
  PhiImageAssetVariantKeyName,
  PhiMediaFolderFlags,
  PhiMediaKind,
  normalizePhiImageAssetVariantKey,
  normalizePhiMediaKind,
  resolvePhiImageAssetVariantKeyName,
  resolvePhiImageAssetVariantSpec,
  resolvePhiMediaKindFromContentType,
} from "@phis/contracts/media";
export type { PhiImageAssetVariantSpec } from "@phis/contracts/media";

export function isPhiMediaAssetPublic(
  deliveryPolicy: number | null | undefined,
  lifecycleStatus: number | null | undefined,
) {
  return deliveryPolicy === PhiMediaDeliveryPolicy.Public && lifecycleStatus === PhiMediaLifecycleStatus.Ready;
}

export function isPhiMediaSvgContentType(contentType: string | null | undefined) {
  return (contentType ?? "").trim().toLowerCase().split(";", 1)[0]!.trim() === "image/svg+xml";
}

/**
 * Whether `next/image` may be asked to optimise an Asset's original.
 *
 * The optimiser serves only public, ready Assets, and it refuses SVG outright ("image type is not
 * allowed") unless a Site enables `dangerouslyAllowSVG`, which nobody should for a format the optimiser
 * cannot improve. `next/image` recognises SVG by a `.svg` suffix on the URL alone, and our delivery URLs
 * end in `/content`, so the decision has to be taken here from the Asset's content type. Generated
 * variants are always raster and stay with `isPhiMediaAssetPublic`.
 */
export function isPhiMediaAssetOriginalOptimizable(asset: {
  deliveryPolicy: number | null | undefined;
  lifecycleStatus: number | null | undefined;
  contentType: string | null | undefined;
}) {
  return isPhiMediaAssetPublic(asset.deliveryPolicy, asset.lifecycleStatus)
    && !isPhiMediaSvgContentType(asset.contentType);
}

export function buildPhiImageAssetVariantDeliveryUrl(
  assetId: number,
  variantKey: number | null | undefined,
  variantVersion: number | null | undefined = 0,
  deliveryRevision?: number | null,
) {
  if (!Number.isInteger(assetId) || assetId <= 0 || typeof variantKey !== "number" || !Number.isInteger(variantKey)) {
    return null;
  }

  const normalizedVersion =
    typeof variantVersion === "number" && Number.isInteger(variantVersion) && variantVersion >= 0
      ? variantVersion
      : 0;

  const normalizedDeliveryRevision =
    typeof deliveryRevision === "number" && Number.isInteger(deliveryRevision) && deliveryRevision >= 0
      ? deliveryRevision
      : null;
  return `/api/site/media/${assetId}/variants/${variantKey}?v=${normalizedVersion}${
    normalizedDeliveryRevision == null ? "" : `&r=${normalizedDeliveryRevision}`
  }`;
}

/**
 * Where one unicode cut of a font Asset is delivered.
 *
 * The version travels so a changed cutting rule changes the address; the delivery revision so a cut
 * cached while the Asset was delivered under another policy stops being served, as for a rendition.
 */
export function buildPhiFontSubsetDeliveryUrl(assetId: number, subsetKey: number, deliveryRevision?: number | null) {
  if (!Number.isInteger(assetId) || assetId <= 0 || !Number.isInteger(subsetKey) || subsetKey < 0) return null;
  const revision = Number.isInteger(deliveryRevision) && (deliveryRevision as number) >= 0 ? `&r=${deliveryRevision}` : "";
  return `/api/site/media/${assetId}/subsets/${subsetKey}?v=${PHI_FONT_SUBSET_VERSION}${revision}`;
}

export function buildPhiMediaAssetContentDeliveryUrl(assetId: number) {
  return Number.isInteger(assetId) && assetId > 0
    ? `/api/site/media/${assetId}/content`
    : null;
}
