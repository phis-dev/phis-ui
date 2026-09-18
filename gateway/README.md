# Gateway

This directory is the internal adapter layer between `@phis/ui` and `@phis/server` (`phis`).

## Scope

- `gateway/*` has no package export. A Site imports only the route handlers re-exported from
  `@phis/ui/next/route-handlers` -- the auth, site, Add-on and hook doors -- and hands the site door its
  Bridge loader; a Module uses the Label Set helpers re-exported from `@phis/ui/server-helpers`.
- The paths under `/api/site` that are answered here rather than upstream -- the Form relay, Module
  diagnostics, navigation targets -- are reached through that one door and are never separate exports.
  A Site's route files are written at installation and belong to it from then on, so an address spelled
  as a file there could never be revised; this package arrives through the dependency.
- Everything else here -- reads from Core, caches, label sets, translation requests -- is how `@phis/ui`
  renders, not something a Site or a Module calls.

## Responsibilities

- read Site config, Areas, Pages, navigation, and server capabilities from Core (`site-config.ts`,
  `site-area.ts`, `site-page.ts`, `site-nav.ts`, `server-capabilities.ts`)
- translation requests (`tr.ts`) and generic label-set infrastructure (`label-set.ts`)
- the Form registry, handler resolution, submit, guard, and the `/api/site/forms` relay
  (`form-registry.ts`, `form-handler-resolution.ts`, `form-submit.ts`, `site-form-route.ts`); the contract
  is [FORMS.md](../FORMS.md)
- upstream target selection for the Site's proxy route handlers, so a Site repository only mounts them,
  and the dispatch that keeps a path under `/api/site` in the Site (`site-proxy.ts`, `site-area-bridges.ts`,
  `module-diagnostics-route.ts`, `navigation-target-route.ts`)
- the data-source (`data-source.ts`) and mutation (`mutation.ts`) descriptor types; mutations are a
  separate write contract and are never modeled as cacheable reads

## Rules

- Backend request/response adaptation stays here; public runtime constants belong in `constants/*`,
  public helpers in `helpers/*`, public server-only helpers in `server-helpers/*`.
- Backend payloads stay renderer-agnostic: no React component names, import paths, or Site-specific code
  references.
- Concrete Widget and Layout label definitions do not belong here; only generic label-set helpers do.
- Translation payloads stay on the translation helpers and label-set contract, not in data-source
  descriptors.
- Caching and invalidation are owned by [CACHES.md](./CACHES.md): published data is not kept in Next's
  data cache, Next cache tags are not used, and `revalidateTag` is not an invalidation path.

## Logging

- Proxy and gateway code logs through a `PhiLogger` from `net/log.ts` (`child`, `debug`, `info`, `warn`,
  `error`); the shapes come from `@phis/contracts/logging`.
- One JSON line per event on stdout/stderr, so `systemd` and `journalctl` can filter them.
- Services are exactly `phis`, `ui`, `site`, and `cli`; levels are `debug`, `info`, `warn`, and `error`.
- Context fields are `service`, `siteKey`, `area`, `requestId`, `userId`, `actorRole`, `pluginKey`,
  `method`, `path`, `targetType`, and `targetId`; an event adds `message`, `status`, `durationMs`,
  `error`, and `meta`.
- Keep records Site-scoped whenever a request has Site context. Never log secrets or full request payloads.
