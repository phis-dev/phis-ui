import { readPhiDotPath } from "../../helpers/dot-path";
import type { PhiMediaAssetFolder } from "../../types/media";

/*
 * A Folder named by its path of names rather than its id: what a setting states that a preset writes for
 * every Site (the `area-upload` Widget's `folderPath`) and what the Asset Controller's `path` signal may
 * carry -- with the `{key}` placeholders a path setting may hold. Pure and without runtime imports beyond
 * the dot-path reader, because the upload transport reads it and every upload surface carries the transport.
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

/* `{key}`: a value's key, a dotted path into it for a value that is a record. */
const PHI_MEDIA_FOLDER_PATH_PLACEHOLDER = /\{([A-Za-z0-9_.-]+)\}/gu;

/**
 * Whether a Folder path setting is one whose placeholders read `{key}`: every brace opens or closes one
 * (`{}`, `{a`, `a}`, `{a{b}}` do not). What the `media-asset` field's `folderPath` and the Media
 * renderer's `features.media.folderPath` are held to.
 */
export function isPhiMediaFolderPathTemplate(value: string) {
  return !/[{}]/u.test(value.replace(PHI_MEDIA_FOLDER_PATH_PLACEHOLDER, ""));
}

/*
 * A value as a Folder name: a text or a number, trimmed, and a `/` in it a `-`, so a value can name a
 * Folder but never add a level of them. Anything else -- empty, absent, a list, a record -- is no name.
 */
function readPhiMediaFolderPathValue(value: unknown) {
  const text = typeof value === "string" ? value : typeof value === "number" && Number.isFinite(value) ? String(value) : "";
  return text.replace(/\//gu, "-").replace(/\s+/gu, " ").trim();
}

/**
 * The Folder path a template of names (`splitPhiMediaFolderNamePath` of a setting) names for these
 * values: each `{key}` the value under `key` -- the `media-asset` field's Form values, the Collection
 * View's binding params for the Media renderer. A name whose placeholder has no value is left out whole
 * -- "Shop Images / {category} / {product}" without a category is "Shop Images / <product>" -- and a name
 * that comes out empty is left out too.
 */
export function resolvePhiMediaFolderPathTemplate(
  folderPath: readonly string[],
  values: Readonly<Record<string, unknown>>,
): string[] {
  return folderPath.flatMap((segment) => {
    let missing = false;
    const resolved = segment.replace(PHI_MEDIA_FOLDER_PATH_PLACEHOLDER, (_placeholder, key: string) => {
      const value = readPhiMediaFolderPathValue(readPhiDotPath(values, key));
      if (!value) missing = true;
      return value;
    }).replace(/\s+/gu, " ").trim();
    return missing || !resolved ? [] : [resolved];
  });
}
