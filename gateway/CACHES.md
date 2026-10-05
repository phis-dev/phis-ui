# Gateway Caches

This document collects the cache and invalidation touchpoints in `gateway/*`.

## Site Read Cache

- `readPhiSiteReadCache(key, load)` / `clearPhiSiteReadCache()`
  - File: `gateway/site-read-cache.ts`
  - Per-process cache of what a Site reads from Core on every render. Used outside development by:
    - `getResolvedSiteConfig(...)` in `gateway/site-config.ts`, refreshed every `PHI_SITE_CONFIG_REFRESH_MS` (3 s)
    - `fetchSiteNavigationOverlay(...)` in `gateway/site-nav.ts` (not for `revision` or review requests), with the 60 s TTL
  - Cleared by `buildPhiSiteProxyHandlers(...)` (`gateway/site-proxy.ts`) after every POST/PUT/PATCH/DELETE through `/api/site` that Core accepted *through this door*, so the author sees the change at once in the process the write passed through. A write the Site answers locally (`/api/site/forms`, which relays a Form to Core through its own resolution) does not clear it; what such a write changes reaches this process the way it reaches every other one, through the marker on the next config refresh.
  - Cleared in every other process when a config refresh finds that `readMarker` moved: everything but the fresh config goes. Core moves the marker on any change to the Site row and on every publish of a Page, Area, Navigation or Theme; drafts do not move it (phis-server DB.md, `phis.site_read_marker`). A publish through any process thus reaches all of them within about the refresh interval.
  - The TTL ends what the marker does not see, such as a Logo Asset whose content was replaced under the same id.
  - The underlying fetches are `no-store`. Next cache tags are not used: `revalidateTag` reaches only the Site process that ran it.

## Rendered Public Pages

- `next/cache-handler.mjs`, wired by a Site as `cacheHandler` with `cacheMaxMemorySize: 0`
  - Per-process memory, bounded (128 MB, `PHIS_RENDER_CACHE_MB`), least recently read first out. Never the filesystem: several processes run from one build directory.
  - Holds what the static route tree renders: `static-render/<marker>/<mode>/<locale>/<path>`. `next/site-proxy.ts` rewrites a Public read there when it is a GET or HEAD, carries no `phis_session` cookie and no query other than `utm_*`, `gclid`, `fbclid` and `_rsc`, and names its locale exactly. Everything else renders dynamically as before.
  - The render reads nothing of the request (`server-helpers/static-render.ts`): the path from the route's segments, no query, no cookie, so Core sees an anonymous visitor.
  - `<marker>` joins the config's `readMarker` with both translation markers. A publish or a translation write names a new address in every process within the config refresh; entries under the old one are never asked for again and leave by the bound. Nothing is invalidated.
  - `<mode>` is the colour scheme from the `phis_color_scheme` hint cookie, `light` until the browser has reported one: one entry per mode, so a dark visitor is not served a light page. The hint lasts the visit and is written only for `dark` ([design/CONSENT.md](../design/CONSENT.md)), so the first request of a session is served the light entry and the bootstrap script corrects the root; every later one is quiet.
  - The Site's static route layouts declare `revalidate = 60`, which renders a page again after a minute for what the marker does not see, such as an Asset replaced under the same id or a Module switched on.
  - The browser keeps a page it navigated to for `staleTimes.static` (30 s), so an open tab sees a publish after at most that long; a reload sees it at once.
  - Only in production. `next dev` keeps no rendered pages, so the proxy sends nothing to the static tree there.

## React `cache(...)` Wrappers

These helpers are wrapped in React server `cache(...)` for request-level memoization and have no clear
function:

- `getResolvedCmsPage(...)` and `getCurrentCmsPageDraft(...)`
  - File: `gateway/site-page.ts`

- `getExactSiteArea(...)` and `getCurrentSiteAreaDraft(...)`
  - File: `gateway/site-area.ts`

If their fetch layer uses `cache: "no-store"`, the underlying request is still dynamic, but the function itself remains wrapped in `cache(...)` for request-level memoization.

## Translation Caching

- `readPhiTranslationCache(key)` / `writePhiTranslationCache(key, value, generation?)` / `clearPhiTranslationCache(options?)` / `syncPhiTranslationChangeMarkers(...)`
  - File: `helpers/translation-cache.ts`
  - Per-process cache per message, no expiry, at most 5,000 entries (least recently read evicted). Filled by `tr` and `trBulk` in `gateway/tr.ts`, whose requests to `/api/v1/tr` are `no-store`. A failed request and a `provisional` answer are not kept; neither is an answer whose request began before a clear.
  - Emptied by `getResolvedSiteConfig(...)` whenever Core's `translationMarkers` differ from the ones the process saw last: the global entries for the global marker, the Site's entries for its own. Core moves them on every translation write (phis-server TRANSLATIONS.md, "Change markers").
  - Label sets (`gateway/label-set.ts`) are not cached as sets; they read their texts through this cache.

## Theme Resolution

- `resolvePhiRootThemeState(...)` / `clearPhiRootThemeStates()`
  - File: `components/root/phi-root-theme-resolver.ts`
  - Per-process, at most 16 resolved root Themes (least recently read evicted), keyed by a hash of what they are resolved from: the Theme record, the fonts and the palette block it follows. A changed Theme is a new key, so nothing invalidates it and nothing can go stale; the bound only keeps it small, since a Site has one published Theme and Builder drafts are resolved in the browser.
  - The state is frozen: every page that resolves the same Theme is handed the same object.

## Form Guard Fetching

- `GET /api/site/forms?phase=guard` (`gateway/site-form-route.ts`), called by the browser when a form whose descriptor declares `guard` mounts (`components/forms/form-guard-client.ts`).
  - Always `no-store`, and never part of a render: each visitor needs their own `issuedAt`/`formToken`, which phis-server refuses once `maxSubmitMs` has passed. A page with a guarded form is therefore the same for every visitor.

## Rule

Published data a Site reads from Core is not kept in Next's data cache (`force-cache`, `revalidateTag`): no invalidation reaches every Site process. Keep it in the per-process read cache, which the config's `readMarker` empties in every process and the `/api/site` proxy in the one a write passed through, with a TTL for what the marker does not see.
