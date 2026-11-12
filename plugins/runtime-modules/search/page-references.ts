import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import { createPhiPageReference, type PhiLinkTarget } from "../../../types/references";
import { PHI_SEARCH_PAGE_PRESET_KEYS, PHI_SEARCH_RUNTIME_MODULE_ID } from "./ids";

/**
 * Where a Search Box sends its query when its author chose no Page: this Module's results Page of the
 * Area it stands in -- the App's in App, the Public one in Public (SEARCH.md). The Module serves no other
 * Area; a box rendered for one all the same leads to the Public Page, resolved in Public.
 */
export function resolvePhiSearchPageLinkTarget(area: PhiCmsAreaKey): PhiLinkTarget {
  const reference = createPhiPageReference({
    kind: "module",
    ownerModuleId: PHI_SEARCH_RUNTIME_MODULE_ID,
    presetKey: area === "app" ? PHI_SEARCH_PAGE_PRESET_KEYS.app : PHI_SEARCH_PAGE_PRESET_KEYS.public,
  });
  if (area === "app" || area === "public") return { kind: "page", reference };
  return { kind: "page", reference, area: "public" };
}
