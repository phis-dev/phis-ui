import { PhiMediaFolderFlags } from "../../constants/media";
import type { PhiMediaAssetFolder } from "../../types/media";

/*
 * A locked Folder, as the media surfaces read it.
 *
 * Core enforces the lock: a locked Folder is not renamed, moved or deleted, and nothing is created in it,
 * uploaded into it, moved into or out of it or deleted from it. Its one change is its flags, which is
 * how it is unlocked again. These readers only keep the surfaces from offering what Core would refuse,
 * and say why when it refuses anyway -- somebody else may have locked the Folder in the meantime.
 */

/** The code Core answers a write that touches a locked Folder with (`409`). */
export const PHI_MEDIA_FOLDER_LOCKED_CODE = "media_folder_locked";

/**
 * The reason the upload route gives for the same refusal. The upload path names its refusals in a
 * vocabulary of its own (`readPhiMediaUploadErrorMessage`), and this is the word it uses for a lock.
 */
export const PHI_MEDIA_UPLOAD_FOLDER_LOCKED_CODE = "folder_locked";

export function isPhiMediaFolderLocked(folder: Pick<PhiMediaAssetFolder, "flags"> | null | undefined) {
  return folder != null && (folder.flags & PhiMediaFolderFlags.Locked) !== 0;
}

/** Whether the Folder with this id is locked; the root and a Folder not in the list are not. */
export function isPhiMediaFolderIdLocked(folders: readonly PhiMediaAssetFolder[], folderId: number | null | undefined) {
  if (folderId == null) return false;
  return isPhiMediaFolderLocked(folders.find((folder) => folder.id === folderId));
}

/** The Folder's flags with the lock set or cleared, every other flag left as it was. */
export function writePhiMediaFolderLock(flags: number, locked: boolean) {
  return locked ? flags | PhiMediaFolderFlags.Locked : flags & ~PhiMediaFolderFlags.Locked;
}

/** A refusal because a Folder is locked, carried with Core's code so a surface can read it as one. */
export class PhiMediaFolderLockedError extends Error {
  readonly code = PHI_MEDIA_FOLDER_LOCKED_CODE;

  constructor(message = "The Media Folder is locked.") {
    super(message);
    this.name = "PhiMediaFolderLockedError";
  }
}

export function isPhiMediaFolderLockedError(error: unknown) {
  return (error as { code?: unknown } | null)?.code === PHI_MEDIA_FOLDER_LOCKED_CODE;
}
