import { createPhiPluginStateStore } from "../state/plugin-state-store";
import type {
  PhiImageAssetVariantKeyValue,
  PhiMediaAssetFolder,
  PhiMediaAssetTile,
  PhiMediaKindValue,
  PhiMediaPickerPagination,
  PhiMediaSpaceOption,
} from "../../types/media";

export type PhiImagePreviewStoreState = {
  scopeKey: string;
  searchQuery: string;
  folderId: number | null;
  folderPath: string[] | null;
  kind: PhiMediaKindValue | null;
  presentationFlags: number | null;
  since: string | null;
  until: string | null;
  page: number;
  pageSize: number;
  assets: PhiMediaAssetTile[];
  activeSpace: PhiMediaSpaceOption | null;
  /** The Space the surface asked for; `null` asks for nothing, which the control plane answers with the Site Space. */
  spaceAddress: string | null;
  spaces: PhiMediaSpaceOption[];
  folders: PhiMediaAssetFolder[];
  pagination: PhiMediaPickerPagination | null;
  loading: boolean;
  error: string | null;
  selectedAssetId: number | null;
  selectedVariantKey: PhiImageAssetVariantKeyValue | null;
  selectedAsset: PhiMediaAssetTile | null;
  refreshToken: number;
  resolvedCollectionRequestKey: string | null;
};

function createDefaultState(scopeKey: string): PhiImagePreviewStoreState {
  return {
    scopeKey,
    searchQuery: "",
    folderId: null,
    folderPath: null,
    kind: null,
    presentationFlags: null,
    since: null,
    until: null,
    page: 1,
    pageSize: 20,
    assets: [],
    activeSpace: null,
    spaceAddress: null,
    spaces: [],
    folders: [],
    pagination: null,
    loading: false,
    error: null,
    selectedAssetId: null,
    selectedVariantKey: null,
    selectedAsset: null,
    refreshToken: 0,
    resolvedCollectionRequestKey: null,
  };
}

export const phiImagePreviewStore = createPhiPluginStateStore<PhiImagePreviewStoreState>(
  "@phis/ui/media-preview",
  createDefaultState,
);

export function usePhiImagePreviewStore(scopeKey: string) {
  return phiImagePreviewStore.useStore(scopeKey);
}

export function setPhiImagePreviewSearchQuery(scopeKey: string, searchQuery: string) {
  phiImagePreviewStore.patch(scopeKey, (current) => ({ ...current, searchQuery, page: 1, error: null }));
}

export function setPhiImagePreviewFolderId(scopeKey: string, folderId: number | null) {
  phiImagePreviewStore.patch(scopeKey, (current) => ({ ...current, folderId, folderPath: null, page: 1, error: null }));
}

export function setPhiImagePreviewFolderPath(scopeKey: string, folderPath: string[] | null) {
  const normalizedPath = (folderPath ?? []).map((segment) => segment.trim()).filter(Boolean);
  phiImagePreviewStore.patch(scopeKey, (current) => ({
    ...current,
    folderId: null,
    folderPath: normalizedPath.length > 0 ? normalizedPath : null,
    page: 1,
    error: null,
  }));
}

export function setPhiImagePreviewKind(scopeKey: string, kind: PhiMediaKindValue | null) {
  phiImagePreviewStore.patch(scopeKey, (current) => ({ ...current, kind, page: 1, error: null }));
}

export function setPhiImagePreviewFlags(scopeKey: string, presentationFlags: number | null) {
  phiImagePreviewStore.patch(scopeKey, (current) => ({ ...current, presentationFlags, page: 1, error: null }));
}

export function setPhiImagePreviewDateRange(scopeKey: string, since: string | null, until: string | null) {
  phiImagePreviewStore.patch(scopeKey, (current) => ({ ...current, since, until, page: 1, error: null }));
}

export function setPhiImagePreviewPage(scopeKey: string, page: number) {
  phiImagePreviewStore.patch(scopeKey, (current) => ({ ...current, page: Number.isInteger(page) && page > 0 ? page : 1 }));
}

export function setPhiImagePreviewPageSize(scopeKey: string, pageSize: number) {
  phiImagePreviewStore.patch(scopeKey, (current) => ({
    ...current,
    pageSize: Number.isInteger(pageSize) && pageSize > 0 ? pageSize : current.pageSize,
    page: 1,
  }));
}

export function setPhiImagePreviewResults(
  scopeKey: string,
  next: {
    assets: PhiMediaAssetTile[];
    activeSpace?: PhiMediaSpaceOption | null;
    spaces?: PhiMediaSpaceOption[];
    folders: PhiMediaAssetFolder[];
    pagination: PhiMediaPickerPagination | null;
    resolvedCollectionRequestKey?: string | null;
  },
) {
  phiImagePreviewStore.patch(scopeKey, (current) => ({
    ...current,
    assets: next.assets,
    activeSpace: next.activeSpace === undefined ? current.activeSpace : next.activeSpace,
    spaces: next.spaces === undefined ? current.spaces : next.spaces,
    // The answer decides which Space is current, so a request that asked for nothing still ends up
    // pointing at the Space it was served -- and the selector shows the truth rather than an intent.
    spaceAddress: next.activeSpace?.address ?? current.spaceAddress,
    folders: next.folders,
    pagination: next.pagination,
    selectedAsset:
      current.selectedAssetId == null
        ? current.selectedAsset
        : next.assets.find((asset) => asset.id === current.selectedAssetId) ?? current.selectedAsset,
    loading: false,
    error: null,
    resolvedCollectionRequestKey:
      next.resolvedCollectionRequestKey === undefined
        ? current.resolvedCollectionRequestKey
        : next.resolvedCollectionRequestKey,
  }));
}

export function removePhiImagePreviewAsset(scopeKey: string, assetId: number) {
  phiImagePreviewStore.patch(scopeKey, (current) => ({
    ...current,
    assets: current.assets.filter((asset) => asset.id !== assetId),
    selectedAssetId: current.selectedAssetId === assetId ? null : current.selectedAssetId,
    selectedAsset: current.selectedAsset?.id === assetId ? null : current.selectedAsset,
  }));
}

export function updatePhiImagePreviewAsset(
  scopeKey: string,
  assetId: number,
  updater: (asset: PhiMediaAssetTile) => PhiMediaAssetTile,
) {
  phiImagePreviewStore.patch(scopeKey, (current) => ({
    ...current,
    assets: current.assets.map((asset) => (asset.id === assetId ? updater(asset) : asset)),
    selectedAsset:
      current.selectedAsset?.id === assetId
        ? updater(current.selectedAsset)
        : current.selectedAsset,
  }));
}

export function setPhiImagePreviewLoading(scopeKey: string, loading: boolean) {
  phiImagePreviewStore.patch(scopeKey, (current) => ({ ...current, loading }));
}

export function setPhiImagePreviewError(scopeKey: string, error: string | null) {
  phiImagePreviewStore.patch(scopeKey, (current) => ({ ...current, error, loading: false }));
}

export function setPhiImagePreviewSelection(
  scopeKey: string,
  selectedAssetId: number | null,
  selectedVariantKey: PhiImageAssetVariantKeyValue | null,
  selectedAsset: PhiMediaAssetTile | null = null,
) {
  phiImagePreviewStore.patch(scopeKey, (current) => ({
    ...current,
    selectedAssetId,
    selectedVariantKey,
    selectedAsset,
  }));
}

export function bumpPhiImagePreviewRefreshToken(scopeKey: string) {
  phiImagePreviewStore.patch(scopeKey, (current) => ({ ...current, refreshToken: current.refreshToken + 1 }));
}

export function resetPhiImagePreviewStore(scopeKey: string) {
  phiImagePreviewStore.reset(scopeKey);
}

export function deletePhiImagePreviewStore(scopeKey: string) {
  phiImagePreviewStore.deleteScope(scopeKey);
}

/**
 * Asks for a different Space.
 *
 * Folders belong to the Space they were listed from, so the Folder filter and the page reset with it.
 */
export function setPhiImagePreviewSpace(scopeKey: string, spaceAddress: string | null) {
  phiImagePreviewStore.patch(scopeKey, (current) => ({
    ...current,
    spaceAddress: spaceAddress?.trim() || null,
    folderId: null,
    folderPath: null,
    page: 1,
    error: null,
  }));
}
