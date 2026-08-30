import type { PhiDeveloperBuilderArea } from "../plugins/runtime-modules/builder/developer-workspace-types";
import {
  resolvePhiBuilderCmsStoragePathForCatalog,
  type PhiPresetPageNode,
} from "./cms-page-catalog";

export function resolvePhiBuilderCmsStoragePath(
  area: PhiDeveloperBuilderArea,
  pageKey: string,
  pages: readonly PhiPresetPageNode[],
) {
  return resolvePhiBuilderCmsStoragePathForCatalog(area, pageKey, pages);
}

export function resolvePhiBuilderCmsFetchPath(
  area: PhiDeveloperBuilderArea,
  pageKey: string,
  pages: readonly PhiPresetPageNode[],
) {
  const storagePath = resolvePhiBuilderCmsStoragePath(area, pageKey, pages);

  if (area === "public") {
    return storagePath;
  }

  if (storagePath === "/") {
    return `/${area}`;
  }

  return `/${area}${storagePath}`;
}

export function resolvePhiBuilderNavigationTargetPath(
  area: PhiDeveloperBuilderArea,
  pageKey: string,
  pages: readonly PhiPresetPageNode[],
) {
  const storagePath = resolvePhiBuilderCmsStoragePath(area, pageKey, pages);

  if (area === "public") {
    return storagePath === "/" ? "/public" : `/public${storagePath}`;
  }

  if (storagePath === "/") {
    return `/${area}`;
  }

  return `/${area}${storagePath}`;
}
