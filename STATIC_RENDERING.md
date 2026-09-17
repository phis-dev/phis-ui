# Static Rendering of Public Pages

A Public page is rendered **once for every anonymous visitor** and served from memory after that. Every
Widget, Layout, Controller and Module that renders on a Public page takes part in that render. This
document is what a Module or Add-on author has to know about it; the rules at the top are the part that
must not be missed.

## The rules

> **1. Nothing a server render of a Public page produces may depend on the visitor.**
> In the static render `cookies()` and `headers()` return empty values **without an error**, the viewer
> is always anonymous, and there is no query. Code that reads any of them there silently gets nothing.
> Whatever differs per visitor -- a token, a greeting, a cart, a random value, "last seen" -- is loaded
> in the browser after the page arrived.
>
> **2. Data that is not published through the Builder can be up to 60 seconds old on a Public page.**
> A page is rendered again when something is published (within about two seconds, on every instance) and
> otherwise at most once a minute. A Module's own records -- news entries, calendar events, prices,
> stock, form submissions, anything an Add-on stores -- do not count as published. Data that must be
> current to the second is loaded in the browser.
>
> **3. `next dev` never renders statically.** A violation of rule 1 or 2 does not show during
> development. Every Widget meant for a Public page is checked once in a production build, signed out.

## What happens to a request

```text
Browser -> web server -> Site proxy (next/site-proxy.ts)
                           |
                           |- Site session cookie (phis_session)      -+
                           |- a query parameter other than utm_*,      |-> dynamic render, as always
                           |  gclid, fbclid                            |
                           |- anything but GET or HEAD                 |
                           |- not a Public page under a locale        -+
                           |
                           +- otherwise: rewritten internally to
                              /static-render/<marker>/<light|dark>/<locale>/<path>
                                 |- rendered before and kept?  -> served from memory
                                 +- not yet                    -> rendered once, kept, served
```

- **Signed-in visitors, the Builder, Admin and every other Area are never static.** Nothing about them
  changes.
- **A request with a query is never static**, so reading `searchParams`, `visibleWhen` conditions on the
  query, confirmation tokens in a link and review or revision parameters all keep working on the server.
  Only `utm_*`, `gclid` and `fbclid` are ignored, and a static render does not see them.
- **`<marker>`** joins the Site's read marker with its translation markers. It moves when the Site record
  changes, when a Page, Area, Navigation or Theme is published or removed, and when a translation is
  written (phis-server `DB.md`, `phis.site_read_marker`). Each Site process reads it at most every two
  seconds; a new marker is a new address, so the next request renders fresh. Nothing is purged.
- **`revalidate = 60`** renders a kept page again after a minute, in the background: the first request
  after that minute still gets the kept page, the next one the new render. This is the ceiling for
  everything the marker does not see.
- **`<light|dark>`** comes from the browser's colour-scheme hint cookie. Each mode is its own entry.
- **The cache** is this process's memory, 128 MB by default (`PHIS_RENDER_CACHE_MB`), least recently read
  first out (`next/cache-handler.mjs`). Instances do not share it and do not need to.
- **An open tab** keeps pages it already navigated to for 30 seconds (`staleTimes.static`); a reload
  shows a publish at once.

## What this means when you build something

### Widgets and Layouts

You write them exactly as before; there is no second, static version of anything. The server half runs
in both renders and has to be correct in both:

| In the server half of a Public Widget | Static render | What to do |
|---|---|---|
| `cookies()`, `headers()` | empty, no error | don't read them; the Widget's config and `runtime.site` carry what a page needs |
| `runtime.viewer` | always anonymous | render what an anonymous visitor sees; per-viewer parts belong in the Client half |
| `runtime.request.searchParams` | `{}` | fine to read: a request with a query renders dynamically |
| a token, nonce, CSRF value, timestamp or random value | frozen for everyone | fetch it from the browser (see `components/forms/form-guard-client.ts`) |
| `new Date()` | up to 60 s old | fine for a year or a date; a clock or countdown renders in the browser |
| a read from Core or an Add-on | up to 60 s old unless it is published content | fine for most lists; load in the browser what must be live |
| `fetch(..., { cache: "no-store" })` | allowed, runs at render time | nothing to do |

Client halves, Controllers running in the browser, Data Providers and Tables that load through the
browser are unaffected: they run per visitor and always see current data.

Access policies keep working. A node visible only to signed-in visitors is simply absent from the static
render, and a signed-in visitor gets the dynamic one.

### Pages and routes

- **A new Page needs nothing.** It is rendered on its first request; there is no build and no list of
  paths.
- **A Module route** under the Public Area is a Page like any other and follows the same rules.
- **Route handlers (`/api/...`) are never static** and are not affected.

### Add-ons

An Add-on's routes are not rendered statically. What an Add-on stores does not move the marker, so a
Public page that renders Add-on data on the server shows it up to a minute late. If a write must be
visible at once -- a booking that removes a slot, a sold-out product -- the Widget loads that part in the
browser from the Add-on route.

## Checking a page

The response of a page says which render answered:

| `x-nextjs-cache` | Meaning |
|---|---|
| `MISS` | static, rendered by this request and kept |
| `HIT` | static, served from memory |
| `STALE` | static, served from memory while a newer render happens in the background |
| absent | dynamic |

To check a Widget: build the Site (`pnpm build`), start it (`pnpm start`), open the page **signed out
and without a query**, and look at it twice -- once fresh, once served from memory. Then compare with the
same page opened with `?check=1`, which renders dynamically. They must show the same thing.

## Where it lives

| Part | File |
|---|---|
| Deciding static or dynamic, the rewrite | `next/site-proxy.ts` |
| Rendering without the request | `server-helpers/static-render.ts`, `server-helpers/cms-root.ts` |
| Route factories of the static tree | `next/area-route.tsx` (`createPhiNextStaticPublic*`), `next/root-route.tsx` (`createPhiNextStaticRootLayout`) |
| The memory cache | `next/cache-handler.mjs` |
| The Site's route tree | `NEXT_INTEGRATION.md`, "Area route graph" |
| The marker | `gateway/site-config.ts`, `gateway/CACHES.md`, phis-server `DB.md` |
