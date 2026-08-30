"use client";

import { useEffect, useMemo, useState } from "react";

import type { PhiMediaAsset } from "../../types/media";
import { PHI_ASSET_CONTROLLER_STORE_KEY } from "./asset-controller-signals";
import { usePhiImagePreviewStore } from "./phi-image-preview-store";

/**
 * Authoring surfaces need the same Asset facts the server render has: the delivery revision that a
 * focal change bumps, the focal rectangle itself, and the intrinsic size. The Picker store already
 * holds a freshly reloaded tile after every metadata save, and the detail request adds the variant
 * list, so both are merged here once instead of in each Widget editor.
 */
export function usePhiAuthoringAssetDetails(assetId: number | null | undefined) {
  const [assetDetails, setAssetDetails] = useState<PhiMediaAsset | null>(null);
  const previewState = usePhiImagePreviewStore(PHI_ASSET_CONTROLLER_STORE_KEY);

  useEffect(() => {
    if (assetId == null) {
      return undefined;
    }

    const controller = new AbortController();

    async function run() {
      try {
        const response = await fetch(`/api/site/media/${assetId}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as { asset?: PhiMediaAsset | null };
        if (!controller.signal.aborted) {
          setAssetDetails(response.ok ? payload.asset ?? null : null);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn("Failed to load image asset variant details.", error);
        }
      }
    }

    void run();

    return () => {
      controller.abort();
    };
  }, [assetId]);

  const currentAssetTile = previewState.selectedAsset?.id === assetId
    ? previewState.selectedAsset
    : previewState.assets.find((asset) => asset.id === assetId) ?? null;

  return useMemo<PhiMediaAsset | null>(() => {
    const fetchedAsset = assetDetails?.id === assetId ? assetDetails : null;
    if (!currentAssetTile) return fetchedAsset;
    // A stale variant list belongs to the previous variant version; dropping it is what makes an
    // invalidated variant visible instead of the crop the Editor showed before the focal change.
    const keepFetchedVariants = fetchedAsset?.variantVersion === currentAssetTile.variantVersion;
    return {
      ...currentAssetTile,
      blurDataUrl: currentAssetTile.blurDataUrl ?? null,
      meta: currentAssetTile.meta ?? null,
      folder: fetchedAsset?.folder ?? null,
      variants: keepFetchedVariants ? fetchedAsset?.variants ?? null : null,
    };
  }, [assetDetails, assetId, currentAssetTile]);
}
