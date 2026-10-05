import { cache } from "react";
import "server-only";

import { fetchPhiSiteApi } from "./site-api-request";

export type PhiSiteAuthAdminSettings = {
  policy: {
    registrationMode: string;
    existingAccountLinking: string;
    allowPrivilegedAutoLink: boolean;
  };
  passwordMethod: {
    enabled: boolean;
    sortOrder: number;
  };
  totpPolicy: {
    required: boolean;
    enforcement: string;
    graceUntil: string | null;
    roles: string[];
  };
};

export type GetResolvedSiteAuthAdminSettingsOptions = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
};

export const getResolvedSiteAuthAdminSettings = cache(async function getResolvedSiteAuthAdminSettings({
  apiBaseUrl,
  internalToken,
  siteKey,
}: GetResolvedSiteAuthAdminSettingsOptions): Promise<PhiSiteAuthAdminSettings> {
  const payload = await fetchPhiSiteApi<{ auth?: PhiSiteAuthAdminSettings }>({
    context: "getResolvedSiteAuthAdminSettings",
    apiBaseUrl,
    internalToken,
    siteKey,
    path: "/api/v1/site/auth/settings",
    failure: "Failed to fetch site auth settings",
  });
  if (typeof payload?.auth?.policy?.registrationMode !== "string") {
    throw new Error("Missing site auth settings payload.");
  }

  return payload.auth;
});
