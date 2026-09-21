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

/**
 * The canonical address, unless it is the address that asked -- then there is nothing to say.
 *
 * A forward onto the path the request already names does not fail. The client applies it, asks again
 * and is told the same thing; for a client navigation the forward is streamed rather than answered
 * with a status, so the exchange repeats at request speed rather than stopping at a browser's redirect
 * limit. `components/cms/phi-cms-page-redirect.ts` says the same thing about a Redirect Page and keeps
 * its comparison in one place for the same reason given there: it had already drifted once, held by
 * the Layout and not by the two Page entry points.
 *
 * The same drift is here. The Layout asks for this only at an Area's root (`!path`), the Page asks for
 * it on every address, and a value that can never name its own caller makes the two agree without
 * either having to remember. Deciding it here rather than at the four call sites is what makes it a
 * property of the answer instead of a habit of whoever reads it.
 */
export function canonicalHrefUnlessCurrent(canonical: string, requested: string): string | null {
  return canonical === requested ? null : canonical;
}
