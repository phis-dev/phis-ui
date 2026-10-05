"use client";

import { isPhiRecord } from "../../helpers/is-record";
import { useEffect, useMemo, useState } from "react";

import { PhiMediaKind } from "../../constants/media";
import { createPhiAssetUri } from "../../types/references";
import type { PhiFontMetrics, PhiMediaAssetTile } from "../../types/media";
import { usePhiCollectionProvider } from "../widgets/client/shared/phi-collection-provider";
import { PHI_ASSET_COLLECTION_DATA_SOURCE } from "./asset-collection-runtime";

/**
 * The typefaces a Site owns, as something a font slot can be set to.
 *
 * A slot holds either a family name -- one the font catalogue declares -- or a `phis:asset` reference
 * to a file in the Media library. This is the second list, and it is short by nature: a Site has a
 * handful of typefaces, not a library of them, so it is read once and whole rather than paged.
 *
 * The name shown is the one the file gave itself, read out of the font at upload. Only where the file
 * named no family does the Asset's own title stand in -- a typeface is known by its family, and the
 * file name it happened to be uploaded under is the last resort.
 */

/** Enough for any Site's own lettering; a ceiling rather than a page size. */
const PHI_SITE_FONT_ASSET_LIMIT = 100;

export type PhiSiteFontAssetOption = {
  assetId: number;
  /** What a Theme writes into the slot. */
  value: string;
  /** The family the file states, or the best name there is for it. */
  label: string;
  /** Where the file is and what it says about itself, for a surface that wants to show the face. */
  deliveryUrl: string;
  deliveryRevision: number;
  contentType: string;
  metrics: PhiFontMetrics | null;
};

function readFontAssetMetrics(asset: PhiMediaAssetTile): PhiFontMetrics | null {
  const meta = asset.meta?.font;
  if (!isPhiRecord(meta)) return null;
  const record = meta as Record<string, unknown>;
  // The management tile carries `meta` as stored; only a shape with its unit grid is worth drawing from.
  return typeof record.unitsPerEm === "number" && record.unitsPerEm > 0 ? (record as unknown as PhiFontMetrics) : null;
}

function readFontAssetLabel(asset: PhiMediaAssetTile) {
  const family = readFontAssetMetrics(asset)?.familyName;
  if (typeof family === "string" && family.trim()) return family.trim();
  return asset.title?.trim() || asset.originalName.trim();
}

/**
 * `error` is the library saying it could not be read: the catalogue families are still a usable list,
 * but a Site typeface that is not in it is not "gone", and a picker that showed the list without a word
 * let an author believe their upload had failed.
 */
export function usePhiSiteFontAssets(enabled = true) {
  const { provider } = usePhiCollectionProvider(PHI_ASSET_COLLECTION_DATA_SOURCE);
  const [assets, setAssets] = useState<PhiMediaAssetTile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !provider) return;
    const abortController = new AbortController();
    // The request is the external state this mirrors; loading starts with it, inside the same effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    void provider.query({
      resourceKey: PHI_ASSET_COLLECTION_DATA_SOURCE.resourceKey,
      query: {
        page: 1,
        pageSize: PHI_SITE_FONT_ASSET_LIMIT,
        sortKey: "created_at",
        sortOrder: "descending",
        filters: { kind: PhiMediaKind.Font },
      },
      signal: abortController.signal,
    }).then((data) => {
      if (abortController.signal.aborted) return;
      if (data.error) {
        setAssets([]);
        setError(data.error);
        return;
      }
      setAssets(data.items.filter((item): item is PhiMediaAssetTile => Boolean(item)));
    }).catch((cause: unknown) => {
      if (abortController.signal.aborted) return;
      setAssets([]);
      setError(cause instanceof Error && cause.message ? cause.message : "The Media library could not be read.");
    }).finally(() => {
      if (!abortController.signal.aborted) setLoading(false);
    });
    return () => abortController.abort();
  }, [enabled, provider]);

  const options = useMemo<readonly PhiSiteFontAssetOption[]>(
    () => assets
      .filter((asset) => asset.kind === PhiMediaKind.Font)
      .map((asset) => ({
        assetId: asset.id,
        value: createPhiAssetUri(asset.id),
        label: readFontAssetLabel(asset),
        deliveryUrl: asset.deliveryUrl,
        deliveryRevision: asset.deliveryRevision,
        contentType: asset.contentType,
        metrics: readFontAssetMetrics(asset),
      })),
    [assets],
  );

  return { options, loading, error };
}
