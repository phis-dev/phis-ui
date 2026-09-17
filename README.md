# @phis/ui

`@phis/ui` is the shared UI, CMS renderer, and Runtime Module host for Phi Sites: Next.js App Router
applications built on Ant Design and served by a `phis` server. It renders the Areas, Pages, Regions,
Layouts, Widgets, Overlays, and Forms a Site stores in `phis`, hosts the Runtime Modules installed into
the Site, and provides the Builder that edits them.

The package is pre-v1. Contracts change without compatibility layers; see [Stability](#stability).

## What it owns and does not own

`@phis/ui` owns:

- CMS resolution and rendering: Areas, shells, Regions, Layouts, Widgets, Overlays, and Page metadata;
- the Runtime Module host: catalogs, activation, lazy loading, and per-Area Client manifests;
- the first-party Modules (Core, the six Area base Modules, Auth, Assets, Theme, Builder tooling, and
  others -- [MODULES.md](./MODULES.md#first-party-modules));
- the signal bus and Controllers, Forms and their gateway relay, Tables, Trees, and Collections;
- the Phi Controls around Ant Design, Theme resolution, and translation helpers;
- the `@phis/ui/next/*` factories a Site's route files delegate to.

It does not own:

- App Router route registration: route files live in the Site;
- Site branding, content, and copy: those are stored in `phis`;
- backend state: sessions, authentication, CSRF and Form guards, storage, and authorization belong to
  `@phis/server`;
- server extensions: those are `phis` Add-ons.

## Requirements

- A Next.js 16 App Router Site. Start from `phis init` (the `phis-site-skeleton`).
- A running `@phis/server` (`phis`) that serves the Site.
- Peer dependencies:

| Package | Range |
| --- | --- |
| `next` | `^16.2.11` |
| `react`, `react-dom` | `^19.2.8` |
| `antd` | `^6.5.1` |
| `@ant-design/icons` | `^6.3.2` |
| `@ant-design/nextjs-registry` | `^1.3.0` |

## For Site operators

- Create a Site with `phis init <site key>`. The generated Site is the Skeleton: route files, deployment
  config, and a generated Module projection.
- The Site's `next.config` sets `transpilePackages: ["@phis/ui"]`.
- Route files are thin wrappers over `@phis/ui/next/*` factories (`createPhiNextStaticAreaBoundary`,
  `createPhiNextStaticAreaLayout`, and the Area bridges in `@phis/ui/next/areas/<area>`). They hold no CMS,
  locale, or access logic. Behavior fixes arrive by updating the package, not by editing the Site.
- Install Module packages with `phis module add --site <site key> --package <name>`, rebuild, and enable
  the Module per Area in the Builder.
- The Site boundary, the route graph, fonts, and metadata are [NEXT_INTEGRATION.md](./NEXT_INTEGRATION.md).

## For Module authors

- Start with [THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md): package layout, fixed exports, building,
  and installing.
- The Module contract is [MODULES.md](./MODULES.md); signals are [SIGNALS.md](./SIGNALS.md).
- Read [STATIC_RENDERING.md](./STATIC_RENDERING.md) before building anything for the Public Area: Public
  pages are rendered once for every anonymous visitor.

## Entry points

The root export (`@phis/ui`) is not an integration surface; import from the grouped subpaths below
(`package.json#exports`).

| Group | Entry points |
| --- | --- |
| Next.js Site | `next/area-route`, `next/areas/<area>`, `next/areas/<area>-client`, `next/root-route`, `next/site-bridge`, `next/site-proxy`, `next/proxy-runtime`, `next/route-handlers`, `next/seo-routes`, `next/cache-handler`, `next/navigation-target-route`, `next/module-diagnostics-route`, `next/runtime-module-client-boundary` |
| CMS rendering | `cms`, `cms/root-layout`, `cms/root-page`, `cms/root-slot-page`, `cms/error-page`, `cms/request`, `cms/plugins`, `cms/plugins/<area>` |
| Module packages | `module`, `module/client`, `module/authoring-client`, `module/projection`, `module/projection/client`, `module/projection/authoring-client`, `module/site-modules`, `module/site-modules-client` |
| Runtime Clients | `runtime`, `runtime/controller-client`, `runtime/render-client`, `runtime/signal-client`, `runtime/data-provider-client`, `runtime/authoring-client`, `runtime/authoring-manifest-client`, `runtime/calendar-adapter-client`, `runtime/client-manifests/<area>` |
| UI | `widgets`, `widget-config`, `controls`, `controls/config`, `controls/date-time`, `layouts`, `shells`, `root`, `navigation`, `forms`, `media`, `references`, `state`, `theme` |
| Builder | `builder`, `builder-api-route` |
| Contracts and helpers | `types`, `constants`, `helpers`, `helpers/site-runtime`, `server-helpers`, `net` |
| Plugin helpers | `plugins/factories/widget-builder-plugin`, `plugins/registries/runtime-controller-core`, `plugins/registries/runtime-controllers` |

`<area>` is `public`, `app`, `admin`, `builder`, `editor`, or `accounting` (`cms/plugins/<area>` exists
for all but `builder`). Import only the Area entry points a route needs; each Area is a separate module
graph.

## Contract documents

| Topic | Document |
| --- | --- |
| Areas, CMS tree, renderable blocks, node identity | [CMS.md](./CMS.md) |
| Runtime Modules | [MODULES.md](./MODULES.md) |
| Building a Module package | [THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md) |
| Signals and the Core Runtime Controller | [SIGNALS.md](./SIGNALS.md) |
| Next.js Site integration | [NEXT_INTEGRATION.md](./NEXT_INTEGRATION.md) |
| Static rendering of Public pages | [STATIC_RENDERING.md](./STATIC_RENDERING.md) |
| Shell | [SHELL.md](./SHELL.md) |
| Layouts and Regions | [LAYOUTING.md](./LAYOUTING.md) |
| Theme | [THEME.md](./THEME.md) |
| Widgets and Controls | [components/widgets/README.md](./components/widgets/README.md) |
| Forms | [FORMS.md](./FORMS.md) |
| Tables, Trees, Collections | [TABLES.md](./TABLES.md), [TREES.md](./TREES.md), [COLLECTIONS.md](./COLLECTIONS.md) |
| Overlays | [OVERLAYS.md](./OVERLAYS.md) |
| Builder | [BUILDER.md](./BUILDER.md) |
| Settings | [SETTINGS.md](./SETTINGS.md) |
| Access and visibility | [ACCESS.md](./ACCESS.md) |
| Authentication | [AUTHENTICATION.md](./AUTHENTICATION.md) |
| References and Page paths | [REFERENCES.md](./REFERENCES.md) |
| Translations | [TRANSLATIONS.md](./TRANSLATIONS.md) |
| Gateway caches | [gateway/CACHES.md](./gateway/CACHES.md) |
| Designs (not contracts) | [design/](./design/README.md) |
| Open work | [TODOS.md](./TODOS.md) |
| Rules for contributors and agents | [AGENTS.md](./AGENTS.md) |

## Stability

`@phis/ui` is pre-v1 (`0.x`). Any release may change a contract, an export, or a stored shape without a
compatibility layer or migration path; callers and stored data are updated together with the package.
Pin an exact version and upgrade `@phis/ui`, `phis`, and installed Module packages together.

## License

Apache-2.0. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
