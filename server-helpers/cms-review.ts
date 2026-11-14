import "server-only";

import { getSiteThemeRevision } from "../gateway/site-theme";
import type { PhiSiteRequestContext } from "../types/site-request-context";
import { readPhiServerApiCredentials } from "../helpers/phis-server-credentials";

import { getPhiCmsReviewRevision, resolvePhiCmsReviewParams } from "./cms-review-params";

export {
  getPhiCmsReviewRevision,
  hasPhiCmsAuthorizedPreviewRead,
  resolvePhiCmsReviewParams,
  resolvePhiCmsRevisionFromSearchParams,
  type PhiCmsReviewKind,
  type PhiCmsReviewParams,
} from "./cms-review-params";

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
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
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
