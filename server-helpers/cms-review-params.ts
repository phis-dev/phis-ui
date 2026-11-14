import { isPhiCmsReviewKind, type PhiCmsReviewKind } from "../helpers/cms-scope-search-params";

/*
 * What a request's search parameters say about a review or a revision read, and nothing that reaches the
 * server. Apart from `cms-review.ts` so that a reader which only needs to know whether a render is a
 * preview -- the internal reference resolver, on every page -- does not pull the Theme gateway in with it.
 */

export type { PhiCmsReviewKind };

export type PhiCmsReviewParams = {
  kind: PhiCmsReviewKind;
  revisionId: number;
  area?: string | null;
  page?: string | null;
  navKey?: string | null;
  themeKey?: string | null;
};

function normalizeReviewKind(value: string | null | undefined): PhiCmsReviewKind | null {
  const normalized = value?.trim().toLowerCase();
  return isPhiCmsReviewKind(normalized) ? normalized : null;
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function resolvePhiCmsReviewParams(
  searchParams?: Record<string, string | undefined>,
): PhiCmsReviewParams | null {
  const kind = normalizeReviewKind(searchParams?.reviewKind);
  const rawRevision = searchParams?.reviewRevision?.trim();
  const revisionId = rawRevision ? Number(rawRevision) : null;
  if (!kind || !Number.isInteger(revisionId) || (revisionId as number) <= 0) {
    return null;
  }

  return {
    kind,
    revisionId: revisionId as number,
    area: normalizeOptionalString(searchParams?.reviewArea),
    page: normalizeOptionalString(searchParams?.reviewPage),
    navKey: normalizeOptionalString(searchParams?.reviewNavKey),
    themeKey: normalizeOptionalString(searchParams?.reviewThemeKey),
  };
}

export function getPhiCmsReviewRevision(
  review: PhiCmsReviewParams | null | undefined,
  kind: PhiCmsReviewKind,
) {
  return review?.kind === kind ? review.revisionId : null;
}

/**
 * Whether this request reads the Area or the Page as a revision Core had to authorize.
 *
 * `revision` and a review of kind `area` or `page` are passed on to Core's Area and Page reads, and
 * Core answers them only to a viewer it allows to preview (`requireSiteCmsPreviewApiContext`); a
 * refusal comes back as 401/403 before anything renders. That is what lets the Area access guard step
 * aside for such a request: somebody else has already decided. A review of kind `navigation` or
 * `theme` changes neither read -- the Area and the Page come back live, unauthorized -- so it is no
 * reason to step aside. Deciding on "any valid review" did exactly that, and
 * `?reviewKind=navigation&reviewRevision=1` showed an anonymous visitor a staff Area's shell.
 */
export function hasPhiCmsAuthorizedPreviewRead(
  searchParams?: Record<string, string | undefined>,
) {
  if (resolvePhiCmsRevisionFromSearchParams(searchParams) != null) {
    return true;
  }
  const review = resolvePhiCmsReviewParams(searchParams);
  return review?.kind === "area" || review?.kind === "page";
}

export function resolvePhiCmsRevisionFromSearchParams(
  searchParams?: Record<string, string | undefined>,
) {
  const rawValue = searchParams?.revision;
  if (!rawValue?.trim()) {
    return null;
  }

  const parsed = Number(rawValue);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
