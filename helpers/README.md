# Helpers

Runtime helper functions for `@phis/ui`. The `@phis/ui/helpers` entry point (`helpers.ts`) re-exports a
selected subset; the other files are internal and imported by path inside the package.

## What belongs here

- flag, mask, and path helpers (`flags.ts`, `cms-paths.ts`, `cms-routing.ts`, `locale.ts`)
- value normalization and config serialization (`renderable-block-*.ts`, `cms-config-serialization.ts`,
  `layout-style.ts`)
- small data-shaping helpers that are not tied to React rendering, such as preset node factories
  (`cms-node-factories.ts`, `cms-preset-nodes.ts`)
- metadata and SEO builders (`phi-metadata.ts`, `phi-seo.ts`)

Viewer access is not decided here: use `canPhiViewerAccess` from `types/access.ts` ([ACCESS.md](../ACCESS.md)).

## What does not belong here

- reads from `@phis/server` and translation requests (`gateway/*`)
- Widget registries and React components

## Server-only and stateful files

Most helpers are pure. The exceptions are explicit:

- `site-runtime.ts` (which imports `server-only`) and `phis-server-credentials.ts` read the Site's local
  config files and memoize them in module state. `site-runtime.ts` is not re-exported through `helpers.ts`.
- `translation-cache.ts` is a mutable per-process singleton kept on `globalThis`; its behavior is described
  in [gateway/CACHES.md](../gateway/CACHES.md).
- `phi-sitemap-cache.ts` creates a fingerprint cache; the instance that holds the finished sitemap is
  per process and rebuilds when the Public read fingerprint changes.

A new helper with module state or a server-only import names that in its file header; anything that
fetches belongs in `gateway/*` or `server-helpers/*`.
