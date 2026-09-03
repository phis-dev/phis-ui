import { cache } from "react";
import "server-only";

import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";

export type PhiSiteAdminSettings = {
  key: string;
  name: string;
  hostname: string;
  publicBaseUrl: string;
  supportEmail: string;
  mailFrom: string;
  mailFromName: string;
  contactRecipient: string;
};

export type GetResolvedSiteAdminSettingsOptions = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
};

export const getResolvedSiteAdminSettings = cache(async function getResolvedSiteAdminSettings({
  apiBaseUrl,
  internalToken,
  siteKey,
}: GetResolvedSiteAdminSettingsOptions): Promise<PhiSiteAdminSettings> {
  if (!apiBaseUrl.trim()) {
    throw new Error("Missing apiBaseUrl for getResolvedSiteAdminSettings.");
  }
  if (!internalToken.trim()) {
    throw new Error("Missing internalToken for getResolvedSiteAdminSettings.");
  }
  if (!siteKey.trim()) {
    throw new Error("Missing siteKey for getResolvedSiteAdminSettings.");
  }

  const response = await fetch(buildApiUrl(apiBaseUrl, "/api/v1/site/settings"), {
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
    throw new Error(`Failed to fetch site admin settings (${response.status}).`);
  }

  const payload = (await response.json()) as { settings?: PhiSiteAdminSettings };
  if (typeof payload.settings?.name !== "string" || typeof payload.settings?.key !== "string") {
    throw new Error("Missing site admin settings payload.");
  }

  return payload.settings;
});
