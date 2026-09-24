import { NextRequest, NextResponse } from "next/server";

import { PHI_CMS_SPECIAL_ROOTS } from "../helpers/cms-routing";
import { localizePath } from "../helpers/locale";
import {
  extractLocalePrefix,
} from "../helpers/site-locale-config";
import { readPhiSiteRuntimeConfigSync } from "../helpers/site-runtime";
import { fetchResolvedSiteLocale, fetchSiteLocaleConfig } from "../server-helpers/site-locale";
import {
  PHIS_CLIENT_NAVIGATION_HEADER,
  PHIS_REQUEST_PATH_HEADER,
  PHIS_REQUEST_SEARCH_HEADER,
} from "../constants/http-headers";
import { peekPhiAreaRootDoor } from "../gateway/area-root-door";
import { readPhiServerApiCredentials } from "../helpers/phis-server-credentials";
import { getResolvedSiteConfig } from "../gateway/site-config";
import {
  PHI_COLOR_SCHEME_COOKIE,
  PHI_THEME_MODE_COOKIE,
  normalizePhiColorSchemeHint,
  normalizePhiThemeModePreference,
  resolvePhiThemeMode,
} from "../theme/phi-theme-mode";

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

/**
 * Whether the browser is navigating within the app rather than asking for a document.
 *
 * Not `RSC` and not `_rsc`. Both were measured absent here: Next consumes its own routing markers before
 * the proxy runs, and strips the query parameter from `request.url` as well -- so the header a Server
 * Component cannot read is one the proxy cannot read either. What survives is the browser's own
 * `Sec-Fetch-Dest`, which says `document` for a navigation the browser performs and `empty` for a fetch
 * the app performs, and which nothing in between rewrites.
 *
 * Absent is read as a document, which is the safe answer: it keeps the status line for anything that is
 * not a browser -- a crawler, `curl`, a health check -- and the status line is what a forwarding Area root
 * needs so it is not filed as a page.
 */
function isPhiClientNavigation(request: NextRequest) {
  const destination = request.headers.get("sec-fetch-dest");
  return destination != null && destination !== "document";
}

function isAssetOrBackendPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
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
 * old one is never asked for again, in this process or any other, without anybody telling them.
 *
 * The mode is what this viewer chose, and the colour scheme their browser reported where they chose
 * nothing -- the same question `resolvePhiThemeMode` answers for a dynamic render, asked here so both
 * trees agree. It stays two renders per page either way: the preference decides which of the two a
 * viewer is handed, never how many there are.
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
  const mode = resolvePhiThemeMode(
    normalizePhiThemeModePreference(request.cookies.get(PHI_THEME_MODE_COOKIE)?.value),
    normalizePhiColorSchemeHint(request.cookies.get(PHI_COLOR_SCHEME_COOKIE)?.value),
  );
  return new URL(`${PHI_STATIC_RENDER_PREFIX}/${marker}/${mode}${request.nextUrl.pathname}`, request.url);
}

const PHI_STATIC_RENDER_PASS_HEADER = "x-phis-static-render";
const PHI_STATIC_RENDER_PASS_KEY = Symbol.for("phis-ui.static-render-pass");

/**
 * What lets a rewrite into the static tree through when it comes back to this proxy.
 *
 * It does come back whenever the server was told an address to listen on (`next start -H`, or `HOSTNAME`
 * for the standalone server): Next compares a rewrite's origin with that address, while the URL it hands
 * the proxy always says `localhost`, so it counts the rewrite as external and fetches it from itself over
 * HTTP -- through this proxy, which refuses the static tree's own address. The rewrite carries this
 * process's pass in a request header; a visitor who types the address cannot know it.
 */
function readPhiStaticRenderPass() {
  const holder = globalThis as typeof globalThis & { [PHI_STATIC_RENDER_PASS_KEY]?: string };
  holder[PHI_STATIC_RENDER_PASS_KEY] ??= crypto.randomUUID();
  return holder[PHI_STATIC_RENDER_PASS_KEY];
}

export async function proxyPhiNextSiteRequest(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  /*
   * The static tree is reached through the rewrite below and never by its own address. A marker in a URL
   * anybody can type would let them fill every process's cache with renders nobody else will ask for.
   */
  if (pathname === PHI_STATIC_RENDER_PREFIX || pathname.startsWith(`${PHI_STATIC_RENDER_PREFIX}/`)) {
    return request.headers.get(PHI_STATIC_RENDER_PASS_HEADER) === readPhiStaticRenderPass()
      ? NextResponse.next()
      : new NextResponse(null, { status: 404 });
  }
  if (isAssetOrBackendPath(pathname)) {
    return NextResponse.next();
  }

  const runtimeConfig = readSiteRuntime();
  const localeConfig = await readLocaleConfig(runtimeConfig);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-locale");
  /*
   * The one fact a Server Component cannot ask for: whether this is a client navigation.
   *
   * Next consumes `RSC` before `headers()` sees it -- measured -- so it is copied under a name of our own
   * (constants/http-headers.ts). Set on every branch that forwards the request into the app, and set to
   * `0` rather than left out, because absent and false are different answers everywhere else in this file.
   */
  requestHeaders.set(PHIS_CLIENT_NAVIGATION_HEADER, isPhiClientNavigation(request) ? "1" : "0");
  const prefixedLocale = extractLocalePrefix(pathname, localeConfig);

  if (prefixedLocale) {
    // The static tree names the locale by its own segment, so only an exact one goes there.
    const localeSegment = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
    if (localeSegment === prefixedLocale && isPhiStaticRenderRequest(request)) {
      const passHeaders = new Headers(request.headers);
      passHeaders.set(PHI_STATIC_RENDER_PASS_HEADER, readPhiStaticRenderPass());
      return NextResponse.rewrite(await resolvePhiStaticRenderUrl(request, runtimeConfig), {
        request: { headers: passHeaders },
      });
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
    /*
     * An Area root forwards, and here is the cheapest place to do it.
     *
     * Only when a render already worked out where this Area's door leads (gateway/area-root-door.ts).
     * Cold, or after a publish swept the cache, this knows nothing and the render below forwards as it
     * always did -- so nothing depends on the cache being warm, and one request is all it costs to warm
     * it.
     *
     * The point is the status line's position rather than its number. A forward decided inside the
     * render reaches a client navigation as a serialised redirect, and applying one across a change of
     * Area leaves Next's router asking for the same address at request speed. Issued here it is an
     * ordinary HTTP 307, answered before there is a router state tree to disagree with: one navigation
     * instead of dozens, and an unchanged document path.
     *
     * Access is not decided here and must not be -- this runs without a descriptor catalog and without
     * an Area preset. The destination is inside the same Area as the address asked for, so whatever the
     * Area would have refused, it still refuses one hop later.
     */
    if (pathname.replace(/\/+$/u, "").toLowerCase() === `/${firstSegment}`) {
      const door = await peekPhiAreaRootDoor(firstSegment);
      if (door && door !== pathname) {
        return NextResponse.redirect(new URL(door + search, request.url), 307);
      }
    }
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
