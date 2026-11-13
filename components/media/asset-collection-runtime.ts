"use client";

import { PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS } from "../../constants/media-library-provider-keys";
import type {
  PhiCollectionProviderData,
  PhiCollectionProviderQuery,
} from "../../types/collection-provider";
import type { PhiProviderResourceSource } from "../../types/runtime-data-provider";
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
  setPhiImagePreviewResults,
  type PhiImagePreviewStoreState,
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

export function applyPhiAssetCollectionData(data: PhiCollectionProviderData) {
  setPhiImagePreviewResults(PHI_ASSET_CONTROLLER_STORE_KEY, {
    activeSpace: readPhiMediaSpace(data.meta?.activeSpace),
    spaces: readPhiMediaSpaces(data.meta?.spaces),
    assets: readPhiMediaAssetTiles(data.items),
    folders: readPhiMediaFolders(data.meta?.folders),
    pagination: readPhiMediaPagination(data.meta?.pagination),
  });
}
