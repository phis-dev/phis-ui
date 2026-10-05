import { cache } from "react";
import "server-only";

import { fetchPhiSiteApi } from "./site-api-request";

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
  const payload = await fetchPhiSiteApi<{ settings?: PhiSiteAdminSettings }>({
    context: "getResolvedSiteAdminSettings",
    apiBaseUrl,
    internalToken,
    siteKey,
    path: "/api/v1/site/settings",
    failure: "Failed to fetch site admin settings",
  });
  if (typeof payload?.settings?.name !== "string" || typeof payload?.settings?.key !== "string") {
    throw new Error("Missing site admin settings payload.");
  }

  return payload.settings;
});
