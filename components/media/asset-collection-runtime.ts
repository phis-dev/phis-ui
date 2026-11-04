"use client";

import { useEffect, useMemo } from "react";

import { PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS } from "../../constants/media-library-provider-keys";
import type {
  PhiCollectionProviderData,
  PhiCollectionProviderQuery,
} from "../../types/collection-provider";
import type { PhiProviderResourceSource } from "../../types/runtime-data-provider";
import { usePhiCollectionProvider } from "../widgets/client/shared/phi-collection-provider";
import { usePhiMediaSpaceSelectionAllowed } from "./media-space-selection";
import {
  readPhiMediaAssetTiles,
  readPhiMediaFolders,
  readPhiMediaPagination,
  readPhiMediaSpace,
  readPhiMediaSpaces,
} from "./phi-image-preview-data";
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
  providerKey: PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.collection,
  resourceKey: "assets",
} as const satisfies PhiProviderResourceSource;

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
    sortOrder: "descending",
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

export function applyPhiAssetCollectionData(
  data: PhiCollectionProviderData,
  resolvedCollectionRequestKey?: string,
) {
  setPhiImagePreviewResults(PHI_ASSET_CONTROLLER_STORE_KEY, {
    activeSpace: readPhiMediaSpace(data.meta?.activeSpace),
    spaces: readPhiMediaSpaces(data.meta?.spaces),
    assets: readPhiMediaAssetTiles(data.items),
    folders: readPhiMediaFolders(data.meta?.folders),
    pagination: readPhiMediaPagination(data.meta?.pagination),
    resolvedCollectionRequestKey,
  });
}

export function usePhiAssetCollectionRuntime(
  source: PhiProviderResourceSource | null,
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
