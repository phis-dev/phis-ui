import "server-only";

import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";
import type { PhiPublicMediaAssetReference } from "../types/media";
import { readPhiPageReference, type PhiPageReference } from "../types/references";

export type PhiResolvedPageReference = {
  reference: PhiPageReference;
  path: string | null;
  deleted: boolean;
  targetKind: "site" | "module";
};

export type PhiResolvedInternalReferences = {
  pages: readonly PhiResolvedPageReference[];
  assets: ReadonlyMap<number, PhiPublicMediaAssetReference>;
};

function readResolvedPage(entry: unknown): PhiResolvedPageReference {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error("Invalid internal Page reference projection.");
  }
  const value = entry as Record<string, unknown>;
  const parsed = readPhiPageReference(value.reference);
  if (!parsed || (value.path !== null && typeof value.path !== "string") || typeof value.deleted !== "boolean") {
    throw new Error("Invalid internal Page reference projection.");
  }
  return {
    reference: parsed.reference,
    path: value.path as string | null,
    deleted: value.deleted,
    targetKind: value.targetKind === "module" ? "module" : "site",
  };
}

function readResolvedAsset(entry: unknown): PhiPublicMediaAssetReference {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error("Invalid internal Asset reference projection.");
  }
  const value = entry as Record<string, unknown>;
  if (
    !Number.isSafeInteger(value.id) || (value.id as number) <= 0 ||
    typeof value.deliveryUrl !== "string" || !Number.isSafeInteger(value.deliveryRevision) ||
    typeof value.contentType !== "string" || typeof value.originalName !== "string"
  ) {
    throw new Error("Invalid internal Asset reference projection.");
  }
  return value as unknown as PhiPublicMediaAssetReference;
}

/**
 * Resolves both internal reference kinds in one request.
 *
 * Pages and Assets share one contract in `REFERENCES.md`, so they share one round trip: a page with a
 * dozen images no longer issues a dozen Asset lookups. The endpoint only ever returns publicly
 * deliverable Site Space Assets, so callers must not re-filter — an absent id is simply not renderable.
 */
export async function resolveSiteInternalReferences(input: {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  /** Required only for Page references. Assets are Site scoped and carry no Area. */
  area?: string;
  references?: readonly PhiPageReference[];
  assetIds?: readonly number[];
}): Promise<PhiResolvedInternalReferences> {
  const references = [...new Set(input.references ?? [])];
  const assetIds = [...new Set((input.assetIds ?? []).filter((id) => Number.isSafeInteger(id) && id > 0))];
  if (references.length === 0 && assetIds.length === 0) {
    return { pages: [], assets: new Map() };
  }

  const response = await fetch(buildApiUrl(input.apiBaseUrl, "/api/v1/site/references"), {
    method: "POST",
    headers: buildApiHeaders({
      token: input.internalToken,
      siteKey: input.siteKey,
      includeToken: true,
      includeSiteKey: true,
      extra: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "phis-ui/1.0" },
    }),
    cache: "no-store",
    body: JSON.stringify({ ...(input.area ? { area: input.area } : {}), references, assets: assetIds }),
  });
  if (!response.ok) throw new Error(`Failed to resolve internal references (${response.status}).`);

  const payload = (await response.json().catch(() => null)) as { resolved?: unknown; assets?: unknown } | null;
  if (!Array.isArray(payload?.resolved) || !Array.isArray(payload?.assets)) {
    throw new Error("Missing internal reference projection.");
  }
  const assets = payload.assets.map(readResolvedAsset);
  return {
    pages: payload.resolved.map(readResolvedPage),
    assets: new Map(assets.map((asset) => [asset.id, asset] as const)),
  };
}
