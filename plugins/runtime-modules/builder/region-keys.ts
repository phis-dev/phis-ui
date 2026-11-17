import {
  PHI_CMS_PAGE_OWNED_REGION_KEYS,
  PHI_CMS_SHELL_OWNED_REGION_KEYS,
  isPhiCmsPageOwnedRegion,
} from "../../../helpers/cms-region-keys";

export const PHI_BUILDER_SHELL_REGION_KEYS = PHI_CMS_SHELL_OWNED_REGION_KEYS;
export const PHI_BUILDER_PAGE_REGION_KEYS = PHI_CMS_PAGE_OWNED_REGION_KEYS;

export type PhiBuilderShellRegionKey = (typeof PHI_BUILDER_SHELL_REGION_KEYS)[number];
export type PhiBuilderPageRegionKey = (typeof PHI_BUILDER_PAGE_REGION_KEYS)[number];
export type PhiBuilderRegionKey = PhiBuilderShellRegionKey | PhiBuilderPageRegionKey;

export function isPhiBuilderPageScopedRegion(regionKey: string): regionKey is PhiBuilderPageRegionKey {
  return isPhiCmsPageOwnedRegion(regionKey);
}

export function getPhiBuilderRegionDraftKey(area: string, regionKey: string, pageKey?: string | null) {
  if (isPhiBuilderPageScopedRegion(regionKey) && typeof pageKey === "string" && pageKey.trim().length > 0) {
    return `${area}:${pageKey}:${regionKey}`;
  }

  return `${area}:${regionKey}`;
}

/** What the Builder keeps per Page beside its Regions: the meta as edited, and that the Page is to be deleted. */
export type PhiBuilderPageDraftKind = "page_meta" | "page_delete";

/**
 * The key of a Page's own draft state in the workspace.
 *
 * Not a Region key: `page_meta` and `page_delete` are not Regions, so `getPhiBuilderRegionDraftKey` leaves the
 * Page out of them and every Page of an Area would share one slot -- the first Page opened would fill it, and
 * the rest would save its title, description and indexing as their own.
 */
export function getPhiBuilderPageDraftKey(area: string, kind: PhiBuilderPageDraftKind, pageKey: string) {
  return `${area}:${pageKey}:${kind}`;
}
