import type { PhiImageDeliveryProjection } from "./image-presentation";

/**
 * Backgrounds bind an Asset by id, but drawing one needs facts the config cannot hold: the delivery
 * revision, the variant version a focal change bumps, the focal rectangle, and the intrinsic size.
 * Content Widgets
 * already get theirs from a projection (`resolvedContent`); this is the same move for the Region,
 * Layout, and Overlay configs a page or a Builder draft renders.
 *
 * Collecting and applying are pure and live here so the live render and the Builder share one rule.
 * Only fetching differs: the server resolves in bulk through the reference gateway, the Builder reads
 * the Assets it is allowed to see. Splitting them the other way -- one walk per surface -- is what let
 * the shell Backgrounds render without a revision until a browser check caught it.
 *
 * The walk is shape-driven rather than key-driven on purpose. Background bases sit under `background`,
 * `backgroundConfig`, `rootNodeBackground`, and slot-level keys, and a new container would otherwise
 * silently render a stale crop until someone remembered to extend a key list.
 */

export const PHI_BACKGROUND_RESOLVED_ASSET_KEY = "resolvedAsset";

type JsonRecord = Record<string, unknown>;

type PhiBackgroundProjectableTree = {
  regions: readonly { config: Record<string, unknown> }[];
  layoutNodes: readonly { config: Record<string, unknown> }[];
  overlays: readonly { config: Record<string, unknown> }[];
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** An Asset-bound image background: the only shape that needs a delivery projection. */
function readBackgroundAssetId(value: JsonRecord): number | null {
  if (value.kind !== "image" || value.sourceKind !== "asset") {
    return null;
  }

  const assetId = value.assetId;
  return typeof assetId === "number" && Number.isSafeInteger(assetId) && assetId > 0 ? assetId : null;
}

function collectFrom(value: unknown, into: Set<number>) {
  if (Array.isArray(value)) {
    for (const entry of value) collectFrom(entry, into);
    return;
  }
  if (!isRecord(value)) return;

  const assetId = readBackgroundAssetId(value);
  if (assetId != null) into.add(assetId);
  for (const entry of Object.values(value)) collectFrom(entry, into);
}

/** Every Asset id an Asset-bound Background in these trees binds. */
export function collectPhiBackgroundAssetIds(
  trees: readonly (PhiBackgroundProjectableTree | null | undefined)[],
): number[] {
  const assetIds = new Set<number>();
  for (const tree of trees) {
    if (!tree) continue;
    for (const node of [...tree.regions, ...tree.layoutNodes, ...tree.overlays]) {
      collectFrom(node.config, assetIds);
    }
  }

  return [...assetIds];
}

function projectInto(
  value: unknown,
  assets: ReadonlyMap<number, PhiImageDeliveryProjection>,
): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => projectInto(entry, assets));
  }
  if (!isRecord(value)) return value;

  const projected: JsonRecord = {};
  for (const [key, entry] of Object.entries(value)) {
    // A stale projection from an earlier render must never survive into this one.
    if (key === PHI_BACKGROUND_RESOLVED_ASSET_KEY) continue;
    projected[key] = projectInto(entry, assets);
  }

  const assetId = readBackgroundAssetId(value);
  const asset = assetId == null ? null : assets.get(assetId) ?? null;
  if (asset) {
    projected[PHI_BACKGROUND_RESOLVED_ASSET_KEY] = asset;
  }

  return projected;
}

/**
 * Attaches the delivery projection to every Asset-bound Background in one tree. An id that did not
 * resolve -- deleted, private, or outside the Site Space -- keeps no projection, and the Background
 * falls back to the original content URL.
 */
export function applyPhiBackgroundAssetProjection<T extends PhiBackgroundProjectableTree>(
  tree: T,
  assets: ReadonlyMap<number, PhiImageDeliveryProjection>,
): T {
  if (assets.size === 0) {
    return tree;
  }

  const withProjection = <N extends { config: Record<string, unknown> }>(node: N): N => ({
    ...node,
    config: projectInto(node.config, assets) as Record<string, unknown>,
  });

  return {
    ...tree,
    regions: tree.regions.map(withProjection),
    layoutNodes: tree.layoutNodes.map(withProjection),
    overlays: tree.overlays.map(withProjection),
  };
}
