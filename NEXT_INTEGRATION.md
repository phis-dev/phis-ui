# Next.js Site Integration Contract

This document defines the ownership boundary between `@phis/ui` and a generated or deployed Next.js
Site Skeleton (`phis init`, `phis-site-skeleton`). Areas, the CMS tree, and node identity are
[CMS.md](./CMS.md).

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
- thin API and proxy entrypoints;
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

A Site builds with Next's default bundler, Turbopack, for both `next dev` and `next build`.

These entrypoints must remain physically separate. A generic Area switch, namespace import, or shared
index that statically reaches every manifest would merge Admin/Builder implementations back into the
Public Client graph under App Router and Turbopack.

Third-party Modules contribute all optional code through their own physically separated package exports.
`phis module` records installed packages and generates the projection files under `src/generated/`, which
the Skeleton's `src/runtime-modules/` files hand to the package factories. The generic Module host places
each installed Module into its eligible Area Server catalogs, Client manifests, and the Builder authoring
union.

Apart from that generated projection, Site source never imports an optional package name, reconstructs
Module manifests, or gains Module-specific routes. Request and database values may select only Module ids
already present in the build; they never become package import targets. Builder alone may consume the installed target-Area
authoring union for its isolated Canvas, without activating those Modules in the outer Builder runtime.

## Area route graph

Every Area is routed through two branches, because the root of an Area draws no Shell. It is either a
landing page -- whose point is to arrive without the Area's chrome and the cost of resolving it -- or a
redirect, which draws nothing at all. The Public Area is addressed by locale rather than by an Area
segment, so `/de` is its root exactly as `/builder` is the Builder's; there is no separate rule for it.

`<area>` is the Area key for every Area but Public, which is routed as `[root]` (its locale). `<slot>` is
each of the five page-owned slots: `@headerBottom`, `@hero`, `@siderRight`, `@footerTop`, and `@drawer`.

```text
src/app/(site)/layout.tsx                     the request-reading document shell
src/app/(site)/<area>/layout.tsx              guards, providers, Area Overlays, Client boundary
src/app/(site)/<area>/(root)/layout.tsx       chrome "none"   -- the Area root
src/app/(site)/<area>/(root)/page.tsx
src/app/(site)/<area>/(root)/@<slot>/page.tsx
src/app/(site)/<area>/(root)/@<slot>/default.tsx
src/app/(site)/<area>/(pages)/layout.tsx      chrome "shell"  -- everything below it
src/app/(site)/<area>/(pages)/[...path]/page.tsx
src/app/(site)/<area>/(pages)/@<slot>/[...path]/page.tsx
src/app/(site)/<area>/(pages)/@<slot>/default.tsx
```

**Every slot carries a `default.tsx`.** Next holds one active segment per slot beside the children
segment, and a client navigation that leaves the branch -- the Area root to a Page below it, or one Area
to the next -- moves children to something the slots have no counterpart for. The file is what Next puts
there instead; without it, the leaving branch's slot segment stays and is asked to serve an address it
was never resolved for.

It is Next's own contract and nothing more. It was added while hunting the Area-switch navigation loop and
**measured not to affect it** -- a full 2x2 against the slots' second defect below, every cell of which
runs away (TODOS.md). So it earns its place as correctness, not as a fix.

It draws nothing, which is the answer rather than a placeholder: a slot draws one Region of one Page, and
an address that does not reach that Page has no Region for it.

The static tree is the exception and must not be given one. Only the proxy reaches it, with a document
request, so nothing ever navigates within it -- and there its slots sit *inside* the catch-all
(`(pages)/[...path]/@<slot>/page.tsx`) rather than beside it. A `default.tsx` there resolves to a route
with `[...path]` in the middle, which Next refuses outright: `Catch-all must be the last part of the URL`,
thrown as an unhandled rejection that takes the whole route manifest with it. Adding the file for
symmetry was tried, and every Public address answered 404 until the files were removed and the process
restarted.

**A slot never navigates.** It does not forward a forwarding Page and it does not refuse an Area the
viewer may not see -- it returns nothing and lets the Layout beside it answer, once, with a status line.
Six segments resolve the same request in parallel, so a `redirect`, `unauthorized` or `forbidden` raised
in a slot is raised six times over; and each of the three reaches the client as a navigation, which the
arriving tree asks for again as soon as it renders that slot. Existence, access and forwarding are
decided above the split for exactly this reason.

This too was measured against the Area-switch loop and does not move it either. It stands as what it is:
a refusal answered once instead of six times.

The Public Area is routed a second time, for anonymous visitors, in a tree that reads nothing of the
request and whose renders Next keeps ([STATIC_RENDERING.md](./STATIC_RENDERING.md)). It has its own
root Layout, which is why both trees sit in route groups:

```text
src/app/(static)/static-render/[marker]/[mode]/[root]/layout.tsx          document shell, Public Client boundary
src/app/(static)/static-render/[marker]/[mode]/[root]/not-found.tsx       locale from next/root-params
src/app/(static)/static-render/[marker]/[mode]/[root]/(root)/layout.tsx   boundary and chrome "none"
src/app/(static)/static-render/[marker]/[mode]/[root]/(root)/page.tsx, @<slot>/page.tsx
src/app/(static)/static-render/[marker]/[mode]/[root]/(pages)/[...path]/layout.tsx   boundary and chrome "shell"
src/app/(static)/static-render/[marker]/[mode]/[root]/(pages)/[...path]/page.tsx, @<slot>/page.tsx
```

Its Layouts sit inside the catch-all, where they are given the page's segments; the dynamic tree's
Layouts derive them from a request header the static tree may not read. Only the proxy reaches this tree.

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

## Page metadata, indexing, and sitemap

- A Page's title and description come from its record (`titleMsgId`, `descriptionMsgId`). A code-owned
  route preset returns them through `pageMeta`; without a title label its descriptor title is translated
  through the Site-scoped path. The Area's defaults fill in where the Page states nothing, as described
  above; the Site name is the last fallback.
- Whether a Page may be indexed is the `PhiCmsFlags.NoIndex` bit on the Page record, set in the Builder's
  page-meta dialog. A route preset only states what a new Page starts as, through `defaultPageFlags`,
  which is copied onto the Page when it is instantiated. Area and Page only add up: every authenticated
  Area is `noindex`, and inside Public a Page may withdraw itself but never reopen an Area that is off.
- An indexable Public Page states `alternates.canonical` (its own absolute URL in its own locale) and
  `alternates.languages` (one entry per Site locale with the same path, plus `x-default` for the default
  locale). A language version is never canonical to another (`helpers/phi-seo.ts`). A Site without an
  absolute public base (`site.publicUrl`, else `config/site-runtime.json`) states no canonical, no
  alternates, and has no sitemap.
- `/sitemap.xml` and `/robots.txt` are route handlers from `@phis/ui/next/seo-routes`, answered from the
  Public bridge. The sitemap exists when the Site has a public base and the Public Area has `index` and
  `sitemap` on; otherwise it answers `404`. Its candidates are the Area root, exact Module routes, and the
  published Public Pages; each is listed only when its anonymous view is not a redirect, not refused, and
  not `noindex`, once per locale with the full hreflang set.
- The finished sitemap is cached per Site process and rebuilt when its fingerprint changes (live revision
  ids, Area preset, active Modules, locales, public base), which every request reads.
- `robots.txt` allows everything and names the sitemap when there is one. It lists no staff Area --
  those stay out of the index through `noindex` -- and answers even when the Site cannot be read.

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
through `next/font` at all; see "Site-owned fonts" below.

### Modules bring their own families

A Theme preset that ships its own look can ship its own lettering, in two parts that live at two
different times.

**The choice is a Theme block.** `fonts` is the fourth block kind beside palette, style and ground
(theme/phi-theme-blocks.ts): a key, a title, and the family each of the five slots names. A Set names
one, the composition resolves it like the others and falls back to the core block -- Fira Sans, Fira
Mono, Lora -- when the Module that shipped it is gone, and the runtime payload folds it under the
author's `fonts` slot by slot, so the root layout never learns which of the two named a family. A block
kind of its own rather than a field on the style block, because every Theme of the example package
reuses the core style and would otherwise have needed a near-empty copy of it to name two typefaces.

**The declaration is a package boundary.** A Module exports `phiModuleFontContributions` from `./fonts`
(THIRD_PARTY_MODULES.md section 8a): `next/font/local` calls at module scope in a file nothing else in
the package imports, because the call throws outside a Next build and the Server boundary is read by
tools that are not one. Each contribution is a `PhiFontCatalogueEntry` -- family name, the variable in
the Module's own namespace, the scoping class -- and `composePhiFontCatalogue` in
theme/phi-font-catalogue.ts lays them after the core families, refusing a name declared twice. The root
route composes the catalogue once from the generated list of installed `./fonts` boundaries and hands it
to the root layout, which stops knowing about Fira or Lora and puts every class on the root element.

Two things follow from the section above and are not negotiable by the design:

- A contributed family carries `preload: false`. The active Theme is known per request, the preload
  link is not writable per request, and preloading every family a Module might contribute would undo
  exactly what the catalogue split just bought.
- A Module that is installed but switched off still contributes its declaration to the build. The
  files are downloaded and hosted; only the `@font-face` rule, a few hundred bytes, reaches the page.
  A Site pays for a Module's lettering in deploy size, never in fetches.

The generated list is `src/generated/site-modules-fonts.ts`: one import per installed package that
exports `./fonts`, gathered into the second argument of `createPhiNextRootLayout`. `phis module` writes
it with the rest of the projection, from the `exports` of the packages installed in the Site. A package installed from a tarball rather than a workspace link has to be listed in
`transpilePackages`, because the font loader runs only over modules Next compiles.

On save, `adoptPhiThemeModuleFonts` (theme/phi-theme-adoption.ts) copies the family names of a Module's
fonts block into the Theme record, slot by slot under the author's. The name is copied, not the file:
the family still resolves against the Module's declaration. Copying the file into the Media library is
designed in [design/FONTS.md](./design/FONTS.md).

### Site-owned fonts

A Theme font slot holds either a family name or a `phis:asset/<id>` reference to a font Asset in the
Site's Media library. The Builder's font slots offer the catalogue's families and the Site's font Assets
as one closed list. `resolvePhiSiteThemeFonts` (theme/phi-theme-fonts.server.ts) resolves each referenced
Asset to its delivery URL and the metrics read at upload; a reference that does not resolve to a font
leaves the slot as it was. An Asset cannot be deleted while a Theme revision names it.

For each Site-owned face, theme/phi-font-face.ts writes two rules: the face itself, and a local
substitute re-proportioned with `size-adjust` and ascent, descent and line-gap overrides, so the swap does
not move the page. The metrics come from the file's own tables at upload and are kept in the Asset's
`meta`.

At upload the server also records `meta.font.coverage`: the named unicode ranges the font maps at least
one codepoint in, plus a `rest` cut for codepoints outside all of them. Every cut is packed as woff2
and delivered from `/api/site/media/[id]/subsets/[key]`. `buildPhiFontSubsetFaces`
writes one `@font-face` per cut with its `unicode-range`; a font without `coverage` gets a single face
over the whole file. The page's locale decides what is preloaded -- the body slot's `Latin` cut and the
cut its script needs (`resolvePhiFontPreloadSubsetKeys`) -- never which glyphs survive, because content
routinely carries characters outside the interface languages.

A font is not an inline-safe content type and is served as an attachment. That does not affect a
stylesheet's fetch: `Content-Disposition` governs navigations and downloads, not subresource loads.

## Required Skeleton entrypoint shape

A Site binds each Area once, in `src/runtime-modules/`, handing the generated Module projection to the
package factories:

```ts
// src/runtime-modules/admin.ts
import { createPhiAdminCmsSiteBridge } from "@phis/ui/next/areas/admin";
import { PHI_SITE_MODULES } from "@/generated/site-modules";

export const PHI_ADMIN_CMS_SITE_BRIDGE = createPhiAdminCmsSiteBridge(PHI_SITE_MODULES);
```

```tsx
// src/runtime-modules/admin-client.tsx
"use client";

import { createPhiAdminRuntimeModuleClientBoundary } from "@phis/ui/next/areas/admin-client";
import { PHI_SITE_MODULES_CLIENT } from "@/generated/site-modules-client";

export const PhiAdminRuntimeModuleClientBoundary =
  createPhiAdminRuntimeModuleClientBoundary(PHI_SITE_MODULES_CLIENT);
```

An Area's own layout is then limited to static registration, importing the bridge and boundary from
`@/runtime-modules/<area>`:

```tsx
// src/app/(site)/admin/layout.tsx
import { createPhiNextStaticAreaBoundary } from "@phis/ui/next/area-route";
import { PHI_ADMIN_CMS_SITE_BRIDGE } from "@/runtime-modules/admin";
import { PhiAdminRuntimeModuleClientBoundary } from "@/runtime-modules/admin-client";

export const dynamic = "force-dynamic";
export default createPhiNextStaticAreaBoundary(
  "admin",
  PHI_ADMIN_CMS_SITE_BRIDGE,
  PhiAdminRuntimeModuleClientBoundary,
);
```

Each branch layout registers the same factory and differs only in how much it draws:

```tsx
// src/app/(site)/admin/(pages)/layout.tsx
import { createPhiNextStaticAreaLayout } from "@phis/ui/next/area-route";
import { PHI_ADMIN_CMS_SITE_BRIDGE } from "@/runtime-modules/admin";

export const dynamic = "force-dynamic";
export default createPhiNextStaticAreaLayout("admin", PHI_ADMIN_CMS_SITE_BRIDGE, "shell");
```

The `(root)` branch passes `"none"`. Route handlers a Site mounts come from
`@phis/ui/next/route-handlers`; `/sitemap.xml` and `/robots.txt` come from `@phis/ui/next/seo-routes`.

One door per kind of traffic, and never one per address. A Site's route files are written when it is
installed and belong to the installation from then on, so an address spelled as a file there is one that
can never be revised, while this package arrives through the dependency and is replaced with it. The
paths under `/api/site` whose answer is in the Site rather than in Core -- `forms`, `module-diagnostics`,
`navigation-target` -- are therefore not mounted: `buildPhiSiteProxyHandlers` recognises them and answers
them from the Site's own Modules. The Site hands it `loadAreaBridge`, a loader for one Area's Bridge, and
that is the whole of what it contributes; adding another such path adds nothing to a Site.

Asset bytes need no route of their own. Every delivery address this package builds is
`/api/site/media/{id}/content|variants|subsets`, which the Site's `/api/site` proxy already forwards, and
`images.localPatterns` admits exactly that prefix. A Site mounting a shorter public media address would be
mounting a second thing to keep pointing at Core.

The Skeleton may adapt a Next route parameter name or provide route-specific logging labels and user
agents. Such adapters must remain transport-only and must not interpret CMS, role, module, or locale
semantics. A Module installation must not change this entrypoint shape.

## Patchability

Behavioral fixes belong in `@phis/ui` so a package update patches deployed Sites without
regenerating their Skeleton. Module behavior belongs in its Module package. `phis` may update packages,
the external immutable build manifest, and deployment artifacts, but it must not edit Skeleton source as an
installation mechanism. A Skeleton source update is reserved for an explicitly approved change to the
physical Next.js route graph, deployment configuration, or another genuinely Site-owned entrypoint.

If a Module needs `@phis/server` implementation code, that implementation is the Add-on half of the same
package, under `@scope/name/addon/…`. The Site never imports those entrypoints.
