# Gateway Caches

This document collects the cache and invalidation touchpoints in `gateway/*`.

## Explicit Clear Functions

- `clearPhiLabelSetCache(options?)`
  - File: `gateway/label-set.ts`
  - Clears the in-process shared label-set cache.
  - Supports:
    - `clearPhiLabelSetCache()`
    - `clearPhiLabelSetCache({ locale: "de" })`
    - `clearPhiLabelSetCache({ setKey: "widget:registration" })`
    - `clearPhiLabelSetCache({ locale: "de", setKey: "widget:registration" })`

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

- `LABEL_SET_CACHE`
  - File: `gateway/label-set.ts`
  - Manual clear available through `clearPhiLabelSetCache(...)`.

- `configCache`
  - File: `helpers/site-locale-config.ts`
  - TTL-based helper cache.
  - No explicit clear helper yet.

## Translation Request Caching

- `gateway/tr.ts`
  - Uses `fetch(..., { cache: process.env.NODE_ENV === "development" ? "no-store" : "force-cache" })`
  - No standalone clear function.
  - If tag-based invalidation is needed here, the fetch contract must be moved to tagged Next cache primitives.

## Form Guard Fetching

- `gateway/form-guard.ts`
  - Always `no-store`, and never cached anywhere else: each render needs a fresh `issuedAt`/`formToken`, which phis-server refuses once `maxSubmitMs` has passed.

## Rule

Published data a Site reads from Core is not kept in Next's data cache (`force-cache`, `revalidateTag`): no invalidation reaches every Site process. Keep it in a per-process cache with a TTL, and clear that cache where the write passes through the Site, as `gateway/site-read-cache.ts` does.
