import { cache } from "react";
import "server-only";

import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";

export type PhiSiteStats = {
  userCount: number;
};

export type GetResolvedSiteStatsOptions = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
};

export const getResolvedSiteStats = cache(async function getResolvedSiteStats({
  apiBaseUrl,
  internalToken,
  siteKey,
}: GetResolvedSiteStatsOptions): Promise<PhiSiteStats> {
  if (!apiBaseUrl.trim()) {
    throw new Error("Missing apiBaseUrl for getResolvedSiteStats.");
  }
  if (!internalToken.trim()) {
    throw new Error("Missing internalToken for getResolvedSiteStats.");
  }
  if (!siteKey.trim()) {
    throw new Error("Missing siteKey for getResolvedSiteStats.");
  }

  const response = await fetch(buildApiUrl(apiBaseUrl, "/api/v1/site/stats"), {
    headers: buildApiHeaders({
      token: internalToken,
      siteKey,
      includeToken: true,
      includeSiteKey: true,
      extra: {
        Accept: "application/json",
        "User-Agent": "phi-shared-ui/1.0",
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch site stats (${response.status}).`);
  }

  const payload = (await response.json()) as { stats?: PhiSiteStats };
  if (typeof payload.stats?.userCount !== "number") {
    throw new Error("Missing site stats payload.");
  }

  return payload.stats;
});
