/**
 * The refusals a Site owns a Page for, and the addresses they stand at.
 *
 * A 500 is deliberately not among them. The other three are decided before rendering starts and can
 * therefore be answered with a CMS tree like any other Page; a 500 is what is left when rendering has
 * already failed, so the machinery that would resolve its tree is the machinery that broke. It is a
 * fixed page instead, in `next/global-error.tsx`, and no preset stands for it -- a Page in the
 * Builder that is never the one shown only invites an edit that cannot take effect.
 *
 * Here rather than beside the tree that draws them, because two readers who never meet need the same
 * answer: the Public base declares the routes from this list, and the Builder has to recognise one of
 * its addresses in a list of Pages it is offering as somewhere to go.
 */
export const PHI_CMS_ERROR_CODES = [401, 403, 404] as const;

export type PhiCmsErrorCode = (typeof PHI_CMS_ERROR_CODES)[number];

export function resolvePhiCmsErrorPagePath(code: PhiCmsErrorCode) {
  return `/error/${code}`;
}

export function parsePhiCmsErrorCode(value: string | number | null | undefined): PhiCmsErrorCode | null {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").trim());
  return PHI_CMS_ERROR_CODES.find((code) => code === parsed) ?? null;
}

/**
 * Whether an address is one of the refusals.
 *
 * Matched against the built path rather than against a prefix: `/error` is a path a Site may give a
 * Page of its own, and only the three this file names are answered by the machinery that makes the
 * address unreachable by navigating to it.
 */
export function isPhiCmsErrorPagePath(path: string) {
  return PHI_CMS_ERROR_CODES.some((code) => resolvePhiCmsErrorPagePath(code) === path);
}
