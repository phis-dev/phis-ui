import "server-only";

import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";
import type { PhiPublicMediaAssetReference } from "../types/media";
import { throwPhiCmsGatewayError } from "./errors";
import { readPhiPublicMediaAssetReference } from "./internal-references";

export type PhiMediaFolderImagesSort = "name_asc" | "created_at_desc";

/**
 * The public pictures of a Media Folder (`/api/v1/site/media/folder-images`), in the projection the
 * reference resolver answers for named Assets, so whoever draws one draws the other.
 *
 * Read with the internal token: a public render has no Media session, and the library's own listing
 * wants one. The server decides what is public; a Folder outside the Site Space answers empty.
 */
export async function listPhiPublicMediaFolderImages(input: {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  folderId: number;
  subfolders: boolean;
  sort: PhiMediaFolderImagesSort;
  limit: number;
}): Promise<PhiPublicMediaAssetReference[]> {
  const query = new URLSearchParams({
    folderId: String(input.folderId),
    subfolders: input.subfolders ? "1" : "0",
    sort: input.sort,
    limit: String(input.limit),
  });
  const response = await fetch(buildApiUrl(input.apiBaseUrl, `/api/v1/site/media/folder-images?${query}`), {
    headers: buildApiHeaders({
      token: input.internalToken,
      siteKey: input.siteKey,
      includeToken: true,
      includeSiteKey: true,
      gateway: true,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throwPhiCmsGatewayError(`Failed to read the media folder's pictures (${response.status}).`, response.status);
  }
  const payload = (await response.json().catch(() => null)) as { assets?: unknown } | null;
  if (!Array.isArray(payload?.assets)) {
    throw new Error("Missing media folder picture projection.");
  }
  return payload.assets.map(readPhiPublicMediaAssetReference);
}
