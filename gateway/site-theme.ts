import { cache } from "react";
import "server-only";

import type { PhiBlockRuntimeSite } from "../types/widget-runtime";
import { fetchPhiSiteApi } from "./site-api-request";

export type GetSiteThemeRevisionOptions = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  themeKey: string;
  revisionId: number;
  cookieHeader?: string | null;
};

export const getSiteThemeRevision = cache(async function getSiteThemeRevision({
  apiBaseUrl,
  internalToken,
  siteKey,
  themeKey,
  revisionId,
  cookieHeader,
}: GetSiteThemeRevisionOptions): Promise<PhiBlockRuntimeSite["theme"] | null> {
  if (!Number.isInteger(revisionId) || revisionId <= 0) {
    throw new Error("revisionId must be a positive integer.");
  }

  const payload = await fetchPhiSiteApi<{ theme?: { theme?: PhiBlockRuntimeSite["theme"] } }>({
    context: "getSiteThemeRevision",
    apiBaseUrl,
    internalToken,
    siteKey,
    path: "/api/v1/site/theme",
    searchParams: { key: themeKey.trim() || "default", revision: String(revisionId) },
    cookieHeader,
    failure: "Failed to fetch site theme revision",
    notFoundIsNull: true,
  });
  if (payload === null) {
    return null;
  }
  return payload.theme?.theme ?? null;
});
