import { resolvePhiBuilderAreaAsCmsArea, type PhiBuilderAreaKey } from "../constants/cms-areas";
import {
  formatPhiBuilderNavigationScopeKey,
  getPhiBuilderNavigationDefaultScopeKey,
  parsePhiBuilderNavigationScopeKey,
} from "./cms-navigation-catalog";

/**
 * Which navigation scope a Builder search parameter selects, falling back to the Area's default.
 *
 * It reads only Foundation pieces and is used by two Modules -- revisions and builder -- so it belongs
 * here rather than in either of them.
 */
export function resolvePhiBuilderRevisionNavScopeKey(
  area: PhiBuilderAreaKey,
  searchValue: string | null,
) {
  const cmsArea = resolvePhiBuilderAreaAsCmsArea(area);
  const parsed = parsePhiBuilderNavigationScopeKey(searchValue);
  return parsed?.key && parsed.area === cmsArea
    ? formatPhiBuilderNavigationScopeKey(parsed.area, parsed.key)
    : getPhiBuilderNavigationDefaultScopeKey(cmsArea) ??
        formatPhiBuilderNavigationScopeKey("public", "header");
}
