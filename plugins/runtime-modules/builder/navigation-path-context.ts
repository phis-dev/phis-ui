import { flattenPhiPresetPages } from "./page-tree-walk";
import type { PhiBuilderNavigationItem } from "../../../helpers/cms-navigation-catalog";
import { resolvePhiCmsAreaAsBuilderArea, type PhiBuilderAreaKey } from "../../../constants/cms-areas";
import {
  normalizePhiBuilderCmsCatalogPath,
  resolvePhiBuilderActivePageCatalog,
  type PhiPresetPageNode,
} from "../../../helpers/cms-page-catalog";
import { resolvePhiBuilderCmsStoragePath, resolvePhiBuilderNavigationTargetPath } from "../../../helpers/cms-paths";
import type { PhiDeveloperBuilderWorkspaceState } from "./developer-workspace-types";

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
  /*
   * Keyed by Area, because a link may point into one that is not being edited and only that Area's
   * catalog holds its Page. Reading everything out of the edited Area is what made such a link show no
   * path at all: the reference was right, the catalog looked in was the wrong one, and a Page that is
   * merely absent from a list reads exactly like a Page that has been deleted.
   */
  const catalogByArea = new Map<PhiBuilderAreaKey, {
    pages: PhiPresetPageNode[];
    pagePaths: Map<string, NavigationPageTarget>;
  }>();
  const readArea = (area: PhiBuilderAreaKey) => {
    const cached = catalogByArea.get(area);
    if (cached) return cached;
    const areaPages = resolvePhiBuilderActivePageCatalog(
      area,
      state.modulePresetPagesByArea,
      state.customPages,
      state.persistedPageCatalogByArea,
    );
    const pagePaths = new Map<string, NavigationPageTarget>(
      flattenPhiPresetPages(areaPages).filter((page) => page.reference).map((page) => [page.reference!, {
        path: resolvePhiBuilderNavigationTargetPath(area, page.key, areaPages),
        address: normalizePhiBuilderCmsCatalogPath(resolvePhiBuilderCmsStoragePath(area, page.key, areaPages)),
        deleted: page.tombstoned === true,
      }]),
    );
    const entry = { pages: areaPages, pagePaths };
    catalogByArea.set(area, entry);
    return entry;
  };

  const { pages, pagePaths } = readArea(state.area);
  const pageOptions = flattenPhiPresetPages(pages)
    .filter((page) => page.reference && page.tombstoned !== true)
    .map((page) => ({ value: page.reference!, label: pagePaths.get(page.reference!)!.path }));
  const resolveLinkPath = (item: PhiBuilderNavigationItem) => {
    if (item.kind !== "link" || item.external === true) return null;
    if (item.targetReference) {
      const area = item.targetArea ? resolvePhiCmsAreaAsBuilderArea(item.targetArea) : state.area;
      const target = area ? readArea(area).pagePaths.get(item.targetReference) : undefined;
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
