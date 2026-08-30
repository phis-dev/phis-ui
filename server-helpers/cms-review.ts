import "server-only";

import { getSiteThemeRevision } from "../gateway/site-theme";
import type { PhiSiteRequestContext } from "./runtime";

export type PhiCmsReviewKind = "area" | "page" | "navigation" | "theme";

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
  return normalized === "area" ||
    normalized === "page" ||
    normalized === "navigation" ||
    normalized === "theme"
    ? normalized
    : null;
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

export async function resolvePhiCmsThemeReviewRequestContext({
  requestContext,
  searchParams,
  cookieHeader,
}: {
  requestContext: PhiSiteRequestContext;
  searchParams?: Record<string, string | undefined>;
  cookieHeader: string;
}): Promise<PhiSiteRequestContext> {
  const review = resolvePhiCmsReviewParams(searchParams);
  const themeRevision = getPhiCmsReviewRevision(review, "theme");
  if (!themeRevision) {
    return requestContext;
  }

  const theme = await getSiteThemeRevision({
    apiBaseUrl: requestContext.phis.apiBaseUrl,
    internalToken: requestContext.phis.internalToken,
    siteKey: requestContext.site.key,
    themeKey: review?.themeKey ?? "default",
    revisionId: themeRevision,
    cookieHeader,
  });
  if (!theme) {
    return requestContext;
  }

  return {
    ...requestContext,
    site: {
      ...requestContext.site,
      theme: {
        ...requestContext.site.theme,
        ...(theme as NonNullable<PhiSiteRequestContext["site"]["theme"]>),
      },
    },
  };
}
