import "server-only";

import { listPhiPublicMediaFolderImages, type PhiMediaFolderImagesSort } from "../../../../gateway/media-folder-images";
import type { PhiRuntimeRecordProviderResolver } from "../../../../types/record-provider";
import {
  PHI_MEDIA_FOLDER_IMAGES_DEFAULT_LIMIT,
  PHI_MEDIA_FOLDER_IMAGES_MAX_LIMIT,
  PHI_MEDIA_FOLDER_IMAGES_SORTS,
} from "../data-providers";

function readFolderId(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function readSort(value: unknown): PhiMediaFolderImagesSort {
  return (PHI_MEDIA_FOLDER_IMAGES_SORTS as readonly unknown[]).includes(value)
    ? value as PhiMediaFolderImagesSort
    : "name_asc";
}

function readLimit(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return PHI_MEDIA_FOLDER_IMAGES_DEFAULT_LIMIT;
  return Math.min(parsed, PHI_MEDIA_FOLDER_IMAGES_MAX_LIMIT);
}

/**
 * The media folder pictures record Provider (`PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.folderImages`): the
 * public pictures of the Folder the binding names, or `null` where it names none yet.
 *
 * An empty Folder is a record -- an empty list -- and not a missing one: the Folder is there, it just
 * holds nothing a visitor may see. A binding without a Folder is what a Gallery looks like before its
 * author has chosen one.
 */
export const resolvePhiMediaFolderImagesRecord: PhiRuntimeRecordProviderResolver = async (params, context) => {
  const folderId = readFolderId(params.folderId);
  if (folderId == null) {
    return null;
  }
  return listPhiPublicMediaFolderImages({
    apiBaseUrl: context.apiBaseUrl,
    internalToken: context.internalToken,
    siteKey: context.siteKey,
    folderId,
    subfolders: params.topLevelOnly !== true,
    sort: readSort(params.sort),
    limit: readLimit(params.limit),
  });
};
