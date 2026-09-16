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

What is left for the generator: `phis module` has to emit `site-modules-fonts.ts` beside the other
projections -- one import per package that exports `./fonts`, gathered into the second argument of
`createPhiNextRootLayout` -- and a package installed from a tarball rather than a workspace link has to
be listed in `transpilePackages`, because the font loader runs only over modules Next compiles.

### Draft: what a Site keeps when the Module leaves

A family a Module contributes is the Module's for as long as it is installed. Switch it off and a Theme
that named it is left pointing at nothing -- the record still says the family, the catalogue no longer
has it, and `resolveThemeFont` hands the bare name to the browser, which renders whatever the viewer
happens to have. The look a Site decided on would depend on a package staying installed.

The answer is the one pictures already have. `plugins/runtime-modules/theme/materialize-images.ts`
copies a ground a Module shipped into the Site's own Media library at the moment the Theme is saved,
and the draft then points at the Asset. Saving is the moment somebody decides to keep what they see, so
it is the moment ownership moves. Lettering travels the same way, in the same act. The first half is
built: `adoptPhiThemeModuleFonts` copies the family names of a Module's fonts block into the record on
save, slot by slot under the author's. The second half -- the file into the library, and `fonts.body`
naming an Asset instead of a family -- is open, and needs the Module to say where its files are.

`media_assets` now has a `font` kind for exactly that, with the file signatures to go with it -- an
uploaded typeface is stored as `font/woff2` rather than falling through to arbitrary bytes, so what the
Theme has to find again is a query and not a guess.

Two things this forces on the Module side, and they are worth stating before anybody builds it:

- **The Module must ship the file, not only the declaration.** `next/font` returns a class name, a
  style, and a variable -- never a URL -- so there is nothing for an adoption step to read. A family
  that is meant to survive its Module has to arrive the way a ground does: as a file in the package,
  declared through `next/font/local` for the fast path while the Module is installed, and readable as
  bytes when the Theme is saved. A Google family declared through `next/font/google` can be offered,
  but it cannot be adopted, and a Site that picks one keeps it only as a name.
- **After adoption the fast path ends.** An Asset cannot go back through a build-time loader. What
  renders it is an `@font-face` written into the Theme's style against the Asset's delivery URL, and
  that forgoes the `size-adjust` fallback metrics `next/font` computes, so the swap shifts the page.
  The metrics can be read out of the file at upload time and kept in the Asset's `meta`, which is the
  cheapest place to fix it and the reason to decide it before the first font is adopted.

Delivery needs no change for this: a font is not in `PHI_MEDIA_INLINE_SAFE_CONTENT_TYPES` and is served
as an attachment, which a stylesheet's own fetch ignores -- `Content-Disposition` governs navigations
and downloads, not subresource loads. The same argument the delivery code already makes for `<img>`.

### Draft: what happens when a font is uploaded

**Designed, not built**, and deliberately in two steps that do not depend on each other.

**First, the metrics.** A font that is not loaded through `next/font` has no fallback face, and the
browser paints in the substitute until the file arrives. Next writes one per family -- measured in this
Skeleton's build: `Fira Sans Fallback` with `size-adjust: 102.74%` over Arial, `Lora Fallback` with
`115.2%` over Times New Roman, and `Fira Mono Fallback` with `134.59%`, which is how far off a
substitute is when nobody corrects it. The numbers come out of the file's own `head`, `hhea` and `OS/2`
tables, so they are read once at upload and kept in the Asset's `meta`; the Theme's `@font-face` then
carries a matching fallback face and the swap stops moving the page. This is worth doing on its own,
before any pipeline exists, because it fixes the one thing a viewer actually sees.

**Second, the ranges.** An uploaded font is whatever somebody uploaded -- a full family with Cyrillic
and Greek where the Site needed Latin. The answer is not one subset but several faces with
`unicode-range`, which is what Google serves and therefore what `next/font` already gives us: this
build carries 18 to 24 files per family, and a page fetches the one or two it renders from.

Deriving that cut from the Site's languages would be the obvious mistake. Locales describe the
interface, not the content: a customer's name, an address, a quoted line will carry a glyph outside
them, and the failure is a hole in one word, data-dependent, months after the upload. Nor is a language
a set of codepoints -- typographic quotes, dashes, currency and arrows belong to none of them. And the
list changes; a cut made at upload would be wrong the day an operator adds a locale, and redoing it
needs the original anyway. So the Site's languages decide which range is **preloaded**, never which
glyphs survive.

The shape this takes is one the Media library already has. `ensureImageAssetVariant` produces a
rendition on first request, stores it beside the Asset under `<key>.__variants/<n>`, and leaves the
original untouched as the thing every later derivation reads. A `unicode-range` cut is the same shape
with a different producer, and the same version counter throws every cut away when the rule changes.

The pattern is what gets reused, not the table: cuts go in a `font_asset_subsets` table of their own,
with a `subset_key` vocabulary in `@phis/contracts/media` and a delivery route beside the variant one.
`image_asset_variants` states in its own contract that renditions are images and that other kinds must
not create rows in it, its `width` and `height` are `NOT NULL` for a reason `next/image` depends on, and
its `variant_key` is a closed vocabulary where `0` is a thumbnail -- sharing it would make a number mean
one thing or another depending on a column in a different table. phis-server's `TODOS.md` carries the
column list and the rest of that decision.

Built that way. `lib/font-subsets.ts` in phis-server cuts with the raw `harfbuzz-subset.wasm` from
`harfbuzzjs` -- no Emscripten glue, no imports -- after unpacking woff through its own table walk and
woff2 through `wawoff2`, and packs every cut as woff2. Which cuts exist is read at upload, not at
request: `meta.font.coverage` lists the named ranges the font maps at least one codepoint in, plus the
font's own codepoints outside all of them as a `rest` cut (key `15`), so a font with glyphs no Google
range names does not lose them. `buildPhiFontSubsetFaces` writes one `@font-face` per listed cut against
`/api/site/media/[id]/subsets/[key]`; a font without `coverage` -- everything uploaded before the reader
learned it -- still gets the single face over the whole file. The page's locale picks what is
preloaded: the body slot's `Latin` cut always, and the cut its script needs beside it -- `Cyrillic`
for `ru`, `LatinExt` for `pl` or `sr-Latn` (`resolvePhiFontPreloadSubsetKeys`).

The tools are all permissive, which matters because the core is Apache-2.0 so that Add-ons may stay
closed: HarfBuzz is under the Old MIT license and reachable from Node as `harfbuzzjs` (MIT) or
`subset-font` (BSD-3-Clause), woff2 packing as `wawoff2` (MIT), and the metrics through `fontkit` or
`@capsizecss/unpack` (both MIT). fontTools is MIT as well but is Python, which would put a second
runtime in the server for something WASM does in-process. Subsetting modifies the file, and while most
webfont licenses permit that, a few commercial ones do not -- worth saying once where an operator
uploads.

Decided: a font is a block kind of its own (above), a Site overrides a block's family per slot the way
it overrides a palette's colour, and adoption copies only the families the saved draft names. Open, and
for the operator to decide: whether the Builder's font slots offer the catalogue's families as a list
rather than free text -- a name outside the catalogue reaches the browser bare and fails without a
sound, which argues for the list.

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
