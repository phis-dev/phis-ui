import { cache } from "react";
import "server-only";

import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";

export type PhiSiteMediaSettings = {
  userSpacesEnabled: boolean;
  groupSpacesEnabled: boolean;
  defaultUserQuotaBytes: number | null;
  defaultGroupQuotaBytes: number | null;
  defaultAddonQuotaBytes: number | null;
  /** The ceiling a Space-level override may not exceed; `null` is no ceiling. */
  maxUserQuotaBytes: number | null;
  maxGroupQuotaBytes: number | null;
  maxAddonQuotaBytes: number | null;
  maxObjectBytes: number;
};

/** One Add-on's own store: what it holds, and the figure it is measured against. */
export type PhiSiteAddonMediaSpace = {
  addonId: string;
  spaceId: number;
  usedBytes: number;
  reservedBytes: number;
  quotaBytes: number | null;
};

export type PhiSiteMediaSettingsResult = PhiSiteMediaSettings & {
  addonSpaces: readonly PhiSiteAddonMediaSpace[];
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
}: GetResolvedSiteMediaSettingsOptions): Promise<PhiSiteMediaSettingsResult> {
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
        "User-Agent": "phis-ui/1.0",
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch site media settings (${response.status}).`);
  }

  const payload = (await response.json()) as {
    media?: PhiSiteMediaSettings;
    addonSpaces?: readonly PhiSiteAddonMediaSpace[];
  };
  if (typeof payload.media?.userSpacesEnabled !== "boolean") {
    throw new Error("Missing site media settings payload.");
  }

  // A Site with no Add-on holding files reports none, which is an answer and not a missing field.
  return { ...payload.media, addonSpaces: payload.addonSpaces ?? [] };
});
