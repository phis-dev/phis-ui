import { NextRequest, NextResponse } from "next/server";

import { PHI_CMS_SPECIAL_ROOTS } from "../helpers/cms-routing";
import {
  extractLocalePrefix,
} from "../helpers/site-locale-config";
import { readPhiSiteRuntimeConfigSync } from "../helpers/site-runtime";
import { fetchResolvedSiteLocale, fetchSiteLocaleConfig } from "../server-helpers/site-locale";
import { PHIS_REQUEST_PATH_HEADER, PHIS_REQUEST_SEARCH_HEADER } from "../constants/http-headers";
import { readPhiServerApiCredentials } from "../helpers/phis-server-credentials";

const KNOWN_SPECIAL_ROOTS = new Set<string>(PHI_CMS_SPECIAL_ROOTS);

/*
 * The proxy writes no locale cookie.
 *
 * `phis_locale` is the viewer's own choice, and it outranks the browser's Accept-Language. Writing it on
 * every prefixed request and on every redirect turned any visit to `/en/...` -- a link, a Builder
 * preview -- into a choice nobody made, and from then on `/` sent a German browser to `/en/`. The
 * cookie is written where a viewer chooses: the locale switch.
 */

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
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    siteKey: runtimeConfig.site.key,
  });
}

async function resolveRedirectLocale(
  request: NextRequest,
  runtimeConfig: ReturnType<typeof readSiteRuntime>,
) {
  const resolved = await fetchResolvedSiteLocale({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
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
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  const firstSegment = pathname.split("/").filter(Boolean)[0]?.toLowerCase() ?? "";
  if (firstSegment === "public") {
    const preferredLocale = await resolveRedirectLocale(request, runtimeConfig);
    const publicPath = pathname.replace(/^\/public(?=\/|$)/i, "") || "/";
    return NextResponse.redirect(new URL(`/${preferredLocale}${publicPath}${search}`, request.url), 307);
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
  return NextResponse.redirect(new URL(`/${preferredLocale}${pathname}${search}`, request.url), 307);
}
