import { cache } from "react";
import "server-only";

import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";

export type PhiSiteMediaSettings = {
  userSpacesEnabled: boolean;
  groupSpacesEnabled: boolean;
  defaultUserQuotaBytes: number | null;
  defaultGroupQuotaBytes: number | null;
  maxObjectBytes: number;
};

export type GetResolvedSiteMediaSettingsOptions = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
};

export const getResolvedSiteMediaSettings = cache(async function getResolvedSiteMediaSettings({
  apiBaseUrl,
  internalToken,
  siteKey,
}: GetResolvedSiteMediaSettingsOptions): Promise<PhiSiteMediaSettings> {
  if (!apiBaseUrl.trim()) {
    throw new Error("Missing apiBaseUrl for getResolvedSiteMediaSettings.");
  }
  if (!internalToken.trim()) {
    throw new Error("Missing internalToken for getResolvedSiteMediaSettings.");
  }
  if (!siteKey.trim()) {
    throw new Error("Missing siteKey for getResolvedSiteMediaSettings.");
  }

  const response = await fetch(buildApiUrl(apiBaseUrl, "/api/v1/site/media/settings"), {
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
    throw new Error(`Failed to fetch site media settings (${response.status}).`);
  }

  const payload = (await response.json()) as { media?: PhiSiteMediaSettings };
  if (typeof payload.media?.userSpacesEnabled !== "boolean") {
    throw new Error("Missing site media settings payload.");
  }

  return payload.media;
});
