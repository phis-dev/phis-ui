# Gateway Caches

This document collects the cache and invalidation touchpoints in `gateway/*`.

## Site Read Cache

- `readPhiSiteReadCache(key, load)` / `clearPhiSiteReadCache()`
  - File: `gateway/site-read-cache.ts`
  - Per-process cache of what a Site reads from Core on every render, with a 60 s TTL. Used outside development by:
    - `getResolvedSiteConfig(...)` in `gateway/site-config.ts`
    - `fetchSiteNavigationOverlay(...)` in `gateway/site-nav.ts` (not for `revision` or review requests)
  - Cleared by `buildPhiSiteProxyHandlers(...)` (`gateway/site-proxy.ts`) after every accepted POST/PUT/PATCH/DELETE through `/api/site`.
  - The underlying fetches are `no-store`. Next cache tags are not used: `revalidateTag` reaches only the Site process that ran it, so other processes of the Site catch up within the TTL instead.

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

- `gateway/form-guard.ts`
  - Always `no-store`, and never cached anywhere else: each render needs a fresh `issuedAt`/`formToken`, which phis-server refuses once `maxSubmitMs` has passed.

## Rule

Published data a Site reads from Core is not kept in Next's data cache (`force-cache`, `revalidateTag`): no invalidation reaches every Site process. Keep it in a per-process cache with a TTL, and clear that cache where the write passes through the Site, as `gateway/site-read-cache.ts` does.
