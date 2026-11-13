import { describe, expect, it } from "vitest";

import { PhiMediaFolderFlags } from "../../constants/media";
import type { PhiMediaAssetFolder } from "../../types/media";
import {
  PhiMediaFolderLockedError,
  isPhiMediaFolderIdLocked,
  isPhiMediaFolderLockedError,
  writePhiMediaFolderLock,
} from "./media-folder-lock";
import { buildPhiMediaFolderCascaderOptions } from "./media-folder-options";
import { PHI_MEDIA_UPLOAD_DEFAULT_LABELS, readPhiMediaUploadErrorMessage } from "./phi-media-upload";

function folder(id: number, flags: number, parentId: number | null = null): PhiMediaAssetFolder {
  return { id, siteId: 1, spaceId: 1, parentId, name: `Folder ${id}`, sortOrder: 0, flags };
}

const folders = [
  folder(1, PhiMediaFolderFlags.Locked | PhiMediaFolderFlags.Collapsed),
  folder(2, 0, 1),
];

describe("a locked media Folder", () => {
  it("is read from its flags, by id, and the root never is", () => {
    expect(isPhiMediaFolderIdLocked(folders, 1)).toBe(true);
    expect(isPhiMediaFolderIdLocked(folders, 2)).toBe(false);
    expect(isPhiMediaFolderIdLocked(folders, null)).toBe(false);
    expect(isPhiMediaFolderIdLocked(folders, 404)).toBe(false);
  });

  it("is locked and unlocked by its one bit, every other flag kept", () => {
    const collapsed = PhiMediaFolderFlags.Collapsed;
    expect(writePhiMediaFolderLock(collapsed, true)).toBe(collapsed | PhiMediaFolderFlags.Locked);
    expect(writePhiMediaFolderLock(collapsed | PhiMediaFolderFlags.Locked, false)).toBe(collapsed);
    expect(writePhiMediaFolderLock(0, false)).toBe(0);
  });

  it("is drawn with a lock and named where the caller has the word, and stays selectable", () => {
    expect(buildPhiMediaFolderCascaderOptions(folders, { lockedLabel: "Locked" })).toEqual([
      { value: "/1", label: "Folder 1", icon: "lock", description: "Locked" },
      { value: "/1/2", label: "Folder 2" },
    ]);
    expect(buildPhiMediaFolderCascaderOptions(folders)[0]).toEqual({ value: "/1", label: "Folder 1", icon: "lock" });
  });

  it("is a refusal a surface can read as one", () => {
    expect(isPhiMediaFolderLockedError(new PhiMediaFolderLockedError())).toBe(true);
    expect(isPhiMediaFolderLockedError({ code: "media_folder_locked" })).toBe(true);
    expect(isPhiMediaFolderLockedError(new Error("The Media Folder is locked."))).toBe(false);
    expect(isPhiMediaFolderLockedError(null)).toBe(false);
  });

  it("reads as the upload's own text when the upload route refuses it", () => {
    expect(readPhiMediaUploadErrorMessage({ code: "folder_locked" }, PHI_MEDIA_UPLOAD_DEFAULT_LABELS))
      .toBe(PHI_MEDIA_UPLOAD_DEFAULT_LABELS.errorFolderLocked);
  });
});
