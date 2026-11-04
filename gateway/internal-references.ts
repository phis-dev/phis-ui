import "server-only";

import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";
import type { PhiPublicMediaAssetReference } from "../types/media";
import { PhiMediaKind } from "../constants/media";
import { readPhiFontMetricsFields } from "../components/media/media-font-metrics";
import { createPhiResponseReader, requirePhiField } from "../components/widgets/config/strict-config-reader";
import { readPhiPageReference, type PhiPageReference } from "../types/references";
import { throwPhiCmsGatewayError } from "./errors";
import { peekPhiSiteReadCache, writePhiSiteReadCache } from "./site-read-cache";

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
  const reader = createPhiResponseReader(entry, "The internal reference projection");
  const parsed = readPhiPageReference(reader.record.reference) ?? reader.fail("reference", "a Page reference");
  const path = reader.record.path;
  return {
    reference: parsed.reference,
    path: path === null ? null : requirePhiField(reader, "path", "a path or null", reader.string),
    deleted: requirePhiField(reader, "deleted", "true or false", reader.boolean),
    targetKind: requirePhiField(reader, "targetKind", '"site" or "module"', (key) =>
      reader.oneOf(key, ["site", "module"] as const)),
  };
}

const PHI_MEDIA_KINDS = Object.values(PhiMediaKind);

/**
 * One Asset of the public reference projection, as the server writes it; a shape it does not match throws.
 *
 * Every field, not five of them: what passed here went straight into a rendered page under a type that
 * promised a focal rectangle and font metrics nobody had looked at.
 */
export function readPhiPublicMediaAssetReference(entry: unknown): PhiPublicMediaAssetReference {
  const reader = createPhiResponseReader(entry, "The internal reference projection");
  const integer = (key: string) => requirePhiField(reader, key, "a whole number", reader.integer);
  const text = (key: string) => requirePhiField(reader, key, "a text", reader.string);
  const nullableNumber = (key: string) => reader.number(key) ?? null;
  const nullableText = (key: string) => reader.string(key) ?? null;
  const id = integer("id");
  if (id <= 0) reader.fail("id", "a positive whole number");
  return {
    id,
    deliveryUrl: text("deliveryUrl"),
    deliveryRevision: integer("deliveryRevision"),
    variantVersion: reader.integer("variantVersion") ?? null,
    contentType: text("contentType"),
    kind: requirePhiField(reader, "kind", "a media kind", (key) => reader.oneOf(key, PHI_MEDIA_KINDS)),
    originalName: text("originalName"),
    width: nullableNumber("width"),
    height: nullableNumber("height"),
    blurDataUrl: nullableText("blurDataUrl"),
    title: nullableText("title"),
    altText: nullableText("altText"),
    thumbnailUrl: nullableText("thumbnailUrl"),
    previewUrl: nullableText("previewUrl"),
    focalRect: reader.object("focalRect", (rect) => {
      const fraction = (key: string) => {
        const value = requirePhiField(rect, key, "a number from 0 to 1", rect.number);
        return value >= 0 && value <= 1 ? value : rect.fail(key, "a number from 0 to 1");
      };
      return { x: fraction("x"), y: fraction("y"), width: fraction("width"), height: fraction("height") };
    }) ?? null,
    font: reader.object("font", readPhiFontMetricsFields) ?? null,
  };
}

/** What the server takes per list in one request (`MAX_REFERENCES_PER_REQUEST`). */
const PHI_REFERENCES_PER_REQUEST = 256;

type PhiReferenceBatchRequest = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  area?: string;
};

type PhiPendingReferenceBatch = PhiReferenceBatchRequest & {
  references: Set<PhiPageReference>;
  assetIds: Set<number>;
  result: Promise<PhiResolvedInternalReferences>;
};

/*
 * The batches waiting for the end of the current turn, by server, Site and Area.
 *
 * A render resolves references from many places at once -- every Image, Card and Video poster, the
 * Markdown and HTML Widgets, the background, the fonts -- and each asked on its own: one request to the
 * server per Widget. Calls that arrive in the same turn now share one request. The answer depends on
 * the Site and the Area alone, never on who is looking (the endpoint takes the internal token and no
 * session), so two requests that happen to resolve at the same moment may share a batch as well.
 */
const pendingBatches = new Map<string, PhiPendingReferenceBatch>();

function batchKey(input: PhiReferenceBatchRequest) {
  return JSON.stringify([input.apiBaseUrl, input.internalToken, input.siteKey, input.area ?? ""]);
}

async function requestSiteInternalReferences(
  input: PhiReferenceBatchRequest,
  references: readonly PhiPageReference[],
  assetIds: readonly number[],
): Promise<PhiResolvedInternalReferences> {
  const response = await fetch(buildApiUrl(input.apiBaseUrl, "/api/v1/site/references"), {
    method: "POST",
    headers: buildApiHeaders({
      token: input.internalToken,
      siteKey: input.siteKey,
      includeToken: true,
      includeSiteKey: true,
      gateway: true,
      jsonBody: true,
    }),
    cache: "no-store",
    body: JSON.stringify({ ...(input.area ? { area: input.area } : {}), references, assets: assetIds }),
  });
  if (!response.ok) {
    throwPhiCmsGatewayError(
      `Failed to resolve internal references (${response.status}).`,
      response.status,
    );
  }

  const payload = (await response.json().catch(() => null)) as { resolved?: unknown; assets?: unknown } | null;
  if (!Array.isArray(payload?.resolved) || !Array.isArray(payload?.assets)) {
    throw new Error("Missing internal reference projection.");
  }
  const assets = payload.assets.map(readPhiPublicMediaAssetReference);
  return {
    pages: payload.resolved.map(readResolvedPage),
    assets: new Map(assets.map((asset) => [asset.id, asset] as const)),
  };
}

function openBatch(key: string, input: PhiReferenceBatchRequest): PhiPendingReferenceBatch {
  const batch = {
    ...input,
    references: new Set<PhiPageReference>(),
    assetIds: new Set<number>(),
  } as PhiPendingReferenceBatch;
  batch.result = new Promise<PhiResolvedInternalReferences>((resolve, reject) => {
    // The end of this turn: whatever else asks before then rides along.
    setImmediate(() => {
      if (pendingBatches.get(key) === batch) pendingBatches.delete(key);
      requestSiteInternalReferences(batch, [...batch.references], [...batch.assetIds]).then(resolve, reject);
    });
  });
  pendingBatches.set(key, batch);
  return batch;
}

/**
 * Resolves both internal reference kinds, together with whatever else asks in the same turn.
 *
 * Pages and Assets share one contract in `REFERENCES.md`, so they share one round trip -- and so do
 * the callers of one render (see `pendingBatches`); each still receives only what it asked for. The
 * endpoint only ever returns publicly deliverable Site Space Assets, so callers must not re-filter -- an
 * absent id is simply not renderable.
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

  const request = {
    apiBaseUrl: input.apiBaseUrl,
    internalToken: input.internalToken,
    siteKey: input.siteKey,
    ...(input.area ? { area: input.area } : {}),
  };
  if (!keepsReferences()) {
    return requestThroughBatch(request, references, assetIds);
  }

  /*
   * Kept per reference rather than per answer: which references share a request depends on what else
   * happened to resolve in the same turn, so an answer as a whole would almost never be asked for again.
   * An Asset that did not come back is kept as absent too -- it is not renderable, and asking again on
   * every view would cost exactly what this saves.
   */
  const pages = new Map<PhiPageReference, PhiResolvedPageReference>();
  const assets = new Map<number, PhiPublicMediaAssetReference>();
  const missingReferences: PhiPageReference[] = [];
  const missingAssetIds: number[] = [];
  await Promise.all([
    ...references.map(async (reference) => {
      const cached = peekPhiSiteReadCache<PhiResolvedPageReference>(pageCacheKey(request, reference));
      if (cached) pages.set(reference, await cached);
      else missingReferences.push(reference);
    }),
    ...assetIds.map(async (id) => {
      const cached = peekPhiSiteReadCache<PhiPublicMediaAssetReference | null>(assetCacheKey(request, id));
      if (!cached) {
        missingAssetIds.push(id);
        return;
      }
      const asset = await cached;
      if (asset) assets.set(id, asset);
    }),
  ]);

  if (missingReferences.length > 0 || missingAssetIds.length > 0) {
    const fetched = await requestThroughBatch(request, missingReferences, missingAssetIds);
    for (const entry of fetched.pages) {
      pages.set(entry.reference, entry);
      writePhiSiteReadCache(pageCacheKey(request, entry.reference), entry);
    }
    for (const id of missingAssetIds) {
      const asset = fetched.assets.get(id) ?? null;
      if (asset) assets.set(id, asset);
      writePhiSiteReadCache(assetCacheKey(request, id), asset);
    }
  }

  return {
    pages: references.flatMap((reference) => {
      const entry = pages.get(reference);
      return entry ? [entry] : [];
    }),
    assets: new Map(assetIds.flatMap((id) => {
      const asset = assets.get(id);
      return asset ? [[id, asset] as const] : [];
    })),
  };
}

/*
 * Outside development only, as every read this cache holds (gateway/CACHES.md): `next dev` is where a
 * change has to show on the next reload, and nothing there is under load.
 */
function keepsReferences() {
  return process.env.NODE_ENV !== "development";
}

// A Page reference resolves within its Area; an Asset is Site scoped and carries none.
function pageCacheKey(request: PhiReferenceBatchRequest, reference: PhiPageReference) {
  return `references:${request.siteKey.trim().toLowerCase()}:page:${request.area ?? ""}:${reference}`;
}

function assetCacheKey(request: PhiReferenceBatchRequest, id: number) {
  return `references:${request.siteKey.trim().toLowerCase()}:asset:${id}`;
}

/** Joins the batch of the current turn and returns what this caller asked for. */
async function requestThroughBatch(
  request: PhiReferenceBatchRequest,
  references: readonly PhiPageReference[],
  assetIds: readonly number[],
): Promise<PhiResolvedInternalReferences> {
  if (references.length === 0 && assetIds.length === 0) {
    return { pages: [], assets: new Map() };
  }
  const key = batchKey(request);
  let batch = pendingBatches.get(key) ?? openBatch(key, request);
  const fits = (candidate: PhiPendingReferenceBatch) =>
    new Set([...candidate.references, ...references]).size <= PHI_REFERENCES_PER_REQUEST &&
    new Set([...candidate.assetIds, ...assetIds]).size <= PHI_REFERENCES_PER_REQUEST;
  if (!fits(batch)) {
    // A full batch leaves on its own; this caller starts the next one.
    pendingBatches.delete(key);
    batch = openBatch(key, request);
  }
  for (const reference of references) batch.references.add(reference);
  for (const assetId of assetIds) batch.assetIds.add(assetId);
  // Each caller gets what it asked for and nothing a neighbour in the batch did.
  const projection = await batch.result;
  const askedReferences = new Set(references);
  return {
    pages: projection.pages.filter((entry) => askedReferences.has(entry.reference)),
    assets: new Map(assetIds.flatMap((id) => {
      const asset = projection.assets.get(id);
      return asset ? [[id, asset] as const] : [];
    })),
  };
}
