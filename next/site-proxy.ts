import { NextRequest, NextResponse } from "next/server";

import { PHI_CMS_SPECIAL_ROOTS } from "../helpers/cms-routing";
import { localizePath } from "../helpers/locale";
import {
  extractLocalePrefix,
} from "../helpers/site-locale-config";
import { readPhiSiteRuntimeConfigSync } from "../helpers/site-runtime";
import { fetchResolvedSiteLocale, fetchSiteLocaleConfig } from "../server-helpers/site-locale";
import { PHIS_REQUEST_PATH_HEADER, PHIS_REQUEST_SEARCH_HEADER } from "../constants/http-headers";
import { readPhiServerApiCredentials } from "../helpers/phis-server-credentials";
import { getResolvedSiteConfig } from "../gateway/site-config";
import { PHI_COLOR_SCHEME_COOKIE, normalizePhiColorSchemeHint } from "../theme/phi-theme-mode";

/** Where the static route tree lives. Only the proxy may send a request there; see below. */
export const PHI_STATIC_RENDER_PREFIX = "/static-render";

const PHI_SITE_SESSION_COOKIE = "phis_session";

/*
 * Query parameters a static render may ignore: campaign tags nobody's page reads, and `_rsc`, which Next
 * adds to a client navigation's own request. Any other parameter can change what a page shows -- a
 * review, a revision, a token a form reads -- so a request carrying one is rendered for itself.
 */
const PHI_STATIC_RENDER_IGNORED_QUERY = /^(?:utm_[a-z0-9_]+|gclid|fbclid|_rsc)$/i;

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

/**
 * Whether one render may answer this request for every visitor it matches.
 *
 * Only outside development, where Next keeps what it rendered at all; only a read; only without a Site
 * session, because a signed-in visitor can be shown what an anonymous one is not; and only without a
 * query that could change the page.
 */
function isPhiStaticRenderRequest(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") return false;
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  if (request.cookies.get(PHI_SITE_SESSION_COOKIE)?.value) return false;
  for (const key of request.nextUrl.searchParams.keys()) {
    if (!PHI_STATIC_RENDER_IGNORED_QUERY.test(key)) return false;
  }
  return true;
}

/**
 * The static tree's address for a Public page: `/static-render/<marker>/<mode>/<locale>/<path>`.
 *
 * The marker is what makes a publish visible. It joins the Site's read marker with its translation
 * markers, so any published change, or any translation, names a new address -- a page cached under the
 * old one is never asked for again, in this process or any other, without anybody telling them. The
 * mode is the colour scheme the browser reported through its hint cookie, light until it has.
 */
async function resolvePhiStaticRenderUrl(request: NextRequest, runtimeConfig: ReturnType<typeof readSiteRuntime>) {
  const credentials = readPhiServerApiCredentials();
  const site = await getResolvedSiteConfig({
    apiBaseUrl: credentials.apiBaseUrl,
    internalToken: credentials.internalToken,
    siteKey: runtimeConfig.site.key,
  });
  const marker = [site.readMarker, site.translationMarkers.global, site.translationMarkers.site]
    .map((part) => String(part).replace(/[^A-Za-z0-9-]/g, "_"))
    .join(".");
  const mode = normalizePhiColorSchemeHint(request.cookies.get(PHI_COLOR_SCHEME_COOKIE)?.value) ?? "light";
  return new URL(`${PHI_STATIC_RENDER_PREFIX}/${marker}/${mode}${request.nextUrl.pathname}`, request.url);
}

export async function proxyPhiNextSiteRequest(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  /*
   * The static tree is reached through the rewrite below and never by its own address. A marker in a URL
   * anybody can type would let them fill every process's cache with renders nobody else will ask for.
   */
  if (pathname === PHI_STATIC_RENDER_PREFIX || pathname.startsWith(`${PHI_STATIC_RENDER_PREFIX}/`)) {
    return new NextResponse(null, { status: 404 });
  }
  if (isAssetOrBackendPath(pathname)) {
    return NextResponse.next();
  }

  const runtimeConfig = readSiteRuntime();
  const localeConfig = await readLocaleConfig(runtimeConfig);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-locale");
  const prefixedLocale = extractLocalePrefix(pathname, localeConfig);

  if (prefixedLocale) {
    // The static tree names the locale by its own segment, so only an exact one goes there.
    const localeSegment = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
    if (localeSegment === prefixedLocale && isPhiStaticRenderRequest(request)) {
      return NextResponse.rewrite(await resolvePhiStaticRenderUrl(request, runtimeConfig));
    }
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
    return NextResponse.redirect(new URL(localizePath(preferredLocale, publicPath) + search, request.url), 307);
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
  /*
   * Through localizePath, which writes the root as `/en` rather than `/en/`: the trailing slash made
   * Next answer the first redirect with a second one, a 308 to `/en`, on every visit to `/`.
   */
  return NextResponse.redirect(new URL(localizePath(preferredLocale, pathname) + search, request.url), 307);
}
