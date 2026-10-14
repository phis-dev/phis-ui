import { definePhiRequestMemo } from "../server-helpers/request-memo";
import "server-only";

import { fetchPhiSiteApi } from "./site-api-request";

type PhiSiteStats = {
  userCount: number;
};

type GetResolvedSiteStatsOptions = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
};

export const getResolvedSiteStats = definePhiRequestMemo(async function getResolvedSiteStats({
  apiBaseUrl,
  internalToken,
  siteKey,
}: GetResolvedSiteStatsOptions): Promise<PhiSiteStats> {
  const payload = await fetchPhiSiteApi<{ stats?: PhiSiteStats }>({
    context: "getResolvedSiteStats",
    apiBaseUrl,
    internalToken,
    siteKey,
    path: "/api/v1/site/stats",
    failure: "Failed to fetch site stats",
  });
  if (typeof payload?.stats?.userCount !== "number") {
    throw new Error("Missing site stats payload.");
  }

  return payload.stats;
});
