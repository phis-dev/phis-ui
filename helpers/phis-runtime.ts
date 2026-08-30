export type PhiRuntimeConfigInput = {
  apiBaseUrl?: string | null;
  internalToken?: string | null;
  siteKey?: string | null;
};

export type PhiResolvedRuntimeConfig = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey?: string;
};

export function resolvePhiRuntimeConfig(
  input: PhiRuntimeConfigInput,
  options: {
    context: string;
    requireSiteKey?: boolean;
  },
): PhiResolvedRuntimeConfig {
  const apiBaseUrl = input.apiBaseUrl?.trim().replace(/\/$/, "") ?? "";
  const internalToken = input.internalToken?.trim() ?? "";
  const siteKey = input.siteKey?.trim() ?? "";

  if (!apiBaseUrl) {
    throw new Error(`Missing phis apiBaseUrl for ${options.context}.`);
  }

  if (!internalToken) {
    throw new Error(`Missing phis internalToken for ${options.context}.`);
  }

  if (options.requireSiteKey && !siteKey) {
    throw new Error(`Missing phis siteKey for ${options.context}.`);
  }

  return siteKey
    ? { apiBaseUrl, internalToken, siteKey }
    : { apiBaseUrl, internalToken };
}
