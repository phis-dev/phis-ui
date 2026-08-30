import { PHI_CMS_SPECIAL_AREA_KEYS } from "../constants/cms-areas";

export const PHI_CMS_SPECIAL_ROOTS = PHI_CMS_SPECIAL_AREA_KEYS;

export type PhiCmsSpecialRoot = (typeof PHI_CMS_SPECIAL_ROOTS)[number];

const SPECIAL_ROOT_SET = new Set<string>(PHI_CMS_SPECIAL_ROOTS);

export function isKnownSpecialCmsRoot(root: string) {
  return SPECIAL_ROOT_SET.has(root.trim().toLowerCase());
}

export function normalizePhiCmsRouteSegment(segment: string) {
  return segment.trim().replace(/%2b/gi, "+");
}
