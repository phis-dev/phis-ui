import type { PhiMediaAssetFolder } from "../../types/media";

/*
 * Folders as the media Controls offer them: a tree, a path of ids, a cascader value, and back. Pure
 * functions over the folder list, shared by every binding that lets somebody pick a folder -- the
 * picker, the upload, the gallery -- and by the Asset Module's own Controller.
 */

export function buildPhiMediaFolderOptions(folders: PhiMediaAssetFolder[]) {
  const byParentId = new Map<number | null, PhiMediaAssetFolder[]>();
  for (const folder of folders) {
    const bucket = byParentId.get(folder.parentId) ?? [];
    bucket.push(folder);
    byParentId.set(folder.parentId, bucket);
  }

  for (const bucket of byParentId.values()) {
    bucket.sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id);
  }

  function visit(folder: PhiMediaAssetFolder): {
    value: number;
    label: string;
    children?: ReturnType<typeof visit>[];
  } {
    const children = (byParentId.get(folder.id) ?? []).map((child) => visit(child));
    return children.length > 0
      ? { value: folder.id, label: folder.name, children }
      : { value: folder.id, label: folder.name };
  }

  return (byParentId.get(null) ?? []).map((folder) => visit(folder));
}

export function buildPhiMediaFolderPathById(folders: PhiMediaAssetFolder[], folderId: number | null) {
  if (folderId == null) {
    return [];
  }

  const byId = new Map(folders.map((folder) => [folder.id, folder] as const));
  const path: number[] = [];
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

    path.unshift(folder.id);
    currentId = folder.parentId;
  }

  return path;
}

export function buildPhiMediaFolderValueById(folders: PhiMediaAssetFolder[], folderId: number | null) {
  const path = buildPhiMediaFolderPathById(folders, folderId);
  return path.length > 0 ? `/${path.join("/")}` : "/";
}

export function buildPhiMediaFolderCascaderOptions(folders: PhiMediaAssetFolder[]) {
  return [...folders]
    .sort((left, right) => {
      const leftPath = buildPhiMediaFolderPathById(folders, left.id);
      const rightPath = buildPhiMediaFolderPathById(folders, right.id);
      return leftPath.length - rightPath.length || left.sortOrder - right.sortOrder || left.id - right.id;
    })
    .map((folder) => ({
      value: buildPhiMediaFolderValueById(folders, folder.id),
      label: folder.name,
    }));
}

export function resolvePhiMediaFolderIdFromValue(folders: PhiMediaAssetFolder[], value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed === "/") {
    return null;
  }

  const lastSegment = trimmed.split("/").filter(Boolean).at(-1);
  if (!lastSegment) {
    return null;
  }

  const folderId = Number(lastSegment);
  return Number.isInteger(folderId) && folders.some((folder) => folder.id === folderId) ? folderId : null;
}

export function combinePhiMediaFlagValues(presentationFlags: number[]) {
  return presentationFlags.reduce((accumulator, flag) => accumulator | flag, 0);
}
