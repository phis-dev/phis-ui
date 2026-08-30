import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import type { SiteLocale } from "../helpers/locale";
import {
  type PhiResolvedLocale,
} from "../helpers/site-locale-config";
import { maybeGetPhiRequestRuntime } from "./request-runtime";
import { fetchResolvedSiteLocale, type FetchSiteLocaleConfigOptions } from "./site-locale";

function resolveLocaleConfigOptions(options: FetchSiteLocaleConfigOptions) {
  const runtime = maybeGetPhiRequestRuntime();

  return {
    apiBaseUrl: options.apiBaseUrl ?? runtime?.phis.apiBaseUrl,
    internalToken: options.internalToken ?? runtime?.phis.internalToken,
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
) => fetchResolvedSiteLocale({
  apiBaseUrl,
  internalToken,
  siteKey,
  requestedLocale,
  acceptLanguage,
  cookieHeader,
}));

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
