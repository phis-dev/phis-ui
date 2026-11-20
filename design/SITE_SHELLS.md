# A Site's own Public and App shell

Status: approved by the operator on 2026-11-20, being built. The parts that are built move into MODULES.md, CMS.md, SHELL.md, BUILDER.md,
THIRD_PARTY_MODULES.md and phis-server's DB.md.

## Why

A Site package ships its Pages, its navigation entries and its Theme, but not the frame those Pages stand
in. Every Area's shell (its Header, Siders and Footer, with their Regions, Layouts and Widgets) comes from
the Area's base Module, and an optional Module "never replaces the locked `areaShells` descriptor"
(MODULES.md, `descriptor-compiler.ts` refuses it). What a Site wants its frame to look like therefore
lives only in a stored Area override. dev.phisys.com's floating Header bar, its footer card, its basket and
its search, and phis.dev's floating Header are examples.

A second fault makes this worse: the Area's Module selection lives in the same stored tree as the
structure.

- Saving only the Modules of an Area that has no revision yet sends the code-owned shell along as
  `baseline`.
- The first Modules publish then publishes that shell as the Site's override (`mergePhiAreaTreeForPublish`
  returns the draft whole when nothing is published).
- From then on the structure is frozen: a newer preset never rewrites a stored snapshot.
- Clearing the override to get the preset back also clears the Module selection. That deactivates
  every Module the Site chose, its own package included, and with it every Page that package ships.

## What changes

### 1. A Module may bring the Public or the App shell

- A Module eligible for `public` or `app` may declare, for each of those Areas, one `areaShells`
  descriptor of its own. For every other Area (`admin`, `builder`, `editor`, `accounting`) the base-only
  rule stays: a Site package does not change how the working Areas are built.
- Whether an Area takes a shell from a Module is a statement of its Area definition
  (`PhiCmsAreaDefinition.shellProviders: "base" | "module"`), not a list in the compiler. Public and App
  say `"module"`, every other Area `"base"`. Opening another Area later is that one statement plus what
  the Area needs kept: a working Area's shell carries the anchors Modules hang their sidebar entries on,
  the Tour button and the page title, and a shell without them would break Modules silently. The Builder
  stays `"base"` for good: a package that broke its shell would lock the Site out of the tool that repairs
  it.
- The descriptor is the one that exists today (`PhiCmsAreaShellPresetDescriptor`): an identity
  `(ownerModuleId, presetKey)`, a `shellPresetVersion`, and `loadTree`, which returns the whole tree the
  way a Builder save writes it. That tree holds Regions (with or without Siders), Layouts with their config
  and Surface, Widgets, Overlays and controller settings. It may compose the base shell through the
  existing `composition` (`omitRegionTypes`, `omitNodeKeys` within the base's `exportedNodeKeys`), or
  build everything itself with `createPhiCmsPresetNodes`.
- **It takes effect when the Module is activated in that Area, never by being installed.** This works the
  way a Module's `/contact` replaces the base Page: the delivered Site keeps phis-ui's shell, and
  activating the Site package lays its shell over it. Deactivating gives phis-ui's shell back.
- **One provider per Area.** Activating a second Module that brings a shell for an Area where one is
  already active is refused, naming the Module that holds it, as `package-path-taken` is today.
- The effective shell of an Area is the active provider's shell if there is one, otherwise the base
  shell. Everything that today asks for "the Area's shell" asks for the effective one:
  - `resolvePhiCmsAreaShellPresetBinding` and `areaShellByArea` become "base shell" plus "providers by
    Area";
  - the request and root paths (`cms-request.ts`, `cms-root.ts`) resolve the effective binding after
    the Module selection is known;
  - the Builder's shell workspace (`area-shell-presets.server.ts`) does the same.
- `areaOverlays` from active Modules are laid over the effective shell as they are now.
- A stored structure override is keyed by its `sourcePreset` identity, as today, and the server returns
  it only when it matches the requested one. A Site that stored a base structure and then activates a
  provider therefore sees the provider's shell, and its own stored structure again after deactivating.
  The stored structure is kept, not lost. Editing the provider's shell in the Builder stores a structure
  under the provider's identity.

### 2. The Module selection is stored apart from the structure

The selection must be readable before the shell is known, because the shell now depends on it. Today it
is read out of the tree fetched by the shell's identity. That loop is broken by giving the selection its
own revisions.

- **phis-server.**
  - `phis.site_area_scopes` gets `published_modules_revision_id INT NULL` beside `published_revision_id`.
    The Modules draft pointer (`working_module_draft_revision_id`) exists already.
  - A Modules revision is an ordinary `site_area_revisions` row flagged `PhiCmsAreaRevisionFlags.Modules`.
    Its `tree_json` is `{ area, preset: { config: { modules } } }`: no `sourcePreset`, no Regions, no
    nodes.
  - A structure revision no longer carries `config.modules`: the write refuses it there, as the Modules
    write refuses `config.shell` today.
- **Writes.**
  - `POST /api/site/cms/area/modules` takes `{ area, draft?, config: { modules } }`. `sourcePreset` and
    `baseline` go, and so does the 409 `SiteCmsAreaBaselineRequiredError`.
  - `POST /api/site/cms/area/modules/publish` moves `published_modules_revision_id` and nothing else.
  - The structure publish moves `published_revision_id` and no longer merges a selection in.
  - `mergePhiAreaTreeForPublish` goes.
- **Reads.** The live Area read returns the selection (published or, for a review, the draft) independently
  of the identity, and the structure only when the identity matches. phis-ui reads the selection first,
  derives the active Modules (`resolveActivePresetModuleKeys`) and the effective shell, and only then
  takes the stored structure or the preset.
- **The materializers** (`materializeSiteMediaAvailabilityWithDb`, `materializeSiteThreadKindsWithDb`,
  `materializeSiteModuleSeedsWithDb`) and `listPhiSiteActiveModuleIdsWithDb` read the published Modules
  revision instead of `published_revision_id`.
- **Clearing a structure** (`DELETE /api/site/cms/area/override`) removes the structure revisions and
  both structure pointers only; the selection stays. It then runs the three materializers, which it does
  not do today. The Builder's "Clear Area" says that it keeps the Modules. A Module selection still has no
  reset: it is changed and published.

### 3. Builder

- The Modules table refuses a second shell provider in Public or App, with the holder named.
- Activating a provider while the Area has a stored structure under the base identity says so: "This
  Module brings its own Header and Footer. The saved structure stays and comes back when the Module is
  switched off."
- The shell workspace shows the effective shell and names its owner.

### 4. Existing installations (no fallback before v1)

There is no reader for the old shape. Each installation is swept once by hand, as other changes before v1:

- add the column (ALTER by hand; the release carries the CREATE);
- for each scope, write a Modules revision from `published_revision_id`'s `config.modules`, point
  `published_modules_revision_id` at it, and remove `config.modules` from the structure trees;
- a structure override that only exists because a Modules save froze the baseline may then be deleted.
  That is how dev.phisys.com gets back to "what the package delivers" without losing its Modules.

## What does not change

- The working Areas keep their base shells, and a Site package does not touch them.
- Pages keep their own Regions (`content`, `hero`, `header_bottom`, `sider_right`, `footer_top`,
  `drawer`). `header_top`, `header_main`, `footer_main` and `footer_bottom` stay the Area's. The Area's
  shell is now simply allowed to come from the active Site package.
- `sourcePresetVersion` and the "Preset update available" tag work as today, per provider.
- Theme, navigation injections and route presets are untouched.

## Later: an Intra Area

Not part of this work; noted so that nothing here closes it off. A Site may want an environment for its
staff that is independent of the customer-facing Areas: Public and App offer themselves to customers, an
Intra Area only to staff, who sign in and switch into it as they do into Admin. It would be an Area of its
own with an access policy for staff and, like Public and App, `shellProviders: "module"`, so that a
company's package brings its intranet's frame. Its visibility bit is reserved now: `1 << 9` in
`PhiCmsVisibilityContext` (phis-contracts), next to `BuilderArea: 1 << 8`; the gaps below it are not
reused. Network reach (only from inside the company) stays the business of nginx or the firewall, not of
the Area.

## Contracts this changes (for approval)

- MODULES.md "an optional Module never replaces the locked `areaShells` descriptor" (and CMS.md, the one
  shell rule): for Public and App, an active Module may bring the shell.
- The `areaShells` compiler check (`descriptor-compiler.ts`): it accepts a non-base descriptor for
  `public`/`app` and registers providers apart from the base.
- phis-server API: `POST /api/site/cms/area/modules` drops `sourcePreset` and `baseline`; the live Area
  read gains the selection beside the structure.
- DB.md: `site_area_scopes.published_modules_revision_id`; the `Modules` flag on `site_area_revisions`;
  `config.modules` only in Modules revisions.
- BUILDER.md: "Clear Area" keeps the Module selection.

## Order

1. phis-server: column, flag, writes, reads, materializers, override delete; tests (`*.pg.test.ts`).
2. phis-ui: compiler, effective-shell resolution, the selection read first, persistence without
   `baseline`, Builder refusals and notice; tests.
3. Workspace dev install (dev.phis.dev): sweep its DB, give `@phis/dev` a Public shell (phis.dev's floating
   Header), activate it there, look at it, deactivate it, and edit and clear it in the Builder.
4. After that is accepted: `@phis/phisys` ships its Public (and, if wanted, App) shell, then dev.phisys.com
   is swept, its structure overrides are cleared, and it is checked. phis.dev stays as it is until the
   operator says otherwise.
5. Release: contracts if touched, then phis-server, then phis-ui; packages afterwards.
