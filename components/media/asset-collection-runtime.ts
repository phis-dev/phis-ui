"use client";

import { useEffect, useMemo } from "react";

import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS } from "../../plugins/runtime-modules/asset/ids";
import type {
  PhiCollectionProviderData,
  PhiCollectionProviderDataSource,
  PhiCollectionProviderQuery,
} from "../../types/collection-provider";
import type {
  PhiMediaAssetFolder,
  PhiMediaAssetTile,
  PhiMediaPickerPagination,
  PhiMediaSpaceOption,
} from "../../types/media";
import { usePhiCollectionProvider } from "../widgets/client/shared/phi-collection-provider";
import { usePhiMediaSpaceSelectionAllowed } from "./media-space-selection";
import {
  PHI_ASSET_CONTROLLER_STORE_KEY,
} from "./asset-controller-signals";
import {
  setPhiImagePreviewError,
  setPhiImagePreviewLoading,
  setPhiImagePreviewResults,
  type PhiImagePreviewStoreState,
  usePhiImagePreviewStore,
} from "./phi-image-preview-store";

export const PHI_ASSET_COLLECTION_DATA_SOURCE = {
  providerKey: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaCollection,
  resourceKey: "assets",
} as const satisfies PhiCollectionProviderDataSource;

export function buildPhiAssetCollectionQuery(
  state: Pick<
    PhiImagePreviewStoreState,
    "page" | "pageSize" | "searchQuery" | "folderId" | "kind" | "presentationFlags" | "since" | "until"
  > & { spaceAddress?: string | null },
): PhiCollectionProviderQuery {
  return {
    page: state.page,
    pageSize: state.pageSize,
    search: state.searchQuery,
    sortKey: "created_at",
    sortOrder: "descend",
    filters: {
      folderId: state.folderId,
      kind: state.kind,
      presentationFlags: state.presentationFlags,
      since: state.since,
      until: state.until,
      // Absent unless the surface may name a Space at all, which is what asks for the Site Space.
      ...(state.spaceAddress ? { spaceId: state.spaceAddress } : {}),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function applyPhiAssetCollectionData(
  data: PhiCollectionProviderData,
  resolvedCollectionRequestKey?: string,
) {
  const folders = Array.isArray(data.meta?.folders)
    ? data.meta.folders.filter(isRecord) as unknown as PhiMediaAssetFolder[]
    : [];
  const pagination = isRecord(data.meta?.pagination)
    ? data.meta.pagination as unknown as PhiMediaPickerPagination
    : null;
  setPhiImagePreviewResults(PHI_ASSET_CONTROLLER_STORE_KEY, {
    activeSpace: isRecord(data.meta?.activeSpace)
      ? data.meta.activeSpace as unknown as PhiMediaSpaceOption
      : null,
    spaces: Array.isArray(data.meta?.spaces)
      ? data.meta.spaces.filter(isRecord) as unknown as PhiMediaSpaceOption[]
      : [],
    assets: data.items.filter(isRecord) as unknown as PhiMediaAssetTile[],
    folders,
    pagination,
    resolvedCollectionRequestKey,
  });
}

export function usePhiAssetCollectionRuntime(
  source: PhiCollectionProviderDataSource | null,
  enabled = true,
) {
  const state = usePhiImagePreviewStore(PHI_ASSET_CONTROLLER_STORE_KEY);
  const { provider, bindingError } = usePhiCollectionProvider(source);
  const {
    presentationFlags,
    folderId,
    kind,
    page,
    pageSize,
    searchQuery,
    since,
    until,
    spaceAddress,
    resolvedCollectionRequestKey,
  } = state;
  // Only a surface that may name a Space carries one into the query; everywhere else this stays null
  // and the request asks for the Site Space.
  const spaceSelectionAllowed = usePhiMediaSpaceSelectionAllowed();
  const query = useMemo(() => buildPhiAssetCollectionQuery({
    presentationFlags,
    folderId,
    kind,
    page,
    pageSize,
    searchQuery,
    since,
    until,
    spaceAddress: spaceSelectionAllowed ? spaceAddress : null,
  }), [
    presentationFlags,
    folderId,
    kind,
    page,
    pageSize,
    searchQuery,
    since,
    spaceAddress,
    spaceSelectionAllowed,
    until,
  ]);
  const requestKey = useMemo(() => JSON.stringify([
    source?.providerKey ?? null,
    source?.resourceKey ?? null,
    source?.params ?? null,
    query,
    state.refreshToken,
  ]), [query, source, state.refreshToken]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (!source || !provider) {
      queueMicrotask(() => {
        setPhiImagePreviewError(
          PHI_ASSET_CONTROLLER_STORE_KEY,
          bindingError ?? "Media collection provider is unavailable.",
        );
      });
      return;
    }
    if (resolvedCollectionRequestKey === requestKey) {
      return;
    }
    const abortController = new AbortController();
    queueMicrotask(() => {
      if (!abortController.signal.aborted) {
        setPhiImagePreviewLoading(PHI_ASSET_CONTROLLER_STORE_KEY, true);
      }
    });
    void provider.query({
      resourceKey: source.resourceKey,
      query,
      params: source.params,
      signal: abortController.signal,
    }).then((data) => {
      if (abortController.signal.aborted) {
        return;
      }
      if (data.error) {
        setPhiImagePreviewError(PHI_ASSET_CONTROLLER_STORE_KEY, data.error);
      } else {
        applyPhiAssetCollectionData(data, requestKey);
      }
    }).catch((error: unknown) => {
      if (!abortController.signal.aborted) {
        setPhiImagePreviewError(
          PHI_ASSET_CONTROLLER_STORE_KEY,
          error instanceof Error ? error.message : "Failed to load media assets.",
        );
      }
    });
    return () => abortController.abort();
  }, [
    bindingError,
    enabled,
    provider,
    query,
    requestKey,
    resolvedCollectionRequestKey,
    source,
  ]);

  return { state, query };
}
