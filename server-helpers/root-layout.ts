import "server-only";

import { headers } from "next/headers";

import { getResolvedSiteConfig, type PhiSiteConfig, type PhiSiteTheme } from "../gateway/site-config";
import { getSiteThemeRevision } from "../gateway/site-theme";
import type { PhiResolvedLocale } from "../helpers/site-locale-config";
import { getPhiCmsReviewRevision, resolvePhiCmsReviewParams } from "./cms-review";
import { resolvePhiResolvedRequestLocale } from "./request-locale";
import { PHIS_REQUEST_SEARCH_HEADER } from "../constants/http-headers";

export type PhiRootLayoutContext = {
  site: Awaited<ReturnType<typeof getResolvedSiteConfig>>;
  resolvedLocale: PhiResolvedLocale;
};

export type LoadPhiRootLayoutContextOptions = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
};

function parseSearchParamsHeader(rawValue: string | null | undefined) {
  if (!rawValue?.trim()) {
    return undefined;
  }

  const source = rawValue.startsWith("?") ? rawValue.slice(1) : rawValue;
  const params = new URLSearchParams(source);
  const normalized: Record<string, string | undefined> = {};
  for (const [key, value] of params.entries()) {
    normalized[key] = value;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

async function resolveRootReviewSite({
  site,
  apiBaseUrl,
  internalToken,
  siteKey,
  cookieHeader,
  searchParams,
}: {
  site: Awaited<ReturnType<typeof getResolvedSiteConfig>>;
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  cookieHeader: string | null;
  searchParams?: Record<string, string | undefined>;
}) {
  const review = resolvePhiCmsReviewParams(searchParams);
  const themeRevision = getPhiCmsReviewRevision(review, "theme");
  if (!themeRevision) {
    return site;
  }

  const theme = await getSiteThemeRevision({
    apiBaseUrl,
    internalToken,
    siteKey,
    themeKey: review?.themeKey ?? "default",
    revisionId: themeRevision,
    cookieHeader,
  });
  if (!theme) {
    return site;
  }
  const reviewedTheme = {
    ...(site.theme ?? {}),
    ...theme,
  } as PhiSiteTheme;
  if (reviewedTheme.fonts == null) {
    delete reviewedTheme.fonts;
  }

  return {
    ...site,
    theme: reviewedTheme,
  } satisfies PhiSiteConfig;
}

export async function loadPhiRootLayoutContext({
  apiBaseUrl,
  internalToken,
  siteKey,
}: LoadPhiRootLayoutContextOptions): Promise<PhiRootLayoutContext> {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie");
  const searchParams = parseSearchParamsHeader(requestHeaders.get(PHIS_REQUEST_SEARCH_HEADER));
  const [site, resolvedLocale] = await Promise.all([
    getResolvedSiteConfig({
      apiBaseUrl,
      internalToken,
      siteKey,
    }),
    resolvePhiResolvedRequestLocale({
      apiBaseUrl,
      internalToken,
      siteKey,
    }),
  ]);
  const resolvedSite = await resolveRootReviewSite({
    site,
    apiBaseUrl,
    internalToken,
    siteKey,
    cookieHeader,
    searchParams,
  });

  return {
    site: resolvedSite,
    resolvedLocale,
  };
}
