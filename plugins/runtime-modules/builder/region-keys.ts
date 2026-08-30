import {
  PHI_CMS_PAGE_OWNED_REGION_KEYS,
  PHI_CMS_SHELL_OWNED_REGION_KEYS,
  isPhiCmsPageOwnedRegion,
  isPhiCmsShellOwnedRegion,
} from "../../../helpers/cms-region-keys";

export const PHI_BUILDER_SHELL_REGION_KEYS = PHI_CMS_SHELL_OWNED_REGION_KEYS;
export const PHI_BUILDER_PAGE_REGION_KEYS = PHI_CMS_PAGE_OWNED_REGION_KEYS;

export type PhiBuilderShellRegionKey = (typeof PHI_BUILDER_SHELL_REGION_KEYS)[number];
export type PhiBuilderPageRegionKey = (typeof PHI_BUILDER_PAGE_REGION_KEYS)[number];
export type PhiBuilderRegionKey = PhiBuilderShellRegionKey | PhiBuilderPageRegionKey;

export function isPhiBuilderShellRegion(regionKey: string): regionKey is PhiBuilderShellRegionKey {
  return isPhiCmsShellOwnedRegion(regionKey);
}

export function isPhiBuilderPageScopedRegion(regionKey: string): regionKey is PhiBuilderPageRegionKey {
  return isPhiCmsPageOwnedRegion(regionKey);
}

export function getPhiBuilderRegionDraftKey(area: string, regionKey: string, pageKey?: string | null) {
  if (isPhiBuilderPageScopedRegion(regionKey) && typeof pageKey === "string" && pageKey.trim().length > 0) {
    return `${area}:${pageKey}:${regionKey}`;
  }

  return `${area}:${regionKey}`;
}
