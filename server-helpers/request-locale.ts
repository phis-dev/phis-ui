import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import type { SiteLocale } from "../helpers/locale";
import {
  resolvePhiRequestedSiteLocale,
  type PhiResolvedLocale,
} from "../helpers/site-locale-config";
import { getResolvedSiteConfig } from "../gateway/site-config";
import { maybeGetPhiRequestRuntime } from "./request-runtime";
import { fetchResolvedSiteLocale, type FetchSiteLocaleConfigOptions } from "./site-locale";
import { readPhiServerApiCredentials } from "../helpers/phis-server-credentials";

function resolveLocaleConfigOptions(options: FetchSiteLocaleConfigOptions) {
  const runtime = maybeGetPhiRequestRuntime();

  return {
    apiBaseUrl: options.apiBaseUrl ?? readPhiServerApiCredentials().apiBaseUrl,
    internalToken: options.internalToken ?? readPhiServerApiCredentials().internalToken,
    siteKey: options.siteKey ?? runtime?.site.key,
  };
}

const loadPhiResolvedRequestLocale = cache(async (
  apiBaseUrl: string | undefined,
  internalToken: string | undefined,
  siteKey: string | undefined,
  requestedLocale: string | null,
  acceptLanguage: string | null,
  cookieHeader: string | null,
) => {
  /*
   * A request that names a locale the Site serves is answered from the Site config, which this render
   * reads anyway: Core matches the requested locale first, so its answer would be the same. Only where
   * the visitor's preference decides is Core asked -- that needs the Session.
   */
  if (requestedLocale && apiBaseUrl && internalToken && siteKey) {
    const site = await getResolvedSiteConfig({ apiBaseUrl, internalToken, siteKey });
    const resolved = resolvePhiRequestedSiteLocale(requestedLocale, site.localeCapabilities);
    if (resolved) return resolved;
  }
  return fetchResolvedSiteLocale({
    apiBaseUrl,
    internalToken,
    siteKey,
    requestedLocale,
    acceptLanguage,
    cookieHeader,
  });
});

export async function resolvePhiResolvedRequestLocale(
  options: FetchSiteLocaleConfigOptions = {},
): Promise<PhiResolvedLocale> {
  const requestHeaders = await headers();
  const runtimeOptions = resolveLocaleConfigOptions(options);
  return loadPhiResolvedRequestLocale(
    runtimeOptions.apiBaseUrl,
    runtimeOptions.internalToken,
    runtimeOptions.siteKey,
    requestHeaders.get("x-locale"),
    requestHeaders.get("accept-language"),
    requestHeaders.get("cookie"),
  );
}

export async function resolvePhiRequestLocale(
  options: FetchSiteLocaleConfigOptions = {},
): Promise<SiteLocale> {
  return (await resolvePhiResolvedRequestLocale(options)).locale;
}
