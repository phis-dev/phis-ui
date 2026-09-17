# Gateway Caches

This document collects the cache and invalidation touchpoints in `gateway/*`.

## Site Read Cache

- `readPhiSiteReadCache(key, load)` / `clearPhiSiteReadCache()`
  - File: `gateway/site-read-cache.ts`
  - Per-process cache of what a Site reads from Core on every render. Used outside development by:
    - `getResolvedSiteConfig(...)` in `gateway/site-config.ts`, refreshed every `PHI_SITE_CONFIG_REFRESH_MS` (2 s)
    - `fetchSiteNavigationOverlay(...)` in `gateway/site-nav.ts` (not for `revision` or review requests), with the 60 s TTL
  - Cleared by `buildPhiSiteProxyHandlers(...)` (`gateway/site-proxy.ts`) after every accepted POST/PUT/PATCH/DELETE through `/api/site`, so the author sees the change at once in the process the write passed through.
  - Cleared in every other process when a config refresh finds that `readMarker` moved: everything but the fresh config goes. Core moves the marker on any change to the Site row and on every publish of a Page, Area, Navigation or Theme; drafts do not move it (phis-server DB.md, `phis.site_read_marker`). A publish through any process thus reaches all of them within about the refresh interval.
  - The TTL ends what the marker does not see, such as a Logo Asset whose content was replaced under the same id.
  - The underlying fetches are `no-store`. Next cache tags are not used: `revalidateTag` reaches only the Site process that ran it.

## React `cache(...)` Wrappers

These helpers use React server cache and currently do not expose a manual clear function:

- `getResolvedCmsPage(...)`
  - File: `gateway/site-page.ts`

- `getExactSiteArea(...)`
  - File: `gateway/site-area.ts`

If their fetch layer uses `cache: "no-store"`, the underlying request is still dynamic, but the function itself remains wrapped in `cache(...)` for request-level memoization.

## Other In-Process Caches Near Gateway

- `configCache`
  - File: `helpers/site-locale-config.ts`
  - TTL-based helper cache.
  - No explicit clear helper yet.

## Translation Caching

- `readPhiTranslationCache(key)` / `writePhiTranslationCache(key, value, generation?)` / `clearPhiTranslationCache(options?)` / `syncPhiTranslationChangeMarkers(...)`
  - File: `helpers/translation-cache.ts`
  - Per-process cache per message, no expiry, at most 5,000 entries (least recently read evicted). Filled by `tr` and `trBulk` in `gateway/tr.ts`, whose requests to `/api/v1/tr` are `no-store`. A failed request and a `provisional` answer are not kept; neither is an answer whose request began before a clear.
  - Emptied by `getResolvedSiteConfig(...)` whenever Core's `translationMarkers` differ from the ones the process saw last: the global entries for the global marker, the Site's entries for its own. Core moves them on every translation write (phis-server TRANSLATIONS.md, "Change markers").
  - Label sets (`gateway/label-set.ts`) are not cached as sets; they read their texts through this cache.

## Form Guard Fetching

- `GET /api/site/forms?phase=guard` (`gateway/site-form-route.ts`), called by the browser when a form whose descriptor declares `guard` mounts (`components/forms/form-guard-client.ts`).
  - Always `no-store`, and never part of a render: each visitor needs their own `issuedAt`/`formToken`, which phis-server refuses once `maxSubmitMs` has passed. A page with a guarded form is therefore the same for every visitor.

## Rule

Published data a Site reads from Core is not kept in Next's data cache (`force-cache`, `revalidateTag`): no invalidation reaches every Site process. Keep it in the per-process read cache, which the config's `readMarker` empties in every process and the `/api/site` proxy in the one a write passed through, with a TTL for what the marker does not see.
