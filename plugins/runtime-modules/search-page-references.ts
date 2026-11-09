import { createPhiPageReference, type PhiLinkTarget } from "../../types/references";
import type { PhiCmsAreaKey } from "../../constants/cms-areas";
import { PHI_SHARED_PACKAGE_NAME } from "../../constants/package";
import { createPhiRuntimeModuleId } from "../../constants/module-identity";
import { PHI_PUBLIC_BASE_PAGE_REFERENCES } from "./public-base-page-references";

/**
 * The search results Pages (SEARCH.md), one per Area that is indexed, named once.
 *
 * The App base brings its own rather than sending a signed-in reader to the Public one: the App's
 * results Page searches App and Public, the Public one only Public, and which Area a reader stands in
 * is what decides between them. The Search Box Widget reads the Area it is placed in and links to that
 * Area's Page unless its author chose another; the Pages themselves are declared beside the other base
 * Pages of their Modules, with the keys from here so the two cannot drift.
 *
 * Kept apart from the Module folders for the reason `public-base-page-references.ts` is: a Core Widget
 * links to these Pages, and importing them from beside the trees would compile the whole Module with it.
 */
export const PHI_APP_SEARCH_PAGE_PRESET_KEY = "app-search-page";

const PHI_APP_RUNTIME_MODULE_ID = createPhiRuntimeModuleId(PHI_SHARED_PACKAGE_NAME, "app");

const PHI_APP_SEARCH_PAGE_REFERENCE = createPhiPageReference({
  kind: "module",
  ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
  presetKey: PHI_APP_SEARCH_PAGE_PRESET_KEY,
});

/**
 * Where a Search Box in `area` sends its query when its author chose no Page: the Area's own results
 * Page, and for an Area that has none -- the operator's chrome -- the Public one, resolved in Public.
 */
export function resolvePhiSearchPageLinkTarget(area: PhiCmsAreaKey): PhiLinkTarget {
  if (area === "app") {
    return { kind: "page", reference: PHI_APP_SEARCH_PAGE_REFERENCE };
  }
  return area === "public"
    ? { kind: "page", reference: PHI_PUBLIC_BASE_PAGE_REFERENCES.search }
    : { kind: "page", reference: PHI_PUBLIC_BASE_PAGE_REFERENCES.search, area: "public" };
}
