import { NextRequest, NextResponse } from "next/server";

import { PHI_CMS_SPECIAL_ROOTS } from "../helpers/cms-routing";
import {
  extractLocalePrefix,
} from "../helpers/site-locale-config";
import { readPhiSiteRuntimeConfigSync } from "../helpers/site-runtime";
import { fetchResolvedSiteLocale, fetchSiteLocaleConfig } from "../server-helpers/site-locale";
import { PHIS_REQUEST_PATH_HEADER, PHIS_REQUEST_SEARCH_HEADER } from "../constants/http-headers";

const KNOWN_SPECIAL_ROOTS = new Set<string>(PHI_CMS_SPECIAL_ROOTS);
const PHI_LOCALE_COOKIE = "phi_locale";

function isAssetOrBackendPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/media") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    /\.[\w-]+$/.test(pathname)
  );
}

function readSiteRuntime() {
  return readPhiSiteRuntimeConfigSync();
}

async function readLocaleConfig(runtimeConfig: ReturnType<typeof readSiteRuntime>) {
  return fetchSiteLocaleConfig({
    apiBaseUrl: runtimeConfig.phis.apiBaseUrl,
    internalToken: runtimeConfig.phis.internalToken,
    siteKey: runtimeConfig.site.key,
  });
}

async function resolveRedirectLocale(
  request: NextRequest,
  runtimeConfig: ReturnType<typeof readSiteRuntime>,
) {
  const resolved = await fetchResolvedSiteLocale({
    apiBaseUrl: runtimeConfig.phis.apiBaseUrl,
    internalToken: runtimeConfig.phis.internalToken,
    siteKey: runtimeConfig.site.key,
    acceptLanguage: request.headers.get("accept-language"),
    cookieHeader: request.headers.get("cookie"),
  });
  return resolved.locale;
}

export async function proxyPhiNextSiteRequest(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isAssetOrBackendPath(pathname)) {
    return NextResponse.next();
  }

  const runtimeConfig = readSiteRuntime();
  const localeConfig = await readLocaleConfig(runtimeConfig);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-locale");
  const prefixedLocale = extractLocalePrefix(pathname, localeConfig);

  if (prefixedLocale) {
    requestHeaders.set("x-locale", prefixedLocale);
    requestHeaders.set(PHIS_REQUEST_PATH_HEADER, pathname);
    requestHeaders.set(PHIS_REQUEST_SEARCH_HEADER, search);
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    response.cookies.set(PHI_LOCALE_COOKIE, prefixedLocale, {
      path: "/",
      sameSite: "lax",
    });
    return response;
  }

  const firstSegment = pathname.split("/").filter(Boolean)[0]?.toLowerCase() ?? "";
  if (firstSegment === "public") {
    const preferredLocale = await resolveRedirectLocale(request, runtimeConfig);
    const publicPath = pathname.replace(/^\/public(?=\/|$)/i, "") || "/";
    const localizedUrl = new URL(`/${preferredLocale}${publicPath}${search}`, request.url);
    const response = NextResponse.redirect(localizedUrl, 307);
    response.cookies.set(PHI_LOCALE_COOKIE, preferredLocale, {
      path: "/",
      sameSite: "lax",
    });
    return response;
  }

  if (KNOWN_SPECIAL_ROOTS.has(firstSegment)) {
    /**
     * Protected roots are forwarded rather than gated here. This runs in middleware, with no descriptor
     * catalog and no Area preset, so it cannot know whether an Auth Module owns `/login` on this Site --
     * and a Site that disabled the Module was sent to a 404 that reports a missing page where access is
     * refused. `PhiCmsRootLayout` already resolves the catalog and owns both the redirect and the
     * refusal; see `AUTHENTICATION.md` section 6.
     */
    requestHeaders.set(PHIS_REQUEST_PATH_HEADER, pathname);
    requestHeaders.set(PHIS_REQUEST_SEARCH_HEADER, search);
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    return response;
  }

  const preferredLocale = await resolveRedirectLocale(request, runtimeConfig);
  const localizedUrl = new URL(`/${preferredLocale}${pathname}${search}`, request.url);
  const response = NextResponse.redirect(localizedUrl, 307);
  response.cookies.set(PHI_LOCALE_COOKIE, preferredLocale, {
    path: "/",
    sameSite: "lax",
  });
  return response;
}
