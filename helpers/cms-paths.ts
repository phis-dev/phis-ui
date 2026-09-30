import type { PhiBuilderAreaKey } from "../constants/cms-areas";
import {
  resolvePhiBuilderCmsStoragePathForCatalog,
  type PhiPresetPageNode,
} from "./cms-page-catalog";

export function resolvePhiBuilderCmsStoragePath(
  area: PhiBuilderAreaKey,
  pageKey: string,
  pages: readonly PhiPresetPageNode[],
) {
  return resolvePhiBuilderCmsStoragePathForCatalog(area, pageKey, pages);
}

/** A storage path under its Area's segment: `/` is the Area itself. */
function prefixPhiBuilderAreaPath(area: PhiBuilderAreaKey, storagePath: string) {
  return storagePath === "/" ? `/${area}` : `/${area}${storagePath}`;
}

export function resolvePhiBuilderCmsFetchPath(
  area: PhiBuilderAreaKey,
  pageKey: string,
  pages: readonly PhiPresetPageNode[],
) {
  const storagePath = resolvePhiBuilderCmsStoragePath(area, pageKey, pages);
  return area === "public" ? storagePath : prefixPhiBuilderAreaPath(area, storagePath);
}

export function resolvePhiBuilderNavigationTargetPath(
  area: PhiBuilderAreaKey,
  pageKey: string,
  pages: readonly PhiPresetPageNode[],
) {
  return prefixPhiBuilderAreaPath(area, resolvePhiBuilderCmsStoragePath(area, pageKey, pages));
}
