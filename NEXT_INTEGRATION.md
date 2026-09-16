# Next.js Site Integration Contract

This document defines the target v1 ownership boundary between `@phis/ui` and a generated or
deployed Next.js Site Skeleton.

For the complete package and Site-composition walkthrough for an installed third-party Module, start
with [THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md).

## Ownership

`@phis/ui` owns all reusable Site runtime behavior:

- root metadata and document-shell orchestration;
- locale redirect and request proxy policy;
- CMS Site bridge creation and resolved-request loading;
- static Area and dynamic Public route factories;
- metadata, not-found, and parallel-slot rendering;
- proxy runtime configuration and forwarded-header construction;
- one immutable Server catalog and one separate Client manifest boundary per Area.

The Site Skeleton owns only deployment and App Router registration:

- `config/site-runtime.json`, read once per Site process: a changed Site key, API base or internal token
  takes effect when the Site restarts, and tooling that rewrites the file restarts the Site's services;
- the physical Next.js `app` directory and its required parallel-route directories;
- `dynamic`, `runtime`, and statically analyzable route configuration exports;
- thin API, media, and proxy entrypoints;
- deployment assets and global CSS.

The Skeleton must not copy shared CMS resolution, locale selection, metadata derivation, proxy policy,
viewer redirects, fallback behavior, or optional Module composition. The Skeleton is the versioned base
for every Site and remains an updateable wrapper layer after Site creation. Installing, upgrading, or
removing a Module must not patch the Skeleton source or generate Module-specific route/runtime files.

## Static graph boundary

Next.js discovers filesystem routes and parallel slots at build time, so the physical route files remain
in the Site Skeleton. They delegate immediately to `@phis/ui/next/*`.

Each Area has separate Server and Client package entrypoints:

```text
@phis/ui/next/areas/public
@phis/ui/next/areas/public-client
@phis/ui/next/areas/admin
@phis/ui/next/areas/admin-client
...
```

These entrypoints must remain physically separate. A generic Area switch, namespace import, or shared
index that statically reaches every manifest would merge Admin/Builder implementations back into the
Public Client graph under App Router and Turbopack.

Third-party Modules contribute all optional code through their own physically separated package exports.
`phis-cli` installs those packages and produces one immutable, statically analyzable build manifest outside
the versioned Skeleton source. The stable generic Module host consumes that manifest and projects each
installed Module into its eligible Area Server catalog, Client manifests, and Builder authoring union.

The Skeleton and Site source therefore never import an optional package name, reconstruct Module manifests,
or gain Module-specific routes. Request/database values may select only ids already present in the immutable
build manifest; they never become package import targets. Builder alone may consume the installed target-Area
authoring union for its isolated Canvas, without activating those Modules in the outer Builder runtime.

## Area route graph

Every Area is routed through two branches, because the root of an Area draws no Shell. It is either a
landing page -- whose point is to arrive without the Area's chrome and the cost of resolving it -- or a
redirect, which draws nothing at all. The Public Area is addressed by locale rather than by an Area
segment, so `/de` is its root exactly as `/builder` is the Builder's; there is no separate rule for it.

```text
src/app/<area>/layout.tsx              guards, providers, Area Overlays, Client boundary
src/app/<area>/(root)/layout.tsx       chrome "none"   -- the Area root
src/app/<area>/(root)/page.tsx
src/app/<area>/(root)/@<slot>/page.tsx
src/app/<area>/(pages)/layout.tsx      chrome "shell"  -- everything below it
src/app/<area>/(pages)/[...path]/page.tsx
src/app/<area>/(pages)/@<slot>/[...path]/page.tsx
```

Two properties of that shape are load-bearing and must not be flattened back:

- **The branch decides the chrome, not a condition inside a Layout.** Next only mounts and unmounts a
  Layout when the branch it belongs to changes, so a Layout that decided per path would keep drawing
  chrome after a client navigation that was supposed to remove it.
- **The catch-all is required, not optional.** An optional catch-all matches the Area root as well, so
  it would collide with the root branch's own page -- and Next refuses both catch-all kinds at one
  level outright.

The Area's own Layout holds what is true of the Area regardless of which branch answers: the access and
existence guards, the signal partition, the Runtime Module providers, the data provider host and the
Area Overlays. Keeping them above the split is what makes a navigation across it rebuild the Shell
without rebuilding the Area.

## What an Area puts in the document head

Two levels answer, and they answer different questions. The Root Layout states the Site's own
metadata once, including a title template of `%s | <site name>`. Each Area route then states its
Page's head through `buildPhiAreaPageMetadata`, reading the Area's stored answers out of
`config.shell.meta` -- a title template, a default title, and whether the Area may be indexed.

The title an Area route returns is **absolute**. Next has no way to replace an inherited template,
only to opt out of one, and an Area that stated its own template has to replace the Site's rather
than be wrapped by it. That is why the fallback is restated rather than inherited: an Area that never
opened the dialog still gets `%s | <site name>`, which is what the Root Layout always did.

A Page that names no title of its own gets the Area's default title, ungrouped by the template --
that is the whole reason a template and a default are two answers and not one.

`robots` is decided in the same place, because the answer is a fact about the Area rather than about
the Page: every Area but Public is authenticated and is `noindex` whatever is stored, and Public
follows its stored switch. A Site that never opened the Area settings dialog still keeps its Admin
out of the index.

## Fonts

`next/font` is a build-time loader, and that is the whole shape of the problem. The call stands at
module scope with literal arguments; Next evaluates it while compiling, fetches the files once, and
serves them from this origin. A font named by a Theme record can therefore never be *loaded* by it.

What a Theme does decide, per request, is which of the declared families a page **uses** -- that is a
`font-family` resolving to a CSS variable, and nothing about it is static. Declaration is build time,
selection is request time, and the two are easy to confuse because they usually sit in the same file.
They do not have to: any module may declare fonts, not only the Root Layout.

`theme/phi-font-catalogue.ts` is that module. It declares the families a Site may name, exports the
class names that put their variables in scope, and maps a family name to its variable for
`resolveThemeFont`. Every class goes on the root element of every page, which costs nothing: a class
says where a variable may be read, not that bytes must be fetched.

### Preload is the part that cannot be deferred

`next/font` returns a class name, a style object, and a variable -- never a file URL. A
`<link rel="preload">` for the family a Theme happened to pick can therefore not be written by hand,
and preload stays a per-declaration, build-time decision.

So it is taken by what a page needs before it paints. The body family preloads; the code face and the
serif do not, and arrive with `font-display: swap` instead. Measured in the Skeleton's build, that is
236 KB of preloaded Latin faces before the split and 53 KB after -- the 183 KB difference was two
families that a Site running on the body font alone never names. Both are still built and self-hosted;
what falls away is the browser being told to fetch them before anything asks.

A font file that only exists at runtime -- one an operator uploads into the Media library -- cannot go
through `next/font` at all. It would be an `@font-face` rule generated into the Theme's style, pointing
at the Asset's delivery URL, and it would forgo the fallback metrics `next/font` computes, so the swap
would shift layout. Nothing of that is built.

### Draft: Modules bring their own families

**Designed, not built.** What follows is the intended shape, recorded so the next change does not have
to rediscover the constraint above.

A Theme preset that ships its own look cannot ship its own lettering today: the catalogue is a fixed
list in this package, and a preset can only *name* a family, which then resolves to whatever the
viewer happens to have installed. The seam that fixes it is the one the catalogue already has. A
Module declares `next/font` at module scope in its own file -- which is legal, because that file is
statically imported like every other Module file -- and contributes a `PhiFontCatalogueEntry` the way
it already contributes palettes, grounds and sets to the Theme block catalog. The Root Layout then
stops knowing about Fira or Lora and applies whatever the active Modules contributed.

Two things follow from the section above and are not negotiable by the design:

- A contributed family carries `preload: false`. The active Theme is known per request, the preload
  link is not writable per request, and preloading every family a Module might contribute would undo
  exactly what the catalogue split just bought.
- A Module that is installed but switched off still contributes its declaration to the build. The
  files are downloaded and hosted; only the `@font-face` rule, a few hundred bytes, reaches the page.
  A Site pays for a Module's lettering in deploy size, never in fetches.

Open, and for the operator to decide: whether a font becomes a block kind of its own in the Theme
catalog or a field on the style block; whether the Builder's font slots then offer the contributed
families as a list rather than free text; and whether a Site may override a preset's family with one
of its own.

## Required Skeleton entrypoint shape

An Area's own layout is limited to static registration:

```tsx
import { createPhiNextStaticAreaBoundary } from "@phis/ui/next/area-route";
import { PHI_ADMIN_CMS_SITE_BRIDGE } from "@phis/ui/next/areas/admin";
import { PhiAdminRuntimeModuleClientBoundary } from "@phis/ui/next/areas/admin-client";

export const dynamic = "force-dynamic";
export default createPhiNextStaticAreaBoundary(
  "admin",
  PHI_ADMIN_CMS_SITE_BRIDGE,
  PhiAdminRuntimeModuleClientBoundary,
);
```

Each branch layout registers the same factory and differs only in how much it draws:

```tsx
import { createPhiNextStaticAreaLayout } from "@phis/ui/next/area-route";
import { PHI_ADMIN_CMS_SITE_BRIDGE } from "@phis/ui/next/areas/admin";

export const dynamic = "force-dynamic";
export default createPhiNextStaticAreaLayout("admin", PHI_ADMIN_CMS_SITE_BRIDGE, "shell");
```

The Skeleton may adapt a Next route parameter name or provide route-specific logging labels and user
agents. Such adapters must remain transport-only and must not interpret CMS, role, module, or locale
semantics. A Module installation must not change this entrypoint shape.

## Patchability

Behavioral fixes belong in `@phis/ui` so a package update patches deployed Sites without
regenerating their Skeleton. Module behavior belongs in its Module package. `phis-cli` may update packages,
the external immutable build manifest, and deployment artifacts, but it must not edit Skeleton source as an
installation mechanism. A Skeleton source update is reserved for an explicitly approved change to the
physical Next.js route graph, deployment configuration, or another genuinely Site-owned entrypoint.

If a Module needs `@phis/server` implementation code, that implementation is the Add-on half of the same
package, under `@scope/name/addon/…`. The Site never imports those entrypoints.

## Contract governance

Changing, extending, replacing, reinterpreting, or widening this contract requires explicit prior
operator approval after the exact gap and affected ABI have been presented. This contract must not be
bypassed through a parallel, shadow, local, Module-specific, Provider-specific, fallback, or compatibility
contract. If it cannot express a requirement, implementation stops and asks the operator first.
