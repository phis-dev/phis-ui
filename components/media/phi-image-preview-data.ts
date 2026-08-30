import { resolvePhiMediaKindFromContentType } from "../../constants/media";
import type {
  PhiMediaAsset,
  PhiMediaAssetFolder,
  PhiMediaAssetTile,
  PhiMediaPickerPagination,
  PhiMediaSpaceOption,
} from "../../types/media";

export type PhiImagePreviewApiRecord = Omit<PhiMediaAsset, "kind"> & {
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
};

export type PhiImagePreviewApiResponse = {
  activeSpace?: PhiMediaSpaceOption;
  spaces?: PhiMediaSpaceOption[];
  assets?: PhiImagePreviewApiRecord[];
  folders?: PhiMediaAssetFolder[];
  pagination?: PhiMediaPickerPagination;
  asset?: PhiImagePreviewApiRecord;
  error?: string;
};

const PHI_SVG_MEDIA_MIN_DISPLAY_DIMENSION = 48;

export function normalizePhiImagePreviewAsset(asset: PhiImagePreviewApiRecord): PhiMediaAsset {
  return {
    ...asset,
    kind: resolvePhiMediaKindFromContentType(asset.contentType),
  };
}

export function resolvePhiMediaAssetDisplayDimensions(asset: Pick<PhiMediaAssetTile, "contentType" | "width" | "height">) {
  const width = asset.width ?? null;
  const height = asset.height ?? null;
  if (!width || !height) {
    return null;
  }

  if (asset.contentType.trim().toLowerCase().split(";", 1)[0] !== "image/svg+xml") {
    return { width, height };
  }

  const shortestSide = Math.min(width, height);
  if (shortestSide >= PHI_SVG_MEDIA_MIN_DISPLAY_DIMENSION) {
    return { width, height };
  }

  const scale = PHI_SVG_MEDIA_MIN_DISPLAY_DIMENSION / shortestSide;
  return {
    width: Math.max(PHI_SVG_MEDIA_MIN_DISPLAY_DIMENSION, Math.round(width * scale)),
    height: Math.max(PHI_SVG_MEDIA_MIN_DISPLAY_DIMENSION, Math.round(height * scale)),
  };
}

export function normalizePhiImagePreviewTile(
  asset: PhiImagePreviewApiRecord,
  folders: PhiMediaAssetFolder[],
): PhiMediaAssetTile {
  const normalizedAsset = normalizePhiImagePreviewAsset(asset);
  const folder =
    normalizedAsset.folderId != null
      ? folders.find((folderItem) => folderItem.id === normalizedAsset.folderId) ?? null
      : null;

  return {
    ...normalizedAsset,
    thumbnailUrl: normalizedAsset.kind === "image" ? asset.thumbnailUrl ?? null : null,
    previewUrl: normalizedAsset.kind === "image" ? asset.previewUrl ?? null : null,
    folder: folder ? { id: folder.id, name: folder.name } : null,
  };
}

export function buildPhiImagePreviewFolderPathSegments(folders: PhiMediaAssetFolder[], folderId: number | null) {
  if (folderId == null) {
    return [];
  }

  const byId = new Map(folders.map((folder) => [folder.id, folder] as const));
  const path: string[] = [];
  const visited = new Set<number>();
  let currentId: number | null = folderId;

  while (currentId != null) {
    if (visited.has(currentId)) {
      break;
    }
    visited.add(currentId);

    const folder = byId.get(currentId);
    if (!folder) {
      break;
    }

    path.unshift(folder.name);
    currentId = folder.parentId;
  }

  return path;
}

export function normalizePhiImagePreviewSelectionAsset(tile: PhiMediaAssetTile): PhiMediaAsset {
  const rest = { ...tile };
  delete rest.thumbnailUrl;
  delete rest.previewUrl;
  delete rest.folder;

  return {
    ...rest,
    kind: tile.kind,
    blurDataUrl: tile.blurDataUrl ?? null,
    meta: tile.meta ?? null,
    folder: null,
    variants: null,
  };
}

export async function readPhiImagePreviewResponse(response: Response) {
  const payload = (await response.json()) as PhiImagePreviewApiResponse;
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load media assets.");
  }

  return {
    activeSpace: payload.activeSpace ?? null,
    spaces: payload.spaces ?? [],
    assets: (payload.assets ?? []).map((asset) => normalizePhiImagePreviewTile(asset, payload.folders ?? [])),
    folders: payload.folders ?? [],
    pagination: payload.pagination ?? null,
    asset: payload.asset ? normalizePhiImagePreviewAsset(payload.asset) : null,
  };
}
