import { isPhiRecord } from "../helpers/is-record";
import "server-only";

import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";
import type { PhiPublicMediaAssetReference } from "../types/media";
import { readPhiPageReference, type PhiPageReference } from "../types/references";
import { throwPhiCmsGatewayError } from "./errors";

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
  if (!isPhiRecord(entry)) {
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
  if (!isPhiRecord(entry)) {
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
  const assets = payload.assets.map(readResolvedAsset);
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
