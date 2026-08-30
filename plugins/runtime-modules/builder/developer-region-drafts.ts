import { getPhiBuilderDefaultRegionDraft } from "./region-defaults";
import {
  getPhiBuilderRegionDraftKey,
  isPhiBuilderPageScopedRegion,
} from "./region-keys";
import type { PhiDeveloperBuilderRegionDraft } from "./developer-workspace-types";

export function resolveRegionDraftKey(
  regionDrafts: Record<string, PhiDeveloperBuilderRegionDraft>,
  area: string,
  regionKey: string,
  pageKey?: string | null,
) {
  const scopedKey = getPhiBuilderRegionDraftKey(area, regionKey, pageKey);
  if (regionDrafts[scopedKey]) {
    return regionDrafts[scopedKey] ?? null;
  }

  if (isPhiBuilderPageScopedRegion(regionKey)) {
    return regionDrafts[getPhiBuilderRegionDraftKey(area, regionKey)] ?? null;
  }

  return null;
}

export function getDefaultRegionDraft(regionKey: string | null): PhiDeveloperBuilderRegionDraft {
  return getPhiBuilderDefaultRegionDraft(regionKey);
}
