import "server-only";

import {
  PhiImageAssetVariantKey,
  PhiMediaKind,
  buildPhiImageAssetVariantDeliveryUrl,
  resolvePhiImageAssetVariantSpec,
} from "../constants/media";
import { resolveSiteInternalReferences } from "../gateway/internal-references";
import type { PhiLinkPreviewImage } from "../helpers/phi-metadata";
import type { PhiShareImage } from "../types/link-preview";

/** A Media delivery address of the Site: `/api/site/media/<id>/content` or one of its variants. */
const PHI_MEDIA_DELIVERY_PATH = /^\/api\/site\/media\/(\d+)\/(?:content|variants\/\d+)(?:[?#].*)?$/u;

/**
 * The Asset a record picture's address delivers, or `null` where it is no Media address of this Site.
 *
 * A record names its picture by address (`PhiRecordPicture.src`), Site-relative or absolute; a preview
 * picture has to be an Asset, because only an Asset has a share variant and a delivery policy to ask.
 * An absolute address counts only on the Site's own public base.
 */
export function readPhiMediaDeliveryAssetId(src: string, publicBase: string | null): number | null {
  const trimmed = src.trim();
  const path = publicBase && trimmed.startsWith(`${publicBase}/`) ? trimmed.slice(publicBase.length) : trimmed;
  const match = PHI_MEDIA_DELIVERY_PATH.exec(path);
  const id = match ? Number(match[1]) : NaN;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * The picture a link preview shows: the first candidate that is a publicly delivered image of the Site
 * Space, as its share variant (1200 x 630, `PhiImageAssetVariantKey.Share`).
 *
 * The candidates come in the order the Page answers -- the record's picture, the Page's own setting, the
 * Theme's -- and are asked about in one request, the reference projection every render resolves Assets
 * through, which answers only what a visitor may be served: an Asset that is not public, not ready, of
 * another Space or no image is not there, and the next candidate stands. None is no picture, and so is a
 * Site without a public base, which cannot name an absolute address.
 */
export async function resolvePhiLinkPreviewImage({
  apiBaseUrl,
  internalToken,
  siteKey,
  publicBase,
  candidates,
  fallbackAlt,
}: {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  publicBase: string | null;
  candidates: readonly (PhiShareImage | null)[];
  /** What the picture says where neither the candidate nor the Asset says anything: the preview's title. */
  fallbackAlt: string;
}): Promise<PhiLinkPreviewImage | null> {
  const stated = candidates.filter((candidate): candidate is PhiShareImage => candidate !== null);
  const spec = resolvePhiImageAssetVariantSpec(PhiImageAssetVariantKey.Share);
  if (!publicBase || stated.length === 0 || !spec) return null;
  const { assets } = await resolveSiteInternalReferences({
    apiBaseUrl,
    internalToken,
    siteKey,
    assetIds: stated.map((candidate) => candidate.assetId),
  });
  for (const candidate of stated) {
    const asset = assets.get(candidate.assetId);
    if (!asset || asset.kind !== PhiMediaKind.Image) continue;
    const path = buildPhiImageAssetVariantDeliveryUrl(
      asset.id,
      PhiImageAssetVariantKey.Share,
      asset.variantVersion,
      asset.deliveryRevision,
    );
    if (!path) continue;
    return {
      url: `${publicBase}${path}`,
      width: spec.width,
      height: spec.height,
      alt: candidate.alt?.trim() || asset.altText?.trim() || asset.title?.trim() || fallbackAlt,
      type: spec.format === "jpeg" ? "image/jpeg" : "image/webp",
    };
  }
  return null;
}
