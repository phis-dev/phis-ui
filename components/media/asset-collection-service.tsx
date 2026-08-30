"use client";

import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS } from "../../plugins/runtime-modules/asset/ids";
import type {
  PhiCollectionProviderActionRequest,
  PhiCollectionProviderQuery,
  PhiCollectionProviderQueryRequest,
} from "../../types/collection-provider";
import { createPhiCollectionProviderClient } from "../widgets/client/shared/phi-collection-provider";
import { buildPhiMediaRequestHeaders } from "./phi-media-request-headers";
import { readPhiImagePreviewResponse } from "./phi-image-preview-data";
import { PhiAssetCollectionViewBinding } from "./phi-asset-collection-view-binding";

function readFilter(query: PhiCollectionProviderQuery, key: string) {
  return query.filters?.[key];
}

function buildMediaQuery(query: PhiCollectionProviderQuery) {
  const search = new URLSearchParams({
    page: String(query.page && query.page > 0 ? query.page : 1),
    pageSize: String(query.pageSize && query.pageSize > 0 ? query.pageSize : 20),
    sort: query.sortKey
      ? `${query.sortKey}_${query.sortOrder === "ascend" ? "asc" : "desc"}`
      : "created_at_desc",
  });
  const folderId = readFilter(query, "folderId");
  const kind = readFilter(query, "kind");
  const presentationFlags = readFilter(query, "presentationFlags");
  const since = readFilter(query, "since");
  const until = readFilter(query, "until");
  const spaceId = readFilter(query, "spaceId");
  const text = query.search?.trim() ?? "";
  if (text) search.set("q", text);
  // Naming a Space is a request, never a grant: the control plane resolves it against the actor's own
  // authority. Omitting it asks for the Site Space, which is what every authoring surface does.
  if (typeof spaceId === "string" && spaceId) search.set("spaceId", spaceId);
  if (typeof folderId === "number" && Number.isInteger(folderId)) search.set("folderId", String(folderId));
  if (Array.isArray(kind)) {
    kind.forEach((entry) => {
      if (typeof entry === "string" && entry) search.append("kind", entry);
    });
  } else if (typeof kind === "string" && kind) {
    search.append("kind", kind);
  }
  if (typeof presentationFlags === "number" && Number.isInteger(presentationFlags) && presentationFlags !== 0) search.set("presentationFlags", String(presentationFlags));
  if (typeof since === "string" && since) search.set("since", since);
  if (typeof until === "string" && until) search.set("until", until);
  return search;
}

async function queryMediaCollection(request: PhiCollectionProviderQueryRequest) {
  if (request.resourceKey !== "assets") {
    throw new Error(`Unknown Asset collection "${request.resourceKey}".`);
  }
  try {
    const response = await fetch(`/api/site/media?${buildMediaQuery(request.query).toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "include",
      signal: request.signal,
    });
    const payload = await readPhiImagePreviewResponse(response);
    return {
      resourceKey: request.resourceKey,
      items: payload.assets.map((asset) => ({ ...asset })),
      total: payload.pagination?.total ?? payload.assets.length,
      loading: false,
      error: null,
      meta: {
        activeSpace: payload.activeSpace,
        spaces: (payload.spaces ?? []).map((space) => ({ ...space })),
        folders: payload.folders.map((folder) => ({ ...folder })),
        pagination: payload.pagination ? { ...payload.pagination } : null,
      },
    };
  } catch (error) {
    if (request.signal.aborted) throw error;
    return {
      resourceKey: request.resourceKey,
      items: [],
      total: 0,
      loading: false,
      error: error instanceof Error ? error.message : "Failed to load media assets.",
    };
  }
}

function readAssetId(value: unknown) {
  const assetId = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(assetId) || assetId <= 0) {
    throw new Error("Asset action requires a positive asset id.");
  }
  return assetId;
}

async function readMutationResponse(response: Response) {
  const payload = await response.json().catch(() => null) as {
    error?: string;
    message?: string;
    asset?: Record<string, unknown> | null;
  } | null;
  if (!response.ok || !payload) {
    throw new Error(
      payload?.message ?? payload?.error ?? `Media request failed with status ${response.status}.`,
    );
  }
  return payload;
}

async function runMediaCollectionAction(request: PhiCollectionProviderActionRequest) {
  if (request.resourceKey !== "assets") {
    throw new Error(`Unknown Asset collection "${request.resourceKey}".`);
  }
  let actionItem: Record<string, unknown> | null = null;
  if (request.actionKey === "delete") {
    const assetId = readAssetId(request.itemKey);
    await readMutationResponse(await fetch(`/api/site/media/${assetId}`, {
      method: "DELETE",
      headers: buildPhiMediaRequestHeaders({ Accept: "application/json" }),
      cache: "no-store",
      credentials: "include",
      signal: request.signal,
    }));
  } else if (request.actionKey === "update") {
    const assetId = readAssetId(request.itemKey);
    const payload = await readMutationResponse(await fetch(`/api/site/media/${assetId}`, {
      method: "PATCH",
      headers: buildPhiMediaRequestHeaders({
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      cache: "no-store",
      credentials: "include",
      signal: request.signal,
      body: JSON.stringify(request.item ?? {}),
    }));
    actionItem = payload.asset ?? null;
  } else if (request.actionKey !== "refresh") {
    throw new Error(`Unsupported Asset collection action "${request.actionKey}".`);
  }

  const data = await queryMediaCollection({
    resourceKey: request.resourceKey,
    query: request.query ?? {},
    params: request.params,
    signal: request.signal,
  });
  return actionItem
    ? {
        ...data,
        meta: {
          ...data.meta,
          action: {
            key: request.actionKey,
            item: actionItem,
          },
        },
      }
    : data;
}

export const PhiAssetCollectionProviderClient = createPhiCollectionProviderClient({
  key: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaCollection,
  query: queryMediaCollection,
  action: runMediaCollectionAction,
  resources: [{ resourceKey: "assets", View: PhiAssetCollectionViewBinding }],
});
