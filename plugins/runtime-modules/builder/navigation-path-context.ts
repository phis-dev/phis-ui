import type { PhiBuilderNavigationItem } from "../../../helpers/cms-navigation-catalog";
import {
  normalizePhiBuilderCmsCatalogPath,
  resolvePhiBuilderActivePageCatalog,
  type PhiPresetPageNode,
} from "../../../helpers/cms-page-catalog";
import { resolvePhiBuilderCmsStoragePath, resolvePhiBuilderNavigationTargetPath } from "../../../helpers/cms-paths";
import type { PhiDeveloperBuilderWorkspaceState } from "./developer-workspace-types";

function flattenPages(pages: readonly PhiPresetPageNode[]): PhiPresetPageNode[] {
  return pages.flatMap((page) => [page, ...flattenPages(page.children ?? [])]);
}

type NavigationPageTarget = {
  /** What the table shows, with the Area prefix the Builder addresses the Page by. */
  path: string;
  /** Area-relative, package namespace included: the form a folder address takes. */
  address: string;
  deleted: boolean;
};

/**
 * The page catalog as the Navigation table needs it: each Page's shown path and address, the choices a
 * Site page link offers, and how a link resolves to the path a folder address is built from.
 */
export function createPhiBuilderNavigationPathContext(
  state: Pick<PhiDeveloperBuilderWorkspaceState, "area" | "modulePresetPagesByArea" | "customPages" | "persistedPageCatalogByArea">,
) {
  const pages = resolvePhiBuilderActivePageCatalog(
    state.area,
    state.modulePresetPagesByArea,
    state.customPages,
    state.persistedPageCatalogByArea,
  );
  const referenced = flattenPages(pages).filter((page) => page.reference);
  const pagePaths = new Map<string, NavigationPageTarget>(referenced.map((page) => [page.reference!, {
    path: resolvePhiBuilderNavigationTargetPath(state.area, page.key, pages),
    address: normalizePhiBuilderCmsCatalogPath(resolvePhiBuilderCmsStoragePath(state.area, page.key, pages)),
    deleted: page.tombstoned === true,
  }]));
  const pageOptions = referenced
    .filter((page) => page.tombstoned !== true)
    .map((page) => ({ value: page.reference!, label: pagePaths.get(page.reference!)!.path }));
  const resolveLinkPath = (item: PhiBuilderNavigationItem) => {
    if (item.kind !== "link" || item.external === true) return null;
    if (item.targetReference) {
      const target = pagePaths.get(item.targetReference);
      return target && !target.deleted ? target.address : null;
    }
    // A Module link's target path is its route path: Area-relative, package namespace included.
    return item.href;
  };
  // Folder addresses are Area-relative; the table shows them with the same prefix as a page link's path.
  const displayAddress = (address: string) =>
    state.area === "public" ? `/public${address}` : `/${state.area}${address}`;
  return { pages, pagePaths, pageOptions, resolveLinkPath, displayAddress };
}
