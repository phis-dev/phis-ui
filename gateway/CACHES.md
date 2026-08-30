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

## Cache Tags

- `getSiteConfigCacheTag(siteKey)`
  - File: `gateway/cache-tags.ts`
  - Used by `gateway/site-config.ts`.

- `getSiteNavigationCacheTag(siteKey, navKey, locale?)`
  - File: `gateway/cache-tags.ts`
  - Used by `gateway/site-nav.ts`.

These tags are intended for Next.js cache invalidation via `revalidateTag(...)`.

## React `cache(...)` Wrappers

These helpers use React server cache and currently do not expose a manual clear function:

- `getResolvedSiteConfig(...)`
  - File: `gateway/site-config.ts`

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
  - Uses `no-store` in development and `force-cache` otherwise.
  - No explicit clear helper.

## Recommended Pattern

When both Next cache invalidation and local in-process cache reset are needed, do both in the same server-side function:

```ts
"use server";

import { revalidateTag } from "next/cache";
import { clearPhiLabelSetCache } from "@phis/ui/gateway/label-set";

export async function invalidateRegistrationLabels() {
  revalidateTag("your-tag");
  clearPhiLabelSetCache({ setKey: "widget:registration" });
}
```

## Current Limitation

- `revalidateTag(...)` does not automatically clear custom `Map` caches.
- Custom `Map` caches must be cleared explicitly.
