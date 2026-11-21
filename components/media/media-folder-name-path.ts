import type { PhiMediaAssetFolder } from "../../types/media";

/*
 * A Folder named by its path of names rather than its id: what a setting states that a preset writes for
 * every Site (the `area-upload` Widget's `folderPath`) and what the Asset Controller's `path` signal may
 * carry. Pure and without runtime imports, because the upload transport reads it and every upload surface carries
 * the transport.
 */

/**
 * A Folder named by its path, written the way a person types it and Core reads it: names from the root
 * down, separated by `/` ("Summer 2024 / Costa Rica"). Each name is trimmed and its whitespace folded the
 * way Core stores a Folder's name, and empty names -- a leading or doubled `/` -- are dropped.
 */
export function splitPhiMediaFolderNamePath(value: string | null | undefined) {
  return (value ?? "")
    .split("/")
    .map((segment) => segment.replace(/\s+/gu, " ").trim())
    .filter(Boolean);
}

/**
 * How far a path of names leads through these Folders: the deepest Folder it reaches and how many of its
 * names that took. Names are matched without regard to case, as Core matches them. `depth` equal to the
 * path's length means the whole path is there; otherwise the names from `depth` on are missing below
 * `folderId` (`null`, the root, when not even the first is there).
 */
export function findPhiMediaFolderByNamePath(
  folders: readonly Pick<PhiMediaAssetFolder, "id" | "parentId" | "name">[],
  path: readonly string[],
) {
  let folderId: number | null = null;
  let depth = 0;
  for (const name of path) {
    const wanted = name.toLowerCase();
    const next = folders.find((folder) => folder.parentId === folderId && folder.name.toLowerCase() === wanted);
    if (!next) break;
    folderId = next.id;
    depth += 1;
  }
  return { folderId, depth };
}
