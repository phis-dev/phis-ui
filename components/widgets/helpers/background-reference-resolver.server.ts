import "server-only";

import { resolveSiteInternalReferences } from "../../../gateway/internal-references";
import { phiRuntime } from "../../../server-helpers/phi-runtime";
import type { PhiBlockRuntime } from "../../../types";
import type { PhiResolvedCmsRenderableTree } from "../../../types/cms";
import { collectPhiBackgroundAssetIds } from "../../media/background-asset-projection";
import type { PhiImageDeliveryProjection } from "../../media/image-presentation";

export { applyPhiBackgroundAssetProjection } from "../../media/background-asset-projection";

/**
 * Resolves every Asset-bound Background of a rendered request in one bulk reference request.
 *
 * Kept separate from applying the result so the Page tree and the Area preset tree -- where the shell
 * Header, Hero, and Footer Backgrounds live -- share one round trip. The walk itself is in
 * `components/media/background-asset-projection.ts` because the Builder needs the same rule with a
 * different fetch.
 */
export async function resolvePhiBackgroundAssetProjection(input: {
  runtime: Pick<PhiBlockRuntime, "site" | "phis">;
  trees: readonly (PhiResolvedCmsRenderableTree | null | undefined)[];
}): Promise<ReadonlyMap<number, PhiImageDeliveryProjection>> {
  const assetIds = collectPhiBackgroundAssetIds(input.trees);
  if (assetIds.length === 0) {
    return new Map();
  }

  const rt = phiRuntime(input.runtime);
  const projection = await resolveSiteInternalReferences({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    siteKey: rt.siteKey,
    assetIds,
  });

  return new Map(
    [...projection.assets].map(([id, asset]) => [id, {
      deliveryUrl: asset.deliveryUrl,
      deliveryRevision: asset.deliveryRevision,
      variantVersion: asset.variantVersion,
      focalRect: asset.focalRect,
      width: asset.width,
      height: asset.height,
    }] as const),
  );
}
