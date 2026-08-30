import { cache } from "react";
import "server-only";

import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";
import type { PhiBlockRuntimeSite } from "../types/widget-runtime";
import { throwPhiCmsGatewayError } from "./errors";

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
  if (!apiBaseUrl.trim()) {
    throw new Error("Missing apiBaseUrl for getSiteThemeRevision.");
  }
  if (!internalToken.trim()) {
    throw new Error("Missing internalToken for getSiteThemeRevision.");
  }
  if (!siteKey.trim()) {
    throw new Error("Missing siteKey for getSiteThemeRevision.");
  }
  if (!Number.isInteger(revisionId) || revisionId <= 0) {
    throw new Error("revisionId must be a positive integer.");
  }

  const url = new URL(buildApiUrl(apiBaseUrl, "/api/v1/site/theme"));
  url.searchParams.set("key", themeKey.trim() || "default");
  url.searchParams.set("revision", String(revisionId));

  const response = await fetch(url.toString(), {
    headers: buildApiHeaders({
      token: internalToken,
      siteKey,
      includeToken: true,
      includeSiteKey: true,
      extra: {
        Accept: "application/json",
        "User-Agent": "phi-shared-ui/1.0",
        ...(cookieHeader?.trim() ? { Cookie: cookieHeader } : {}),
      },
    }),
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throwPhiCmsGatewayError(`Failed to fetch site theme revision (${response.status}).`, response.status);
  }

  const payload = (await response.json()) as { theme?: { theme?: PhiBlockRuntimeSite["theme"] } };
  return payload.theme?.theme ?? null;
});
