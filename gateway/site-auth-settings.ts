import { cache } from "react";
import "server-only";

import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";

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
  if (!apiBaseUrl.trim()) {
    throw new Error("Missing apiBaseUrl for getResolvedSiteAuthAdminSettings.");
  }
  if (!internalToken.trim()) {
    throw new Error("Missing internalToken for getResolvedSiteAuthAdminSettings.");
  }
  if (!siteKey.trim()) {
    throw new Error("Missing siteKey for getResolvedSiteAuthAdminSettings.");
  }

  const response = await fetch(buildApiUrl(apiBaseUrl, "/api/v1/site/auth/settings"), {
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
    throw new Error(`Failed to fetch site auth settings (${response.status}).`);
  }

  const payload = (await response.json()) as { auth?: PhiSiteAuthAdminSettings };
  if (typeof payload.auth?.policy?.registrationMode !== "string") {
    throw new Error("Missing site auth settings payload.");
  }

  return payload.auth;
});
