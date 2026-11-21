import { PHI_MEDIA_FOLDER_LOCKED_CODE, PHI_MEDIA_UPLOAD_FOLDER_LOCKED_CODE } from "./media-folder-lock";
import type { PhiMediaUploadLabels } from "./media-upload-labels";

/**
 * The words for a refusal code the upload path has words for, or `null` for any other code.
 *
 * Shared with every surface that takes a file into the library by another way and meets the library's own
 * refusals under the same codes -- importing from a media source is one -- so that "too large" is said
 * once, whichever way the file came.
 *
 * In a file of its own, so that a surface that only needs the words -- the Media picker, when an import
 * from a source is refused -- does not carry the upload transport with them.
 */
export function readPhiMediaUploadRefusalMessage(code: unknown, labels: PhiMediaUploadLabels): string | null {
  switch (code) {
    case "media_asset_exists": return labels.errorDuplicate;
    case "media_asset_too_large": return labels.errorTooLarge;
    case "content_type_not_allowed": return labels.errorTypeNotAllowed;
    case "media_quota_exceeded": return labels.errorQuotaExceeded;
    case "space_kind_unavailable":
    case "space_forbidden":
    case "space_not_found": return labels.errorSpaceUnavailable;
    // A presigned plan is delivered past the Site: reaching the Site says nothing about reaching the
    // Provider, so this is deliberately not the same reading as a network failure.
    case "storage_unreachable":
    case "storage_rejected": return labels.errorStorageUnreachable;
    // The second is Core's word for a Folder that is not created below a locked one, which an upload
    // into a Folder named by its path meets on the way (`resolvePhiMediaUploadFolderPathId`).
    case PHI_MEDIA_UPLOAD_FOLDER_LOCKED_CODE:
    case PHI_MEDIA_FOLDER_LOCKED_CODE: return labels.errorFolderLocked;
    default: return null;
  }
}
