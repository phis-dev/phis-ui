import { PHI_MEDIA_SPACE_KINDS } from "@phis/contracts/media";

import { PhiImageAssetVariantKey, PhiMediaKind, resolvePhiMediaKindFromContentType } from "../../constants/media";
import type {
  PhiMediaAsset,
  PhiMediaAssetFolder,
  PhiMediaAssetTile,
  PhiMediaAssetVariant,
  PhiMediaPickerPagination,
  PhiMediaSpaceOption,
} from "../../types/media";
import {
  createPhiResponseReader,
  requirePhiField,
  type PhiConfigReader,
} from "../widgets/config/strict-config-reader";

export type PhiImagePreviewApiRecord = Omit<PhiMediaAsset, "kind"> & {
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
};

/*
 * The media API's answer, read field by field.
 *
 * It was cast to its type on arrival, and every reader after it cast again from the Collection's untyped
 * items. A field the server stopped sending, or sent under another name, came through as `undefined`
 * under a type that said otherwise -- the tile type promised a `checksumSha256` the server has never
 * sent. Now a wrong answer is an error naming the field, at the one place the answer arrives, and what a
 * Collection carries afterwards is read with the same readers rather than cast.
 */
const PHI_MEDIA_LISTING = "The media listing";
const PHI_MEDIA_VARIANT_KEYS = Object.values(PhiImageAssetVariantKey);
const PHI_MEDIA_KINDS = Object.values(PhiMediaKind);

const nullableInteger = (reader: PhiConfigReader, key: string) => reader.integer(key) ?? null;
const nullableNumber = (reader: PhiConfigReader, key: string) => reader.number(key) ?? null;
const nullableString = (reader: PhiConfigReader, key: string) => reader.string(key) ?? null;
const requiredInteger = (reader: PhiConfigReader, key: string) =>
  requirePhiField(reader, key, "a whole number", reader.integer);
const requiredString = (reader: PhiConfigReader, key: string) =>
  requirePhiField(reader, key, "a text", reader.string);

function readPhiMediaFolderFields(reader: PhiConfigReader): PhiMediaAssetFolder {
  const createdAt = reader.string("createdAt");
  const updatedAt = reader.string("updatedAt");
  return {
    id: requiredInteger(reader, "id"),
    siteId: requiredInteger(reader, "siteId"),
    spaceId: requiredInteger(reader, "spaceId"),
    parentId: nullableInteger(reader, "parentId"),
    name: requiredString(reader, "name"),
    sortOrder: requiredInteger(reader, "sortOrder"),
    flags: requiredInteger(reader, "flags"),
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

function readPhiMediaSpaceFields(reader: PhiConfigReader): PhiMediaSpaceOption {
  return {
    id: nullableInteger(reader, "id"),
    address: requiredString(reader, "address"),
    kind: requirePhiField(reader, "kind", "a Media Space kind", (key) => reader.oneOf(key, PHI_MEDIA_SPACE_KINDS)),
    groupId: nullableInteger(reader, "groupId"),
    name: nullableString(reader, "name"),
    quotaBytes: nullableInteger(reader, "quotaBytes"),
    usedBytes: requiredInteger(reader, "usedBytes"),
    reservedBytes: requiredInteger(reader, "reservedBytes"),
  };
}

function readPhiMediaPaginationFields(reader: PhiConfigReader): PhiMediaPickerPagination {
  const total = reader.integer("total");
  return {
    page: requiredInteger(reader, "page"),
    pageSize: requiredInteger(reader, "pageSize"),
    ...(total === undefined ? {} : { total }),
    hasMore: requirePhiField(reader, "hasMore", "true or false", reader.boolean),
  };
}

function readPhiMediaVariantFields(reader: PhiConfigReader): PhiMediaAssetVariant {
  const createdAt = reader.string("createdAt");
  const updatedAt = reader.string("updatedAt");
  return {
    assetId: requiredInteger(reader, "assetId"),
    variantKey: requirePhiField(reader, "variantKey", "an image variant key", (key) => reader.oneOf(key, PHI_MEDIA_VARIANT_KEYS)),
    deliveryUrl: requiredString(reader, "deliveryUrl"),
    contentType: requiredString(reader, "contentType"),
    bytes: nullableInteger(reader, "bytes"),
    width: requiredInteger(reader, "width"),
    height: requiredInteger(reader, "height"),
    blurDataUrl: nullableString(reader, "blurDataUrl"),
    flags: requiredInteger(reader, "flags"),
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

/** One Asset as the media API sends it; `kind` is derived from the content type, not taken. */
function readPhiMediaAssetFields(reader: PhiConfigReader): PhiImagePreviewApiRecord {
  const createdAt = reader.string("createdAt");
  const updatedAt = reader.string("updatedAt");
  const variantVersion = reader.integer("variantVersion");
  const folder = reader.object("folder", readPhiMediaFolderFields);
  const variants = reader.list("variants", readPhiMediaVariantFields);
  return {
    id: requiredInteger(reader, "id"),
    siteId: requiredInteger(reader, "siteId"),
    spaceId: requiredInteger(reader, "spaceId"),
    folderId: nullableInteger(reader, "folderId"),
    createdByUserId: nullableInteger(reader, "createdByUserId"),
    updatedByUserId: nullableInteger(reader, "updatedByUserId"),
    ...(variantVersion === undefined ? {} : { variantVersion }),
    deliveryUrl: requiredString(reader, "deliveryUrl"),
    originalName: requiredString(reader, "originalName"),
    contentType: requiredString(reader, "contentType"),
    bytes: nullableInteger(reader, "bytes"),
    width: nullableNumber(reader, "width"),
    height: nullableNumber(reader, "height"),
    blurDataUrl: nullableString(reader, "blurDataUrl"),
    thumbnailUrl: nullableString(reader, "thumbnailUrl"),
    previewUrl: nullableString(reader, "previewUrl"),
    meta: reader.value("meta", "an object", (value) => (isPlainRecord(value) ? value : undefined)) ?? null,
    title: nullableString(reader, "title"),
    altText: nullableString(reader, "altText"),
    lifecycleStatus: requiredInteger(reader, "lifecycleStatus"),
    deliveryPolicy: requiredInteger(reader, "deliveryPolicy"),
    deliveryRevision: requiredInteger(reader, "deliveryRevision"),
    presentationFlags: requiredInteger(reader, "presentationFlags"),
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    ...(folder ? { folder } : {}),
    ...(variants ? { variants } : {}),
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The media API's Folders, read strictly; `source` names who answered. */
export function readPhiMediaFolders(value: unknown, source = PHI_MEDIA_LISTING): PhiMediaAssetFolder[] {
  return createPhiResponseReader({ folders: value }, source).list("folders", readPhiMediaFolderFields) ?? [];
}

/** The media API's Spaces, read strictly. */
export function readPhiMediaSpaces(value: unknown, source = PHI_MEDIA_LISTING): PhiMediaSpaceOption[] {
  return createPhiResponseReader({ spaces: value }, source).list("spaces", readPhiMediaSpaceFields) ?? [];
}

/** One Space, or `null` where none is reported. */
export function readPhiMediaSpace(value: unknown, source = PHI_MEDIA_LISTING): PhiMediaSpaceOption | null {
  return createPhiResponseReader({ activeSpace: value }, source).object("activeSpace", readPhiMediaSpaceFields) ?? null;
}

/** The paging the media API reports, or `null` where it reports none. */
export function readPhiMediaPagination(value: unknown, source = PHI_MEDIA_LISTING): PhiMediaPickerPagination | null {
  return createPhiResponseReader({ pagination: value }, source).object("pagination", readPhiMediaPaginationFields) ?? null;
}

/**
 * The tiles a media Collection carries. The provider read them from the API already; a Collection
 * holds items of no particular type, so whoever takes them out reads them again instead of casting.
 */
export function readPhiMediaAssetTiles(value: unknown, source = PHI_MEDIA_LISTING): PhiMediaAssetTile[] {
  return createPhiResponseReader({ assets: value }, source).list("assets", (reader): PhiMediaAssetTile => {
    const variantVersion = reader.integer("variantVersion");
    const meta = reader.value("meta", "an object", (entry) => (isPlainRecord(entry) ? entry : undefined));
    const blurDataUrl = reader.string("blurDataUrl");
    const folder = reader.object("folder", (folderReader) => ({
      id: requiredInteger(folderReader, "id"),
      name: requiredString(folderReader, "name"),
    }));
    return {
      id: requiredInteger(reader, "id"),
      siteId: requiredInteger(reader, "siteId"),
      spaceId: requiredInteger(reader, "spaceId"),
      folderId: nullableInteger(reader, "folderId"),
      createdByUserId: nullableInteger(reader, "createdByUserId"),
      updatedByUserId: nullableInteger(reader, "updatedByUserId"),
      ...(variantVersion === undefined ? {} : { variantVersion }),
      originalName: requiredString(reader, "originalName"),
      title: nullableString(reader, "title"),
      altText: nullableString(reader, "altText"),
      deliveryUrl: requiredString(reader, "deliveryUrl"),
      thumbnailUrl: nullableString(reader, "thumbnailUrl"),
      previewUrl: nullableString(reader, "previewUrl"),
      contentType: requiredString(reader, "contentType"),
      kind: requirePhiField(reader, "kind", "a media kind", (key) => reader.oneOf(key, PHI_MEDIA_KINDS)),
      width: nullableNumber(reader, "width"),
      height: nullableNumber(reader, "height"),
      bytes: nullableInteger(reader, "bytes"),
      lifecycleStatus: requiredInteger(reader, "lifecycleStatus"),
      deliveryPolicy: requiredInteger(reader, "deliveryPolicy"),
      deliveryRevision: requiredInteger(reader, "deliveryRevision"),
      presentationFlags: requiredInteger(reader, "presentationFlags"),
      ...(blurDataUrl === undefined ? {} : { blurDataUrl }),
      ...(meta === undefined ? {} : { meta }),
      folder: folder ?? null,
    };
  }) ?? [];
}

const PHI_SVG_MEDIA_MIN_DISPLAY_DIMENSION = 48;

function normalizePhiImagePreviewAsset(asset: PhiImagePreviewApiRecord): PhiMediaAsset {
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
  const payload: unknown = await response.json();
  if (!response.ok) {
    const error = isPlainRecord(payload) && typeof payload.error === "string" ? payload.error : null;
    throw new Error(error ?? "Failed to load media assets.");
  }
  const reader = createPhiResponseReader(payload, PHI_MEDIA_LISTING);
  const folders = reader.list("folders", readPhiMediaFolderFields) ?? [];
  const asset = reader.object("asset", readPhiMediaAssetFields);

  return {
    activeSpace: reader.object("activeSpace", readPhiMediaSpaceFields) ?? null,
    spaces: reader.list("spaces", readPhiMediaSpaceFields) ?? [],
    assets: (reader.list("assets", readPhiMediaAssetFields) ?? [])
      .map((entry) => normalizePhiImagePreviewTile(entry, folders)),
    folders,
    pagination: reader.object("pagination", readPhiMediaPaginationFields) ?? null,
    asset: asset ? normalizePhiImagePreviewAsset(asset) : null,
  };
}
