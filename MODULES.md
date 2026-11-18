# Runtime Module Contract

This document defines the structure of Runtime Modules in `@phis/ui`.
First-party Phi Modules must follow it. Third-party packages may choose different source filenames, but
their exported contribution graph must be structurally equivalent.

## Purpose and identity

A Runtime Module is the one Site/client installation, ownership, activation, and lazy-loading boundary
for a coherent feature. It is identified by one stable namespaced `moduleId`, belongs to declared Areas,
binds to Core or exactly one server Add-on, and owns every artifact it contributes.

A Module id is `<npm-package>/modules/<module>` (`createPhiRuntimeModuleId`, `isPhiRuntimeModuleId` in
`constants/module-identity.ts`). Everything the Module owns is named
`<npm-package>/modules/<module>/<namespace>/<leaf>` (`createPhiModuleIdentifier`). The leaf never
repeats the Module's name. The grammar is described for third parties in
[THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md#terminology-and-hard-boundaries).

A Module may own at most one Controller type. A controllerless Module is valid only when its Widgets,
Forms, Providers, presets, adapters, or other declared artifacts are independently meaningful; no-op
Controllers are forbidden.

Generic cross-domain infrastructure belongs in the Foundation (see below), domain behavior in its
Module. A direct server counterpart is the Add-on half of the same package, reached through its
`addon/` entrypoints.

Terminology across the Site/server boundary is strict:

- a **Module** is a Site/client extension compiled into a Site application;
- an **Add-on** is a server extension installed into `phis` (`@phis/server`);
- **Core** is the built-in `phis` capability provider.

## First-party Modules

`@phis/ui` ships these Modules, one folder each under `plugins/runtime-modules/<module>/`:

| Module id | Kind | Eligible Areas | Owns |
| --- | --- | --- | --- |
| `@phis/ui/modules/core` | platform, required | all | runtime infrastructure, Core Widgets and Layouts, generic Form primitives, the Core Runtime Controller |
| `@phis/ui/modules/public` | Area base | `public` | Public shell, navigation surfaces, root routes, public Form handlers |
| `@phis/ui/modules/app` | Area base | `app` | App shell, navigation surfaces, authenticated application routes |
| `@phis/ui/modules/admin` | Area base | `admin` | Admin shell, navigation surface, root route, Admin settings |
| `@phis/ui/modules/editor` | Area base | `editor` | Editor shell, content editor Widgets and workflows |
| `@phis/ui/modules/accounting` | Area base | `accounting` | Accounting shell, navigation surface, workspace route |
| `@phis/ui/modules/builder` | Area base | `builder` | Builder shell, workspaces, Canvas, drafts, Inspector, wiring |
| `@phis/ui/modules/asset` | always active | all | Media, upload, asset picking, asset data |
| `@phis/ui/modules/auth` | optional | `public`, `admin`, `app` | Site login and authentication workflows ([AUTHENTICATION.md](./AUTHENTICATION.md)) |
| `@phis/ui/modules/blog` | optional | `public`, `editor` | the face of Core's `blog` content kind: its three Pages (read in Public, written in the Editor) and two Forms; the list and detail Widgets are Core's ([CONTENT_ENTRIES.md](./CONTENT_ENTRIES.md)) |
| `@phis/ui/modules/avatar` | optional | `app` | a personal picture in the person's own Media Space |
| `@phis/ui/modules/dashboard` | optional | `app`, `accounting`, `admin`, `builder`, `editor` | Area Dashboard routes |
| `@phis/ui/modules/form-builder` | optional | `builder` | Form-definition authoring lifecycle |
| `@phis/ui/modules/groups` | optional | `admin`, `app` | Site groups and their Media Spaces |
| `@phis/ui/modules/localization` | optional | `admin`, `editor` | locale and translation administration |
| `@phis/ui/modules/news` | optional | `public`, `editor` | the face of Core's `news` content kind, as the blog Module is of `blog` ([CONTENT_ENTRIES.md](./CONTENT_ENTRIES.md)) |
| `@phis/ui/modules/observability` | optional | `admin` | Site-runtime log administration |
| `@phis/ui/modules/revisions` | optional | `builder` | revision history, restore, deletion |
| `@phis/ui/modules/search` | optional | `public`, `app` | the Site's own search: the Search Box and Search Results Widgets and the results Pages, and the Areas the indexer writes; on in both as shipped ([SEARCH.md](./SEARCH.md)) |
| `@phis/ui/modules/theme` | optional | `builder` | Theme and brand editing ([THEME.md](./THEME.md)) |
| `@phis/ui/modules/threads` | optional | `app` | conversations a person is in, and the one composer every Module writing into one reuses |
| `@phis/ui/modules/tour` | optional | all | the Controller that runs the guided Tours other Modules attach to their route presets, and each person's Tour progress; switched off, Tours are off for every Module alike |
| `@phis/ui/modules/user-management` | optional | `admin` | users, roles, invites |
| `@phis/ui/modules/video` | optional | `public`, `app` | the video providers a Site may embed from, and the Widget that asks before it fetches one ([design/CONSENT.md](./design/CONSENT.md)) |

The source of this table is each Module's `ids.ts` and `definition.ts`; the Area base Modules come from
`plugins/runtime-modules/area-definitions.ts`.

## Module, Core module, Foundation

Three things, and the contract keeps them apart because they answer different questions:

| | what it is | how you recognise it |
|---|---|---|
| **Module** | a runtime unit with an id; it is loaded, and an Area can leave it out | has `ids.ts`, `definition.ts`, `module.ts`, `server.ts` |
| **Core module** | the one Module every Site carries and nobody can deselect | the same files, plus: not selectable |
| **Foundation** | not a runtime unit — types, constants, catalogs, addresses, Controls, helpers | has no id and registers nothing |

`core` is a Module, not the Foundation. It is unselectable and it ships the Widgets every page needs,
but it is loaded like any other Module and it is bound by the same rules. The Foundation is what
Modules are built *on*: `types/`, `constants/`, `helpers/`, `gateway/`, `theme/`, `net/`,
`server-helpers/`, and the shared families under `components/` — `controls`, `forms`, `layouts`,
`regions`, `root`, `runtime`, `widgets` and the rest.

`base` is deliberately not used for the Foundation: an *Area base Module* is already something else —
the unselectable Module of one Area (`public`, `app`, `admin`, `editor`, `accounting`, `builder`).

### The dependency rule

```text
Module      →  Foundation        allowed, and the reason the Foundation exists
Module      →  other Module      forbidden
Foundation  →  Module            forbidden, in every direction and for every kind of reference
Builder     →  other Module      only its `ids`, never its internals
```

The Builder is the single exception, and a narrow one: it edits the other Modules, so it must know
their identity. It must not reach into their stores, their Controller addresses, or their presets.

`scripts/validate-module-dependency-direction.ts` (part of `runtime-modules:check`) holds the rule for
imports: every reference counts, type-only and `import()` included, tests too. The module system beside
the Module folders and the package's own doors in `package.json#exports` assemble the Modules and may
name them; a Module named by its id as data is not a reference.

The module system is two things, and the Foundation may use only one. Its catalogs and manifests
(`catalog.ts`, `area-catalogs/`, `area-contributions/`, `client-manifests/` and the like) gather the
Modules. Its contracts, descriptor compiler, settings and Area definitions are infrastructure the
Foundation builds on, and they stay that only while nothing in them leads to a Module -- which is why
`area-definitions.ts`, `area-module-defaults.ts` and `contracts.ts` name the Modules they mention by id
(`createPhiRuntimeModuleId`) rather than importing their `ids.ts`. The validator measures which is
which: a module-system file that leads to a Module is a catalog, and the Foundation may not import it.

A Module may not import a catalog either, unless it leads back to that Module alone. An Area catalog,
the first-party catalog, or one shared list holding several Modules' presets reaches every Module in it,
which is `Module → other Module` taken one step round. Each base Module therefore states its own shell
and Pages in its own `presets.ts`, and a Dashboard card that needs the Area shells reads the catalog it
is handed (`PhiDashboardCardContext.runtimeModuleCatalog`) instead of importing one. A Module's tests
are the Module's code and held to the same line; a test that needs an Area assembled is a Foundation
test and stands beside the module system (`plugins/runtime-modules/*.test.ts`). The package never
imports itself by name (`@phis/ui/...`) -- that edge would pass the rule unseen -- except for the
stylesheet a Site generates and answers for under that name.

The package's doors (`package.json#exports`) are held the same way, because they point at sources and a
Module package compiles whatever a door reaches -- `import type` included. A door reaches a Module or a
catalog only if it exists to assemble them (the Next app's routes and Areas, the Area catalogs and
client manifests, and the few listed in the validator); every other door is module-free. A door reaches
a stylesheet only if a Next app opens it. Controls name their classes and the rules live in `styles/`,
loaded by the root layout, so nothing a Module imports carries a CSS import. A Module styles its own
elements inline from the Theme tokens (`usePhiConfig().token`); a stylesheet of its own would be its own
package's concern, declarations included. A data door does not reach Node either: a shape a Control or a contract needs lives in
`types/`, not beside the server code that fills it, because a type-only import still compiles the file
it names. Client code that reads the build mode declares `process` as far as it reads it, so Next can
inline the value and drop the diagnostics behind it from production.

The rule has a practical edge that is easy to miss. A Foundation file that names a Module's Controller
address has the dependency backwards even though nothing was imported *from* a Module folder — the
address is Module knowledge wherever the file sits. `components/widgets/signals/page-title-signals.ts`
carried exactly that until the Builder's own emitter moved into `builder/`.

Controls follow the same shape one level down: a Module may use the shared Controls in
`components/controls`, and it may ship Controls of its own — but its own Controls are not shareable
with another Module. What is shareable is the Foundation, and only the Foundation.

## One standard contribution shape

Every Module is described through the same logical sections:

```text
Runtime Module
├── identity and contracts
├── definition and server binding
├── optional Controller
├── Widgets and Layouts
├── data and Options Providers
├── Forms and Form Providers
├── route, path, navigation, shell, and Theme contributions
├── signal capabilities and preset wiring
├── Server-safe catalog contribution
├── live Client contribution
└── Authoring Client contribution
```

A section may be empty when the feature does not need it. It must not be replaced with a custom
registry, Area switch, route-local loader, Skeleton import, global side effect, or domain-specific host.

The Contracts, Server, live Client, Controls, and Authoring entrypoints stay physically separate. Shared
serializable contracts may be imported by all of them; executable Client implementations must not leak
into Server manifests, and Authoring implementations must not leak into live Area graphs.

## Required first-party physical layout

Every first-party Module lives in exactly one folder and contributes nothing from anywhere else:

```text
plugins/runtime-modules/<module>/
├── ids.ts                    module id and every identifier the module owns
├── definition.ts             the module definition; server-safe, no React
├── module.ts                 definition plus Controller definition
├── presets.ts                routes, Area shells, Area overlays, navigation
├── trees/                    the preset trees those descriptors load: Pages, shells, overlays
│
├── server.ts                 Server Area contribution        ─┐ the bundle boundary:
├── client.ts                 Controller Client contribution  ─┤ "use client" separates
├── client-data-providers.ts  data provider Clients           ─┤ these graphs
├── authoring.tsx             Authoring Client                ─┘ (or authoring-client.tsx)
│
├── widgets.ts                Widget register (server-safe)
├── authoring-widgets.ts      Authoring Widget register
├── layouts.ts                Layout register
├── data-providers.ts         provider descriptors
├── forms.ts                  Forms and their field/validation/handler providers
├── labels.ts                 the module's label sets
├── addresses.ts              stable node addresses of its Pages
│
├── controller/
│   ├── address.ts            plugin key, Controller key, address factory
│   ├── definition.ts         signals and mount policy; server-safe
│   ├── client.tsx            the Controller plugin
│   ├── state.ts              Controller store, when it has one
│   └── mount.tsx             mount wrapper, when it has one
│
└── services/
    ├── table.tsx             table provider implementation
    └── options.ts            options provider implementation
```

A file exists only when the Module has that contribution: a Module without Widgets has no `widgets.ts`,
a controllerless Module no `controller/`. Four are mandatory and checked by
`validate-runtime-module-manifests`: `ids.ts`, `definition.ts`, `module.ts`, `server.ts` — plus
`client.ts` as soon as the Module owns a Controller, and `authoring-widgets.ts` as soon as it owns
Widgets.

`authoring.tsx` exports the Module's Authoring Client, and the Area's `client-authoring-providers/`
aggregator wraps it into a contribution. `authoring-client.tsx` (for example in `dashboard/` and
`revisions/`) exports the Authoring Client together with its own contribution; a Module has one of the
two.

**Why the Client files are split three ways.** `client.ts` carries the Controller Client and must not
reach Authoring code; `authoring.tsx` carries the Authoring Client and must not reach Controller code;
`client-data-providers.ts` sits beside them because an authorable provider needs an authoring loader,
which `client.ts` may not have. Both rules are enforced, and they are not style: `"use client"` splits
the module graphs, and a live Area bundle that reaches Authoring code ships the Builder to every
visitor.

**What an Area file may see.** Area aggregators
(`area-contributions/`, `client-area-contributions/`, `client-authoring-providers/`) import a Module's
projections and nothing else. Importing its `definition`, `widgets`, or `presets` directly is rejected:
the Area says which Modules it carries, the Module says what it carries in.

**When a Module reaches several Areas**, `server.ts` exports a factory rather than a constant, because
its routes are filtered per Area:

```ts
export function createPhi<Name>RuntimeModuleServerAreaContribution(area?: PhiCmsAreaKey) { … }
```

Omitting `area` contributes everything the Module owns — the Builder case, since the Builder edits the
other Areas instead of being one.

Each Widget lives in its owning Module as `widgets/<widget>/` with `config`, `client`, `server`, `plugin`,
and `authoring` files as it needs them. A Widget whose Client has a façade in front of its implementation
keeps both: `index.tsx` re-exports, `client.tsx` implements.

Third-party packages use the equivalent public export layout documented in `THIRD_PARTY_MODULES.md`.
Their internal filenames are not ABI, but the same physical Server/live/Controls/Authoring separation is.

## Building a new first-party Module, step by step

These steps are for a Module inside `@phis/ui`: they name this repository's files
(`constants/runtime-module-ownership.ts`, `area-contributions/<area>.ts`) and its relative imports. A
Module package outside it has neither -- it declares its Areas in its `package.json`, reaches this package
only through the public doors, and is wired into a Site by `phis module add` -- and follows
[THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md) instead.

1. **Pick the module key and write `ids.ts`.** Name the Module for what it does. `core` means a
   package's unselectable base Module; a new Module gets a real name. Every identifier it owns is built
   from the module id, never spelled out:

   ```ts
   export const PHI_<NAME>_RUNTIME_MODULE_ID =
     `${PHI_SHARED_PACKAGE_NAME}/modules/<module>` as const satisfies PhiRuntimeModuleId;
   ```

   Identifiers below it follow `<package>/modules/<module>/<namespace>/<leaf>`, and the leaf never
   repeats the module's name. Register each one in `constants/runtime-module-ownership.ts`; the catalog
   refuses two Modules claiming one key, which is what makes the ownership derived rather than guessed.

2. **Write `definition.ts`.** Module id, `kind`, `eligibleAreas`, `serverBinding`, `accessPolicy`,
   title, description, category, icon family, and `controllerMountPolicy`. Server-safe: no React, no
   `"use client"`, no imports that pull either in. Everything the catalog validates reads from here.

3. **Add a Controller only if the Module needs runtime coordination.** Then `controller/address.ts`
   (plugin key and address factory), `controller/definition.ts` (its signals — server-safe), and
   `controller/client.tsx`. Controller fields and the `Controller` Client are complete as one group or absent
   as one group; a no-op Controller is worse than none. App, Accounting, Public, Admin, Editor and
   Dashboard carry none since theirs answered nothing and rendered nothing on every page of their Areas;
   the Form Builder's is the one still standing, kept for the Form Builder it waits on. Everything the
   Controller runs lives in `controller/`, however large: `validate-controller-receiver-contracts.ts`
   reads that directory, and the Builder's Controller kept outside it addressed its Inspector by preset
   id long after the rule held everywhere else. Whom it sends to comes from `config.signalRoutes`, which
   the trees holding the receivers write ([SIGNALS.md](./SIGNALS.md#addresses)).

4. **Write `module.ts`** — the definition plus the Controller definition, nothing else.

5. **Declare what the Module contributes.** `presets.ts` for routes, Area shells and navigation;
   `widgets.ts` and `authoring-widgets.ts` for Widgets; `layouts.ts` for Layouts; `data-providers.ts`
   for providers; `forms.ts` for Forms. Each register is server-safe metadata with lazy imports, never
   Client components.

6. **Write the projections.** `server.ts` (constant for one Area, factory for several), `client.ts`,
   `client-data-providers.ts` when there are providers, `authoring.tsx` when there is authoring.

7. **Wire the Module into its Areas.** One line per Area in `area-contributions/<area>.ts`, plus the
   matching Client and Authoring contributions. The Server and Controller Client contributions must
   name the same Modules per Area — the verifier compares them.

8. **Check every Public Widget against the static render.** In production a Public page is rendered
   once for every anonymous visitor ([STATIC_RENDERING.md](./STATIC_RENDERING.md)): a Widget's server
   half must not read cookies, headers or the viewer or render a per-visitor value, and the Module's own
   data may be up to 60 seconds old there. `next dev` hides both; check in a production build, signed out.

9. **Run `pnpm runtime-modules:check` and `pnpm typecheck`.** `runtime-modules:check` runs every
   contract verifier listed in `package.json` (the `scripts/validate-*` files); they catch what
   typecheck cannot — route grammar, ownership collisions, Area synchronisation, projection boundaries,
   provider/loader pairing, signal wiring and correlation.

## Identity and ownership rules

- `moduleId` is explicit and never derived from a Controller type.
- Controller type, Widget type, Layout type, Form id, Provider key, JSON value schema, preset identity,
  navigation item key, and path-injection key are independently stable namespaced identities.
- Every Controller, Widget, Layout, Form, Provider, adapter, preset, and authoring adapter has exactly one
  `ownerModuleId`.
- Area eligibility and server capability requirements are immutable definition metadata.
- Module activation never follows a Controller address, route request, Widget occurrence, Provider
  demand, or import side effect.
- A reusable generic artifact belongs to Core or a separate Module; it must not have several owners.

## Activation

Installation is build-time; activation is per Site and Area.

- The `core` Module is the catalog's single `kind: "platform"` entry. It is always active and never
  selected or persisted.
- Every Area has exactly one locked base Module and one versioned shell preset
  (`plugins/runtime-modules/area-definitions.ts`). The base Module is always active in its Area, is shown
  locked in the Module selector, and is never persisted.
- A Module declared `activation: "always"` is active in every Area it is eligible for. Nobody selects or
  deselects it, the Module selector shows it locked like a base Module, and it is never persisted. It is
  for what the platform cannot work without: the Asset Module is the one there is, because every image
  picker in every Area opens its library. Only a Module of this package may declare it -- installing a
  package never switches anything on -- and the catalog refuses it together with `mediaSpaces`,
  `threadKinds`, `seed`, `userState` and `authUiProvider`, which are derived from the stored selection
  (by the Builder on save, and by phi-server for `userState`) and would be dropped for a Module that is
  never in it.
- Optional Modules are persisted per Area as `runtimeModules`: a unique array of Module ids, selection
  only. Controller types, instance keys, addresses, and config do not belong in it. A duplicate id or a
  selected locked Module is an error (`plugins/runtime-modules/settings.ts`, `resolver.ts`). Locked is
  one question with one reader, `isPhiRuntimeModuleSelectable`: the Platform Module, an Area's base
  Module, and an always-active Module. Wherever an Area's active set is built, the always-active ones are
  added with `listPhiAlwaysActiveRuntimeModuleIds`.
- `eligibleAreas` on the definition is the only statement of where a Module may be selected. A Module never
  enables itself, and installing a package never selects it. An installed package states it in its
  `package.json#phis` instead, and the generated projection completes the definition with it
  ([THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md#9-install-without-patching-the-skeleton)).
- A selected Module activates only when its server binding is available (see
  [Add-on boundary](#add-on-boundary)). An unavailable Module is left out of route, Controller, Widget,
  Layout, and Provider resolution while its selection stays persisted, and produces a scoped diagnostic.
  An always-active Module is held to the same rule.
- Controller requirements, Module dependencies, signal routes, Widget occurrences, and Provider demand
  never activate a Module.

Implementation loading needs two gates: the owner Module is active in the Area, and the resolved shell
or Page tree in the current render mode demands the concrete type. The host collects the distinct
demanded types, loads them in parallel, and caches loader promises by Module, type, and mode.

A Controller-bearing Module declares `controllerMountPolicy`:

- `site` -- reserved for the `core` Module; mounted once by the Root Layout;
- `area` -- the `default` instance mounts while the Module is active in the Area;
- `demand` -- instances are materialized only from CMS instances that require them
  (`requiredRuntimeControllers`), with `mountScope` `area` for shell-owned and `page` for Page-owned
  instances. The Form controller works this way, and so does the Asset Controller: its Module is active
  in every Area, and a Page that draws no Media mounts nothing for it. A Widget that draws the
  Controller's state (the upload area, the Asset inspector, the focal rectangle) asks for it
  (`components/media/asset-controller-requirement.ts`); a placed picker or Collection asks only where its
  routes name the Controller, so a Gallery that only lists the library mounts none. The Media Page states
  the Controller in its tree as well, with the routes it answers into, and the two are one instance. A
  media picker opened from authoring chrome -- the canvas' image tool and mask picker, the Inspector's
  image fields and Backgrounds, the Theme's Logo and Background, a Form's `media-asset` field -- keeps
  its own search, folder and page and sends the Controller nothing, so none of their hosts asks. They
  stand in two scopes, the Inspector's Area Overlay and the Page beside it, and every one of them asking
  would mount two Controllers behind one address. `scripts/validate-controller-mount-contracts.ts`
  refuses a file outside the Asset Module that addresses the Controller in code without a Widget that
  asks for it.

Additional instances never reload the Module. The generic runtime controller host is the only mount path;
Widgets, Layouts, and Controllers never mount a Controller themselves. A Controller definition may declare
an optional server-only `serverPreload` whose serializable, request-scoped result is handed to its Client;
it never handles browser signals.

**How long an instance lives follows from which host mounts it, and there are two.**
`PhiRuntimeControllerServerHost` appears in `components/cms/phi-cms-root-layout.tsx`, materialized from
the Layout tree with `ownerMountScope: "area"`, and again in `components/cms/phi-cms-root-page.tsx` and
`phi-cms-root-slot-page.tsx` (both through `phi-cms-page-render-scope.tsx`), materialized from the Page
tree with `ownerMountScope: "page"`. Which tree
asks for a Controller is what decides its host, so:

- A Controller reached through the Layout tree is mounted by the Area's Layout segment and **survives a
  client navigation between Pages of that Area.** It is replaced when the Layout segment is, and a change
  of Area is exactly that: the Area's own Layout is its segment, so crossing replaces it whether the
  browser reloads or the router swaps it. (It used to say "a change of Area is a hard navigation anyway".
  That stopped being true when the Area-root forward moved into the proxy -- crossing is now an ordinary
  client navigation. The conclusion is unchanged, and now it rests on the segment rather than on the
  transport.)
- A Controller reached through the Page tree is mounted by the Page and **is replaced with every
  navigation**, including one within its own Area.

This is not a third policy and there is no field for it. A Controller that needs to outlast a navigation
does not get there by being registered in the luckier tree -- that would make correctness depend on a
position nobody chose deliberately -- it keeps what must survive somewhere that survives. Consequently
nothing may be held in a Page-hosted Controller that a Page after it depends on.

### Module selection: one tolerant reader, one strict writer

A stored selection may name a Module this build cannot serve: one that was uninstalled, one the Area is
not eligible for, one that is locked -- which a Module becomes when a release declares it
`activation: "always"`, while the lists written before still name it. Two readers answer that,
deliberately:

- `resolvePhiRuntimeModuleIdsForArea` (`plugins/runtime-modules/settings.ts`) reads past such an entry.
  The Area renders with what it can, the entry is logged (`runtime_modules.selection.unresolved`), and the
  Builder's Modules table shows it as an unresolved row ("Not in this build") until the next save drops
  it. A Site must not stop rendering because a Module was removed from its build.
- `assertPhiRuntimeModuleIdsAllowedForArea` refuses the same cases outright, and every write goes
  through it. What may be read past is never written past.

The same shape holds for a selected Module whose server capability requirement is unavailable
(`resolveActivePresetModuleKeys`): it stays off for the whole Area, and the log names it
(`runtime_modules.server_capability.unavailable`). Neither path is quiet; both were, before 05.10.2026.
The Builder's Modules table shows such a Module as a locked row ("Server part missing") naming the
capabilities it lacks, and refuses to switch it (`server-unavailable`). The Builder Controller reads
it the way the render does, from the snapshot handed to every Controller preload (`serverCapabilities`);
the selection is left as stored and takes effect the day the server provides what is missing.

A Widget that asks for a Controller no active Module owns (`requiredRuntimeControllers`) is a contract
error and throws at materialization: rendered without it, the Widget's signals would go to an address
nobody holds and the page would look fine.

## Render modes and diagnostics

A rendered artifact runs in one of these modes: `runtime` (normal mounted rendering in any Area),
`preview` (non-authoring previews), `authoring` (editor renderers and inline tools in the Canvas), and
`workspace` (Canvas, Inspector, and other Builder infrastructure).

Every placeable Widget and Layout declares `renderPolicies` (`PhiRuntimeModuleRenderPolicies`):

- `runtime` is `custom`;
- `preview` is `custom`, `runtimeReadOnly`, `visualSkeleton`, or `visualPlaceholder`;
- `authoring` is `custom` or `usePreview`.

Nothing falls back implicitly. A workspace Widget renders its real workspace only in `runtime`; its
`preview` and `authoring` policies use a side-effect-free skeleton that mounts no Controller, emits no
signal, mutates no Draft, and renders no nested Canvas.

An unavailable type, inactive owner Module, missing renderer, failed loader, or failed node renderer is a
node-local error: the node renders the shared "not renderable" diagnostic block
(`components/cms/phi-cms-render-diagnostic-client.tsx`) and logs a warning. `missing-module` shows only
the block; other failures also raise one deduplicated notification. Invalid manifests, duplicate
ownership, and invalid Area selections are hard errors before rendering starts.

On the Builder canvas the diagnostic stands inside the node's editor scaffold, not in place of it: a
Widget or Layout that cannot be drawn takes the click itself and offers one tool, delete. A stored tree
can hold a type that no Module owns any more -- a Widget moved to another Module, a Module switched off
-- and a node nobody can select is one nobody can remove. Inspector, wiring, effects and the drag handle
are not offered for it, because each of them reads the definition that is missing; a node whose Module is
only switched off comes back with its stored config when the Module is switched on.

Two further codes say what a hole would otherwise hide. `feature-unavailable`: a node whose `visibleWhen`
reads a feature namespace that could not be resolved this render (no active Module publishes it, or its
resolver threw) renders the diagnostic in a workspace, with the namespace and the reason, instead of
standing as a node that waits; on a live page it stays absent and the resolver's failure is logged
(`cms.features.resolve_failed`). `missing-node`: a Region or Overlay zone whose root layout node is not in
the tree is a stored inconsistency, logged (`cms.render.region_root_missing`) and shown in the zone's place
in a workspace. On a live page the diagnostic renders nothing, by design: a visitor cannot repair a
Module, and the warning is written either way.

A Widget that renders but cannot show what it was placed to show -- the Provider it is bound to is not
offered, the binding does not hold, the record cannot be read, the read itself failed -- follows the same
split through one shared piece (`components/widgets/shared/widget-failure.tsx`). In the Builder the Widget's
place holds an error card (`PhiAlertControl`) with the cause, because the author can rebind it. On a live
page, a revision preview included, the Widget is absent and the rest of the page stands: a heading over an
error, or over an empty frame, reads to a visitor as a broken Site. Either way a `cms.widget.unavailable`
warning is logged, which is where an operator finds it. There are two variants so that the warning is
written once: `PhiWidgetFailureServer` logs during the server render, `PhiWidgetFailure` from an effect,
once per distinct failure while the Widget is mounted. A Module package reaches them through
`@phis/ui/module/records` (the Server variant; that door is Server-only) and
`@phis/ui/runtime/data-provider-client` (the Client variant). What a visitor is meant to read -- a form's
own answer, an empty state, a refusal addressed to them -- is content, not a failure, and does not go
through them.

## Definition and Controller

`definition.ts` is server-safe, serializable, and the single source for:

- module id, kind, canonical source locale, title, description, category, and icon metadata;
- eligible Areas and access policy;
- Core/Add-on binding and required versioned capabilities;
- optional Controller descriptor and mount policy;
- serializable Provider and adapter descriptors.

Server-safe also means it stays there. A Client Widget must not import its Module's definition, not even
for one field: the definition declares the whole Module, so the import carries its Providers, its Forms
and everything those import into the browser bundle. What both halves of the seam read -- the media
kinds a file dialog accepts being the case that keeps coming up -- goes in a module of its own that the
definition reads too. `validate-render-client-boundaries` walks the Client graph and refuses the import.

A Controller is told whom it answers into by the tree that holds the receivers -- `controllerSettings`
with `config.signalRoutes`, the same contract on a Page and on an Area -- and sends declared emit
capabilities down those routes with `dispatchPhiSignalCapability`. It names no Widget, Overlay or Form by
a preset id map or a `cms:` address of its own, whatever its mount policy: an `area` Controller is told by
the Page that holds its receivers while that Page is shown ([SIGNALS.md](./SIGNALS.md#capabilities-and-routes)).
`scripts/validate-controller-receiver-contracts.ts` reads every Module Controller file.

## State in a Controller

A Module keeps state that outlives one render in its Controller, and it has two public tools for it.
Both are Module API, not phis-ui internals.

**A position in a flow is a state machine.** A step counter, a phase string, or a reducer in a Widget is
not an allowed substitute ([design/STATE_MACHINES.md](design/STATE_MACHINES.md)):

- The definition is data, typed against `PhiStateMachineDefinition` from `@phis/ui/types`. It lives in
  the Module's own folder, beside its `ids.ts`, the way Auth's
  [machine.ts](plugins/runtime-modules/auth/machine.ts) does. It is serializable on the same terms as a
  Form descriptor: no callbacks, no element references, no route targets. Guards are
  `PhiRuntimeConditionExpression`, the same language as `visibleWhen`.
- `ownerModuleId` in its `PhiStateMachineReference` is the Module's own id. `machineKey` is
  lower-case with hyphens.
- `authority` is the first decision. Under `server` the definition must name a `reader`, and the
  binding offers no local transition. That is how a third party is kept from rebuilding a security flow
  in the browser. Under `client` the binding moves the machine itself.
- `persistence` says how long a position survives:
  - `none` for most machines;
  - `query` for a link that must resume;
  - `server` for a `server` projection;
  - `profile` for the account-bound store, under `<ownerModuleId>/<machineKey>`, which the Module
    declares as user state (THIRD_PARTY_MODULES.md §11).

  Raising `version` discards every stored position; it is never migrated.
- What others may read is `statements`, never the state keys. A state names the statements true in it,
  so a state added later publishes none of them until its author says so. Foreign Modules may raise
  only the events listed in `acceptsExternalEvents`.
- Check a definition with `collectPhiStateMachineDefinitionErrors`. It returns every fault at once,
  including the determinism rules: at most one unguarded transition per `(from, event)`, and an
  unguarded fallback beside every guarded one. A Module's test should assert the list is empty.

The Controller runs it with `usePhiStateMachineBinding` from `@phis/ui/runtime/controller-client`:

- `send(event, sources)` answers whether the machine moved and what checkpoint to keep. It passes the
  guard sources on every call, never from the last render.
- `project(state, data)` is the only way a `server` projection changes.
- `snapshot` is what to publish. It carries the reference, version, state, every statement as a
  boolean, and optional `data`.

The binding performs nothing: it never dispatches a signal, navigates, calls a gateway, or writes a
checkpoint. The Controller does all of that. The Controller publishes the statements through
`usePhiRuntimeConditionStateResponder`, so Widgets condition on them with `visibleWhen`, as the Auth
Controller does. A Widget never holds a machine, because a transition that made its host act would break
the listen-only rule in [SIGNALS.md](SIGNALS.md).

**Anything else is a scoped store.** `createPhiPluginStateStore(pluginKey, createDefaultState)` from
`@phis/ui/state` holds client state keyed by a scope, such as an instance id or an Area. It gives:

- `useStore` and `useStoreSelector` for rendering;
- `getSnapshot`, `patch`, `replace`, and `reset` from callbacks;
- `deleteScope` when the scope is gone.

It suits a cache, a selection, or a panel's open state. It does not suit a position in a flow: that is
a machine.

The store is private to the Module that created it. A store is not a channel between Modules, the same
way a Module-private signal bus or context is not. Another Module learns what a store holds only through
signals or published statements.

## Module source locale and authored copy

Every Module has exactly one canonical `sourceLocale`. Omission means `en`. Phi-owned Modules author all
canonical package copy in English and may not declare another source locale. A third-party Module may
declare another supported locale once on its Module definition.

That Module locale is inherited by all package-authored user-facing copy owned by the Module, including
Module title and description, Widget and Layout metadata, Forms and validation labels, Provider/Table/
Tree presentation labels, preset copy, navigation injections, dialogs, actions, and tooltips. A child
artifact must not introduce another source locale or silently mix source languages. Module-owned Label
Sets use the shared Runtime-Module Label-Set helper (`definePhiRuntimeModuleLabelSet`) with the Module's
identity -- `PHI_<MODULE>_RUNTIME_MODULE_IDENTITY` in its `ids.ts`, which the owner definition spreads --
so the source locale is stated once and every Label Set inherits it. A Label Set lives in the Module that
owns it, never under `components/`.

Module-authored copy is translated through the global translation domain and shared across Sites. The
server localizes Authoring catalog metadata before serialization; Clients must not invoke translation
for Module definitions. A Site may later own a separate presentation override for a Module display name
or description, but such an override neither mutates nor changes the source locale of package metadata.

Site-authored CMS content continues to use the immutable Site source locale. External Markdown/HTML and
Provider/user content continue to use their explicit content-locale contracts. Stable ids, category keys,
capability names, and error codes are never translated strings.

When present, the Module Controller owns only cross-widget domain orchestration, transient runtime
state, and signal capabilities. It may coordinate Provider-backed Widgets and Forms, but it must not:

- fetch or mutate Table/Collection data on behalf of a Provider;
- duplicate generic Form-controller state;
- mount itself or activate its Module;
- import Widget, Form, Provider, route, or authoring registries;
- expose a Module-private signal bus or context as cross-module ABI.

The Controller definition declares its complete closed `runtimeSignals` metadata. The Client
implementation handles only those capabilities. Presets persist explicit compatible `signalRoutes`;
neither the Controller nor a host infers routes from Widget type, path, or position.

A Controller may answer the shared condition-state request capability with a serializable read-only state
snapshot used by generic Form and Table `disabledWhen` presentation. The requesting Widget declares the
concrete Controller receiver in its persisted route. That route may demand a Page Controller instance
owned by an already active Module; it must not activate a Module or bypass the signal bus. Controller
condition state is never authorization: Add-ons, Form handlers, and Providers independently enforce the
same permission.

## Widgets, Layouts, and Controls

> **Public pages are rendered once for every anonymous visitor.** The server half of a Widget or Layout on
> a Public page runs in a render shared by all of them: `cookies()` and `headers()` are empty there
> without an error, the viewer is anonymous, there is no query, and data that is not published through
> the Builder can be up to 60 seconds old. Per-visitor values and data that must be live are loaded in the
> browser. The full contract is [STATIC_RENDERING.md](./STATIC_RENDERING.md); `next dev` does not render
> statically, so it cannot show a violation.

Module Widgets and Layouts follow the same shared config, render-mode, signal, access, slot-size,
Preview, and Authoring contracts as Core artifacts. Their lightweight definitions are the only Picker
and Inspector metadata source.

A Widget that only works in one kind of Region says so with `requiredRegionOwnership`, and nothing else
in it enforces that. `shell` means the Widget needs a Region that outlives a move between Pages: Area
navigation is the case it exists for, because a Page-owned Region is built again for every Page and the
menu would rebuild itself under the hand that just used it. Almost no Widget declares it, and one that
declares nothing stands anywhere. The declaration is read while authoring -- the insert picker leaves
the Widget out of a Region that cannot hold it -- and never while rendering: a placement is made in the
Builder or written into a preset, so a live Page must not pay for a question that was answered before
it was asked.

A Widget owns no space that it later reads back. What a Widget shows arrives through its declared
contracts -- config, a Provider binding, and its `signalRoutes.listens` -- and never by importing a
Module store and subscribing to it. A Widget that reaches for state is no longer described by its
declaration: the Inspector cannot show the wiring, the write path cannot validate it, and the same
Widget behaves differently depending on which Module happens to be mounted beside it.

Ordering is not a reason to break this. A receiver that has not mounted yet still gets the signal:
an addressed signal whose receiver exists in the page revision is held by the signal bus until that
address is usable, then delivered once. That is what makes a Widget inside a lazily mounted Overlay
safe to drive by signal.

The exception is business logic that genuinely needs shared state -- state several artifacts read and
write over time, such as an editing session or a Builder draft -- not the parameter of a single view.
A selected row, a record id, an open target: those are signals.

Modules use generic Core Widgets whenever the feature is expressible through config, a Provider, a
Form descriptor, and signals. A domain-named wrapper around `PhiTableWidget`, `PhiFormWidget`, generic
Controls, navigation, search, actions, or another Core Widget is forbidden when it only supplies:

- a fixed Provider binding;
- a Form id;
- signal routes;
- translated labels;
- bootstrap data;
- a dialog or action bridge;
- a missing generic capability.

Those values belong in the Module preset, Provider/Form contribution, label set, or approved central
Widget contract. A specialized Widget is valid only for genuinely different domain presentation or
lifecycle that cannot be represented centrally and has been explicitly approved.

`Phi*Control` components remain presentation adapters. Form field providers and Widgets reuse them;
Controls do not own CMS identity, Provider lookup, persistence, routing, or Module activation.

`PhiFormWidget` is the CMS/runtime host and `PhiFormControl` is the controlled presentation/validation
adapter. Form field providers compose only Phi Controls; they must not mount Widgets or Layouts and must
not import Ant Design interactive primitives directly. The same adapter boundary applies to
`PhiTableControl`, `PhiTreeControl`, and every field Control. A Module may contribute namespaced Form field,
validation, options, read, and handler Providers, but not a domain Form Widget alias or a private Ant Design
Form path.

A Control cannot occupy a CMS Layout slot by itself. When a Module-owned authoring surface intentionally
exposes one Control as an independently insertable, removable, reorderable, and signal-addressable node,
the owning Module may provide a Widget counterpart. That Widget is a valid lifecycle boundary only when it:

- owns the ordinary CMS Widget identity and declared signal capabilities for that authored node;
- delegates all primitive presentation to the shared `Phi*Control`;
- adapts controlled values to its Module Controller without copying the Controller's selected entity or
  Draft into persisted Widget config; and
- remains owned and lazy-loaded by the authoring Module instead of being registered as a public Core Widget.

This does not permit a domain alias that merely fixes a Provider, Form id, labels, or routes for an
otherwise complete generic CMS Widget. It covers the distinct case where presentation-only Controls need
normal CMS node identity so a generic Overlay/Layout authoring tree can compose them. First-party Builder
Inspector control Widgets are the reference use case.

## Providers and Forms

Provider descriptors are serializable, owner-scoped, and separated from executable live and Authoring
Clients. Every Provider declares a namespaced key and one standard kind. The selected generic Widget
binds through that descriptor; Core and Builder never branch on Provider identity.

Tables follow the normative [TABLES.md](./TABLES.md) contract. Collections and Options Providers follow
the same ownership and descriptor/implementation separation. Live-only data never leaks into Canvas.
Editable static resources use generic Provider Authoring capabilities rather than a Module-local Builder
screen.

Preset Forms are explicit `forms` entries in the Module's Server Area contribution. Their descriptors
select namespaced field, validation, options, read, and handler providers. The CMS tree places only the
generic Form Widget with a `formId`; a Module must not add a domain Form Widget alias.

A Collection resource names the Render Client that draws its items (`itemRendererKey`) instead of
carrying the component, and that key is owned like any other first-party identifier
(`"renderers/<key>"` in `constants/runtime-module-ownership.ts`). Because the renderer is an ordinary
entry in the Area's Render Client manifest, a Module that does not own the resource may register another
one for the same items under its own key, and a Site names it in the Widget's `itemRendererKey`. That is
the whole mechanism for showing somebody else's objects your way: no fork of the Provider, no import of
the owning Module, and no branch in Core. The key to cite is the Foundation's
(`PHI_MEDIA_LIBRARY_ITEM_RENDERER_KEY`), never the Module's file. A named renderer whose Module is not
active in the Area is reported inside the block.

So that a Site can find one, a Module declares what it offers in `collectionItemRenderers`:
`{ key, rendersItemsOf, title }`, where `key` is the Render Client it registers and `rendersItemsOf` is
the resource `itemRendererKey` it stands in for. The two are equal for the renderer a Provider ships
with its own resource, which declares itself like any other rather than appearing as an unnamed default.
The Builder offers exactly the renderers declared for the bound resource's contract. Nothing validates
`rendersItemsOf` against the Module that owns those items -- it may not be installed -- so the check is
that both keys are namespaced and that a Module does not offer the same renderer twice.

The same shape frees what a Collection *emits*. A generic Widget cannot know what a selection means, so
`collection-view` declares `valueSchemaFrom: "data-source"` and the resource declares
`selectionValueSchema` ([SIGNALS.md](./SIGNALS.md)). Data, drawing, and meaning are all the bound
resource's to state; Core supplies the frame for all three and spells out none of them.

That works because the payload is the Module's own: its renderer drew the item and built the value. Where
Core builds the value itself -- a Table's `tableSelection` is `{ selectedRowIdentities }` -- there is
nothing to rename, and the Module's Controller translates instead. SIGNALS.md,
[Naming a value, and translating one](./SIGNALS.md#naming-a-value-and-translating-one), is where the two
are told apart.

### Record Providers

A `record` Provider serves one thing -- an entry, a product, an event -- and is the one kind read on the
server rather than in the browser (`types/record-provider.ts`). The record a Page is about decides what
the server answers before anything is drawn: the Page's title and description, and a 404 for an address
that names nothing. A Client Provider answers after the page has loaded, which is too late for all three.

- The descriptor sits in `dataProviders` like any other, `kind: "record"`, with the parameters it takes as
  `settingsFields`. The Builder offers it where a field asks for `providerKind: "record"` and edits the
  parameters inside the binding.
- The function is the catalog entry's `recordProviders`, `{ key, load }`, because it reads with server
  credentials and the descriptor travels to the browser. The catalog refuses a descriptor without its
  server half and a server half without its descriptor.
- A Server Widget is bound by a `{ providerKey, params }` in its config and reads it with
  `resolvePhiRecordSource({ registry, runtime, binding })`. The answer is memoised per request by Provider
  and parameters, so every Widget bound to one record costs it one read; `null` from the Provider is "no
  such record", a throw is "unavailable", and a Widget draws the two differently.
- A binding to a record mounts nothing in the browser: the tree scan that mounts Provider Clients skips the
  kind.

#### The fields of a record, and the record a Page is about

A record Provider may declare what its record consists of, and a route with a parameter may name the
record its Page is about (design/RECORD_TEMPLATES.md). The two together are what lets one stored Page
serve every record: its Widgets name a *field of the page record*, never the record's address.

- **Declared fields.** The descriptor's `record` names whose the record is and its fields:
  `record: { audience, fields: [{ key, label, kind }] }`. `audience` is `public` -- the same for
  everybody, so a Public page may be rendered once -- or `viewer`, the signed-in account's own; a route in
  Public cannot name a `viewer` record. The kinds are closed (`PHI_RECORD_FIELD_KINDS`): `text`,
  `markdown`, `picture`, `pictures`, `list`, `tag`, `date`, `number`, `money`, `link`. What each kind's
  value is, is typed in `types/record-provider.ts`; a date is an ISO instant, a number a number and a
  `money` the payment contract's amount (`PhisPaymentMoney`, `{ currency, minor }` with `minor` an integer
  string of minor units in a currency `PHIS_PAYMENT_CURRENCY_EXPONENTS` names). Core formats all three
  in the page's language: a date on the Site's time zone (`formatPhiDate`), money with its currency's own
  places (`formatPhisMoney`). Everything else a domain formats itself -- a tax note, a period said in
  words -- is a `text` the Module hands over finished.
- **The field reader.** The server half gains `loadFields`: a function from the record its resolver
  answered to the declared fields' values. The catalog refuses declared fields without a reader and a
  reader without declared fields. A value that is not of its declared kind is left out and logged
  (`cms.record.field_invalid`); a Widget bound to it draws as it does for a field that is empty.
- **The page record.** A route descriptor with a parameter may carry
  `pageRecord: { providerKey, params, titleField?, descriptionField? }`; `params` maps each parameter the
  Provider takes to the route parameter that fills it (`{ slug: "slug" }`). Core then reads the record
  once per request, before anything is drawn: no record is a 404, the two named `text` fields become the
  Page's title and description, and `runtime.page.record` carries the binding -- the Provider and its
  parameters, plus the route's own `titleField` and `descriptionField` where it names them (a Page
  binding, `PhiPageRecordBinding` in `types/record-provider.ts`; the binding a Table or Form carries stays
  the general `PhiRuntimeDataProviderBinding`). The two names are no part of what is asked of the
  Provider, so they neither change the memoised read nor reach it as parameters. This holds for the
  Module's own tree and for a stored override alike, which is what makes the override a template. A Page
  stored at the exact address of one record still wins, and has no page record.
- **The last item of the Breadcrumb.** The Core Widget `breadcrumb` shows the record's title as the last
  item of its trail, in place of the path segment, when the Page's route names a `titleField`: the Widget
  reads that `text` field of the page record (`runtime.page.record.titleField`) as any Widget bound to a
  field does. The folder items before it, their links, a fixed `pathLabel` and `showPath: false` are as
  they were; so is a Page about no record or whose route names no `titleField`, and a record that cannot
  be read (missing, unavailable, no such field) leaves the segment -- the trail never fails for it. The
  Widget adds no read: it is the memoised read the title came from. The Builder's Preview with a sample
  record shows the sample's title; the Editor canvas, with no record, shows the segment.
- **Reading a field.** A Server Widget reads with `resolvePhiPageRecordFields({ registry, runtime })`
  (`@phis/ui/module/records`): the same memoised read as every other binding to that record, so the Page
  costs its Provider one answer. The answer is `{ status: "ok", fields }` with `fields` a
  `ReadonlyMap<string, PhiRecordField>` keyed by the declared field key, or `none` (the Page is about no
  record), `missing` or `unavailable`. `result.fields.get(key)` is the field -- `{ kind, value }`, the
  kind narrowing the value -- or `undefined` where the record has none; `PhiRecordField`,
  `PhiRecordPicture`, `PhiRecordLink` and `PhiRecordTag` are exported beside it. The same door has what
  Core's own Widgets use to pick a field by kind: `readPhiPageRecordField(result, key, kinds)` answers the
  field where the record has one of that key and one of those kinds, and `resolvePhiWidgetRecordField({ registry,
  runtime, key, kinds })` is the whole step of a bound Widget (`PhiWidgetRecordField`), with the types
  `PhiRecordFieldKind` and `PhiRecordFieldValueByKind`. A Module's Widget reads through these and does
  not write the narrowing again. The parser behind them (`readPhiRecordFieldValue`) is not exported.
- **What a picture's address may be.** A value of kind `picture` or `pictures` is `{ src, alt? }`, and
  `src` is an absolute `http(s)` URL or a Site-relative path starting with one `/`
  (`readAddress`, `helpers/record-fields.ts`). Anything else -- a `data:` URI, a `//host` address, a
  `javascript:` link, a bare file name -- makes that picture no picture: for `picture` the field is
  dropped, and for `pictures` the whole list is, one bad entry included (`cms.record.field_invalid`). A
  `link`'s `href` is read the same way. What reaches such an address is the provider's own answer or a
  Media asset's delivery address (`/api/site/media/{id}/content`, NEXT_INTEGRATION.md); a Module has no static
  file for a Page to point at. A picture its package declares in `phis.media` becomes an ordinary Asset of
  the Site, and a preset names it by the id the resolver answers
  ([THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md#pictures-a-module-ships)); a Theme ground's picture
  is the other file a package carries ([THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md#5-add-a-theme-preset)).
- **Core Widgets that show a field.** A config field of type `record-field` names the kinds a Widget
  draws; the Inspector offers the fields of those kinds that the edited Page's record Provider declares,
  and shows no such row on a Page that is about no record. Simple Text takes a `text`, `number`, `date`
  or `money` (`recordField`, written by `formatPhiRecordFieldText` in the page's locale and the Site's
  time zone), Markdown a `markdown` or `text`, Image a `picture`, a Button's signal value a
  `text` (`valueRecordField`) and its link a `link` (`linkRecordField`: the field's `href`, and its
  `label` where the Button's own is empty, untranslated), and the Gallery `pictures` (`recordField`:
  each picture by its address, with its alt text as the record gave it; the Gallery's `source` stays and
  is what a Page about no record draws). The rule is one for all of them: where the Page has a record,
  the field takes the place of the Widget's own content, and a record without the field leaves nothing
  drawn; where the Page has none -- the template on the Builder's canvas -- the Widget's own content
  stands in. A Button that names both a value and a link field is not drawn when either is missing.
  `list` and `tag` are declared kinds no Core Widget draws yet.
- **Samples.** The server half may offer `loadSamples`: a function from the same context to a few
  `{ label, params }`, where `params` are the Provider's own parameters (`{ slug: "chair" }`), not the
  route's. The catalog allows it only where the descriptor declares `record` fields. The Builder's Preview
  of a template whose route names a `pageRecord` takes the first sample as the Page's record
  (`runtime.page.record`); a Provider with no samples, none now, or a reader that throws
  (`cms.record.samples_failed`) leaves the template previewed with its Widgets' own content. The Editor
  canvas always shows each Widget's own content.

The first is Core's content entry Provider (`PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntry`), which
the header, text and related list of a detail Page are bound to (CONTENT_ENTRIES.md).
The second is Core's media folder pictures Provider
(`PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.folderImages`): the public pictures of one Folder, with its
subfolders unless told otherwise, in the public reference projection. The Gallery Widget starts bound to
it, so a slideshow is a Folder somebody keeps filling rather than a list of named Assets. It is Core's and
not the Asset Module's because showing what is public needs no Media management in the Area, as an
Image Widget does not: the Asset Module is active in every Area, and what it adds there is administering
and uploading Media, which a Gallery does not need. Its Folder setting reads the Asset Module's folder
choices.

Provider Clients own data access and mutations. Forms own record-oriented validation and submit
lifecycles. Controllers coordinate runtime state. Signals connect those surfaces. None may silently take
over another layer's responsibility.

A Form may contain a Table or Tree only through the controlled compound-value field mode defined in
`TABLES.md` and `TREES.md`: a Form field provider renders the corresponding Control, and the complete local
collection is one atomic Form value. Provider-owned rows or nodes stay in an external generic Widget with
its Binding and Provider and are coordinated through declared signals.

## Presets, paths, and navigation

The Module owns its Area-shell, Area-Overlay, route, Theme, navigation, and path-injection descriptors. Each preset has
one stable `(ownerModuleId, presetKey)` identity and version. Route paths and navigation contributions are
compiled centrally from active Module descriptors.

An optional Module contributes Area-owned Overlay subtrees only through its server-safe `areaOverlays`
descriptors. Each descriptor targets one eligible Area and loads only Area-domain Overlay, Layout, and
Widget nodes. Core composes contributions from active Modules into the resolved Area tree after module
selection; an optional Module never replaces the locked `areaShells` descriptor or patches a base preset.

A placement says four things: what it is, where it sits, what it is called, how it is configured.
`createPhiCmsPresetNodes` supplies the rest -- `siteId`, `visibilityMask`, `status`, `flags`,
`contentVersionId`, and a `sortOrder` that follows the slot unless it is given -- because those repeat for
every node of a page and are not decisions a Preset makes. Writing them out on each node buried the
four that matter and gave every node its own chance to carry the wrong page's mask.

Presets are declarative composition, not implementation hosts. They may:

- place generic or Module-owned Widgets and Layouts;
- select Provider/resource bindings and Form ids;
- provide appearance config and translated label references;
- wire declared signal capabilities;
- contribute route/path/navigation metadata through the central descriptor contracts.

They may not fetch data, import Client implementations, create local registries, mount Controllers,
branch on another Module, or encode a missing generic capability in a custom Widget/config string.

**An icon a preset names is already resolved when it names it.** `PhiIcon` also resolves `iconify:*` and
`asset:*`, and both stay available to a Builder choosing an icon for their own Widget -- but a preset is
not a choice. It ships with the Module, to every Site that activates it, and nobody along the way agreed
to what it names. An Iconify icon is fetched from Iconify's API by the visitor's browser, which turns a
default into a third-party request on someone else's page; an `asset:` icon names a file that a fresh
Site does not have. Both are lookups against something that may be elsewhere or absent, and that is the
whole of the objection. A picture the Module's own package declares in `phis.media` is the exception: the
Site imports it, so it is on every Site that installed the package, and the resolver a preset is handed
(`media.asset(key)`) answers its id -- an `asset:` icon built from that answer is allowed, a literal id or
path stays refused ([THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md#pictures-a-module-ships)).

The `antd:*` set is bundled, so it resolves offline, on the first paint, and asks nobody. A mark a Module
ships in its own source -- an inline SVG, a glyph -- is bundled the same way and is as welcome: it is
there whenever the Module is, and a package that brings its own identity is usually bringing the point of
itself. Inline rather than a path the build emits, so the mark arrives in the same paint as what carries
it, and drawn in `currentColor`, so it follows the theme. Where the bundled set is missing a mark a
Module needs, the Module registers its own: `icons` on its definition (`definePhiModuleIcons`), plain
drawings or an `@ant-design/icons-svg` definition, named `module:<moduleId>/<name>`
(`createPhiModuleIconName`). The core registry (`components/shell/phi-antd-icon.tsx`) is not grown for
one Module's sake. A Module icon reaches the browser with the Area's active Modules and resolves only
where its Module is active -- live a name whose Module is not there draws nothing, in the Builder it is
flagged -- so a preset names its own Module's icons, never another package's
([THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md#8d-icons-a-module-brings)).

A Module may publish named facts about its own configuration, which conditions on a page can be written
against. The catalog entry states the namespace and a loader; the loader runs only where a page actually
carries a `feature` condition in that namespace, so a Site whose pages ask nothing pays nothing. What a
resolver returns is a published contract like a signal capability -- `auth.password` keeps its name
however the Module rearranges itself -- and it is settled while rendering, so the node it guards is
either absent from the page or in it, never appearing a moment later. A namespace missing from the
answer means that Module could not be asked, and the nodes it guards stay away.

Sending a visitor somewhere else is a service of the runtime, not something a Widget does for itself. A
Widget that has finished and has a destination emits to the Runtime Controller on `path`/`activate` with
`{ path, replace? }`, and the runtime refuses anything that is not a path on this Site -- an absolute URL
and a protocol-relative `//host` alike. A Module that improvises its own `location.assign` bypasses that
check and is the one place an answer from a server could become an open redirect.

Path collisions, mount injection, module-derived path segments, navigation reordering, and tombstones
follow the central route/navigation contract. A Module never patches Site or Skeleton route source.
Module configuration surfaces follow the Settings container contract in [SETTINGS.md](./SETTINGS.md);
working-surface routes and navigation entries remain ordinary contributions under this contract.
Mutable Site Page paths and typed internal Page/Asset targets follow [REFERENCES.md](./REFERENCES.md).
Module route paths remain descriptor-owned and cannot be changed by a Site Page Meta Form.

### When a Module's page actually appears

A route and its navigation entry are computed per request from the compiled catalog. Neither is
materialized anywhere, so neither has a publish of its own: add a route, change its `path`, change its
`navigation`, and the next request has it.

What *is* stored is which Modules an Area carries. `config.modules.runtimeModules` on the Area preset is
the whole switch. The Builder writes it as a module-change draft and it takes effect when that draft is
published. An Area that has never been asked carries no such config at all, and then the code-owned
default applies (`createPhiDefaultAreaRuntimeModuleIds`) -- which is the shipped selection and says
nothing about what a Site has chosen. `[]` is a different answer again: every optional Module off. A
Module declared `activation: "always"` is in neither: it is active whatever the config says.

So the sequence for a new Module page is: activate the Module for the Area, save, publish the module
change. Nothing about the route or the entry is published separately and nothing is swept.

Three things make the "the Module is on and the sidebar is unchanged" state hard to read, and all three
are deliberate:

- **A navigation entry whose route does not resolve is dropped without a word.** That is `isUnrouted`:
  the item named a route and got nothing back. It is also exactly what an entry left behind by a Module
  that was switched off looks like, and the two cannot be told apart at that point -- which is why the
  surface says nothing rather than guessing which one it is.
- **A stored navigation overlay never hides a new entry.** It starts from the computed items and only
  adds (`customItems`), relabels (`itemOverrides`), reorders (`placement`) or removes ids it names
  explicitly (`tombstones`). If an entry is missing, a published navigation tree is not the reason.
- **A Module route's path is namespaced.** `path: "/conversations"` is served at
  `/phis/ui/conversations`. Requesting the declared path proves nothing about whether the route exists,
  and an Area that answers signed-out requests with 404 rather than a redirect will not tell the
  difference either.

One more behaved the same way without being deliberate: an icon name the registry does not know renders
nothing at all. `PHI_ANTD_ICON_NAMES` in `components/shell/phi-antd-icon.tsx` is the one registry, each
icon loaded as its own chunk where it is drawn, and every place that takes an icon name resolves it by the
same rule (`isPhiIconNameKnown` in `components/shell/phi-icon.tsx`): `PhiIcon`, a string given to
`PhiButtonControl`'s `icon`, a Table action, a Command Toolbar button. A short name (`plus`) is the Ant
Design icon of that name and means the same as `antd:plus`; one name per icon, case counts, and there are
no aliases -- the Button resolver's own list (`add`, `cancel`, `trash`, `settings` drawn as a pen) was
folded into the registry on 14.11.2026, its users renamed. An unknown name is reported once
(`[phi-icon] ... names no icon`), in the Site service's journal where it is rendered on the server and in
the browser console otherwise, and `validate-preset-icon-vocabulary` fails on a preset's `antd:` or short
`icon` name the registry does not know. It found `antd:send` on the News editor and `antd:cluster` on the
Groups cards, and later `antd:audit` on the Accounting overview entry, all blank until then.

### Navigation surfaces

A navigation entry goes into a surface an Area declares (`navigationSurfaces` in
`plugins/runtime-modules/area-definitions.ts`), named by its `navKey`, and a Widget draws the surface.
Which Widget reads which surface is a property of the shipped Area shells, not of the surface:

| Area | `navKey` | Drawn by | Way in for a Module entry |
| --- | --- | --- | --- |
| Public | `public:header` | Header Navigation Widget in the Public shell's header | `after` / `before` `@phis/ui/modules/public/nav/terms`, or `parentItemKey: null` alone |
| Public | `public:footer` | Quick Links Widget ("Quick Links") in the Public shell's `footer_main` | the same, and `after` / `before` `@phis/ui/modules/public/nav/privacy`; the footer stands Privacy, Terms, Contact |
| App | `app:header`, `app:footer` | Header Navigation and Quick Links Widgets in the App shell, the same shell tree as Public | `parentItemKey: null`; nothing is exported |
| App | `app:quicklinks` | no shipped Widget; a Quick Links Widget a Site places with this `navKey` | `parentItemKey: null` |
| App, Accounting, Admin, Editor, Builder | `<area>:sidebar` | the Area shell's sidebar | an anchor: `start`, `main`, `settings`, `end` ([THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md#8a-what-a-module-package-exports), Navigation) |
| every Area | `<area>:account` | the Account Widget's menu | `parentItemKey` `@phis/ui/modules/<area>/nav/account` |

Every surface is computed per request from the descriptors and then read through the Site's stored
navigation overlay, which only adds, relabels, reorders, or removes ids it names (see above). So "the Quick
Links in the footer" are `public:footer`, they come from route presets, and a Module that wants an entry
there adds one to its route's `navigation` -- never a database row. Whether a Site has stored an overlay
for a surface is `site_nav_scopes.published_revision_id`; absent, the descriptors alone answer.

An entry goes to one of four things, never more than one: a route of its Module (`routePresetKey`), an
Area-owned Overlay of its Module (`overlayPresetKey` with `overlayNodeKey`), another Area's root
(`target: { kind: "area", area }`), or -- for an entry a Module injects -- an address outside the Site,
`target: { kind: "external", href, newTab? }`. The external
target is the shape the Builder stores for a Site's own external link, and it resolves to the same thing
(`{ kind: "custom", path: href, external: true, newTab }`), so every surface renders the two alike: a
new tab is `target="_blank"` with `rel="noreferrer noopener"`. `compilePhiCmsDescriptorCatalog` refuses
an entry that combines the external target with a route or an Overlay, and any `href` that is not an
`https:` address with a host -- `http:`, `mailto:`, a relative or protocol-relative path. The entry stays
the Module's: `ownerModuleId` on the item says so, the Builder's navigation table shows it as external
and from that Module, and the Site hides it with a tombstone like any other Module entry. An external
address is never a redirect destination: an Area root or a Settings container forwards past it.

An Area target enters the other Area at its root, which every Area answers through its base Module and
which forwards to wherever this viewer lands -- the Admin's "Builder" entry and the Builder's "Admin" are
the two the Areas declare. It is the root and not a Page there on purpose: whether a Module Page answers
in another Area is that Area's activation, which the request never read, so such a reference does not
resolve (`REFERENCES.md`). It resolves to `{ kind: "area", area, path: "/<area>" }`, which every menu reads
as that Area (`resolvePhiNavHref`). An entry that states no `accessPolicy` takes the target Area's, so
nobody is offered a door that turns them away. The compiler refuses the entry's own Area, an unknown one,
and a route or an Overlay beside it; it is never a redirect destination, and the Builder's navigation
table shows its address as the Area segment and offers it to no folder.

### Descriptor identity and instantiation

Area-shell, Area-Overlay, route, navigation, Theme, and Theme-block descriptors are separate families
(`types/cms-module-descriptors.ts`). Each preset has one stable `(ownerModuleId, presetKey)` identity and
a positive integer version. A route preset belongs to exactly one Area and one normalized path. The
Builder addresses a Module Page by `createPhiPresetCmsPageId({ ownerModuleId, presetKey })`, a hash of
that pair: recomputable, unique across Modules, and unchanged when the path is reassigned. A Site Page is
addressed by its path.

- Route paths are exact or contain at most one whole-segment parameter (`/news/:slug`). The parameter
  reaches the tree loader as `params`; a loader whose parameter names nothing calls `notFound()`, which
  the request resolution raises before the shell flushes, so the route answers 404
  ([CONTENT_ENTRIES.md](./CONTENT_ENTRIES.md), "The detail route"). Catch-alls,
  optional segments, regexes, match callbacks, and several dynamic segments are rejected.
- **When the tree is built.** A route's `loadTree` runs while the request is being resolved, before the
  Page's record is read (`resolvePhiCmsRequest`, `server-helpers/cms-request.ts`: the tree is loaded, then
  `resolvePhiCmsPageRecord` reads the record the route names). It is handed `page`, `runtime`, `catalog`,
  `activeModuleIds` and the route's `params`, and nothing else: no Registry, so no Provider can be read
  with `resolvePhiRecordSource` from there, and `runtime.page` is not yet set, so `runtime.page.record`
  is absent. The Builder opens the same function by the Page's id and passes `params: {}`. A tree
  therefore cannot make a node's `visibility` depend on the record. A section that is to be absent for a
  record without its content is done the other way round: its Widgets are bound to fields the record
  has only when it has the content, and a Widget bound to a field the record lacks draws nothing
  ([The fields of a record](#the-fields-of-a-record-and-the-record-a-page-is-about), "Core Widgets that
  show a field"). `runtime.page.path`, once set, is the path of the request as it was asked
  (`/shop/p/chair`), never the route's pattern (`/shop/p/:slug`): the Page is stamped with the requested
  path before the runtime is built (`instantiatePhiRoutePresetPage`, `buildPhiRuntimePage`).
- `compilePhiCmsDescriptorCatalog` validates the installed descriptor set -- ownership, versions, route
  syntax, navigation anchors, Theme identity, shell composition -- without running a tree loader.
  `compilePhiCmsActiveRouteTable` builds one Area's active route table. Building it never refuses: where
  two active routes want one address, the first claim answers and the second is absent, which hides its
  navigation entry. Requests resolve the table by path; Builder targets resolve it by Page id. Navigation
  entries and Module Page references resolve their target through the same table
  (`resolvePhiCmsActiveNavigationSurfaces` takes it), so an entry links the address the Site assigned, and
  an entry whose route is not in the table hides -- never through the catalog, whose path is only what the
  Module declared.
- There is no route mount. A route that belongs in an Area's Settings container says so through its
  navigation entry (`anchor: "settings"`, below); the Area's `anchors.settings` names the container. The
  earlier `mount: { mountKey }` on a route and `routeMounts` on an Area said the same thing a second time
  and placed nothing, so they are gone.
- Navigation descriptors inject only into surfaces an Area declares. An entry in an Area sidebar is
  placed by role: `anchor: "start" | "main" | "settings" | "end"`, and the surface's `anchors` say what
  each means in that Area. Every sidebar declares `start` (the top, ahead of the Area's own entries),
  `main` (after the Area's own entries, ahead of the Settings container), `end` (the very bottom, behind
  the Settings container), and -- where the Area has a Settings container -- `settings` (inside it,
  after the Area's own Settings pages). An anchor the surface does not declare is refused, not moved
  elsewhere. Entries sharing an anchor are ordered by `ownerModuleId`, `presetKey` and `itemKey`; that
  is a default, and an operator reorders it in the Builder's Navigation. A Module never names another
  Module's item, and first-party Modules name no item of the Area's either:
  `buildPhiSidebarRoutePresetDescriptor` (`plugins/runtime-modules/sidebar-route.ts`) builds the Page
  and its entry from the Area and the anchor, including the Settings mount and the Area's policy for
  who sees Settings entries. The keyed form -- `parentItemKey` with `before` or `after` -- stays for
  surfaces without anchors (the account menu, the Public header) and for Modules written against it; it
  may reference only items the surface exports through `exportedItemKeys` or items the Module injects
  itself, and cannot be combined with `anchor`. Reordering or reparenting an item never changes a route
  path; a tombstoned container hides its remaining subtree at runtime and shows it disabled in Builder
  navigation authoring.
- Every Area declares `<area>:account`, the surface behind the account trigger, with one exported anchor
  and no target of its own. A Module docks its account entry under that anchor; the menu shows the
  anchor's children, with their own children as submenus, and every other item of the surface as itself.
  Like every other surface it is read through the Site's navigation overlay, so an operator's reordering
  applies. The Area's own account entries are declared here too rather than drawn by the Widget -- the
  App's profile and, injected by Auth, its security Page -- so nothing in that menu is beyond an
  operator's reach. Both are App routes and belong to `app:account` alone, because an entry names a route
  of its own Area; what reaches them from a staff Area is the list of Areas the Widget appends, which is
  no surface at all: an Area's address is its own segment, and which Areas are in the list is a property
  of the viewer rather than of the Page.
- A navigation item may declare `signalRoutes.emits` instead of a target. It is already addressable --
  every resolved item has an instance id, and a signal address is `cms:<instanceId>` -- so an item that
  emits is a sender like a Button Widget, and a renderer that finds routes draws a button. Signing out is
  the first: each Area declares it in its own account surface, Site-scoped to the Core Runtime
  Controller ([SIGNALS.md](./SIGNALS.md)), so an Area whose catalog holds no Auth Module still offers a
  way out. What the entry means lives in the route, not in a word on the item.
- Area-shell composition names `(ownerModuleId, presetKey)` sources; `omitRegionTypes` removes whole
  Region subtrees and `omitNodeKeys` may name only `exportedNodeKeys` of the source. Cycles, unresolved
  sources, duplicate Regions, and unresolved references are errors.
- A Theme descriptor declares `themeKey` and `title` and an optional `description`; Theme blocks are
  described in [THEME.md](./THEME.md#theme-blocks).

A preset node's id is never invented: it is derived from `(version, domain, ownerModuleId, presetKey,
nodeKey)` (`createPhiPresetCmsInstanceId` in `@phis/contracts/cms`), where `nodeKey` is a name local to the
preset. Preset version, Site, Area, path, node type, and catalog order never participate, so the same
node keeps its id across releases and phi-server derives the same id on its side. See
[CMS.md](./CMS.md#instance-identity) for the codec.

Today a preset builder still creates its concrete nodes itself, along one path:

1. it states its identity -- `{ domain, ownerModuleId, presetKey }` -- once;
2. `createPhiPresetCmsInstanceIdMap(identity, nodeKeys)` (`types/cms-instance-id.ts`, public from
   `@phis/ui/types`) turns the preset's node keys into ids, and refuses a key listed twice, which would
   hand two nodes one id;
3. `createPhiCmsPresetNodes(defaults)` (`helpers/cms-preset-nodes.ts`, public from `@phis/ui/helpers`)
   builds the Layout and Widget nodes with those ids and the Site, visibility and status filled in from
   the defaults (or from the Page it is handed). A package may also build nodes one at a time with `buildPhiCmsLayoutNode` and
   `buildPhiCmsWidgetNode` from the same door, as `@phis/example` does.

What a builder does not do is spell out a Layout or Widget id, and raw node keys never cross contribution
boundaries. (A Region in a Page tree still carries a synthetic negative id the builder picks, unique among
the package's presets, as `@phis/example`'s Markdown page does.) A few first-party builders still return concrete trees with synthetic ids of their own; moving
them, and eventually every builder, to local-key templates the central instantiator expands is open in
[TODOS.md](./TODOS.md) ("Convert concrete preset builders to local-key templates").

Instantiation is in memory and needs no Draft. Once an Area or route tree is saved, its Draft and
Published snapshots are independent of later descriptor versions; an untouched route uses the installed
descriptor. Persistence belongs to the concrete target -- `(site, area)` for an Area, `(site, area, page
scope)` for a Page -- and drafting, publishing, or resetting one target never changes another target of
the same preset.

### Who owns an address

Outside Public a Module's route path is its package path -- `/acme/shop/...`, derived from the Module id
-- and nothing can contest it: two packages never meet, and a package only ever collides with itself.

A descriptor states the path relative to the Module, and the package prefix is put in front of it when
the route table is compiled. Anything that *links* to a Module route rather than serving one has to apply
the same rule, `resolvePhiRuntimeModuleAreaRoutePath`; a descriptor that offers an address to a consumer
resolves it before handing it over, so no consumer is left to reconstruct it. The Account menu once got
this wrong in the one place it is easy to: the Auth provider handed out `/security` unchanged, the Widget
put only the Area in front, and the entry pointed at `/app/security` for a Page that answers at
`/app/phis/ui/security`. The surest fix is to hand out no address: both account Pages are navigation
entries now, naming a route preset the way every entry does, and an entry that names a preset cannot
name a wrong path.

In Public there is no such namespace, so the path a route descriptor declares is an application and not
a title. The Site settles it when the Module is enabled, and whoever asks second bears the cost: the
newcomer is offered another address and cannot be enabled without taking one, while the holder keeps what
it has. A holder is another active Module or a Page the Site authored; both answer the same way.

Outside Public the newcomer has nothing to yield with, because its package path is its identity. A Site
Page authored before a package was installed can sit on that package's path, and nothing checks for it
yet: activation goes through (the refusal is open in [TODOS.md](./TODOS.md)). The request resolution then
decides (`plugins/runtime-modules/route-page-resolution.ts`): a static Module route looks its Page up by
preset identity rather than by path, so the Module's Page answers and the Site Page is shadowed -- still
stored, no longer reached at that address -- until the Site moves it or the Module is switched off. For a
route with parameters an exact Site Page at the concrete path wins.

One holder yields instead of keeping: the Public base Module, `@phis/ui/modules/public`. Its Pages --
the error Pages, `/privacy`, `/terms-and-conditions`, `/contact` -- are there so that a Site is never without them,
not because the Site chose them, so a Module that brings its own is not a newcomer to be sent elsewhere
but the reason the floor can step aside. The rule is exact:

- A package Module whose Public route declares the path a Public base route holds takes that path while
  it is the only active package Module declaring it. Its Page is served there; the base Page is not
  renamed, it is covered.
- A second package Module declaring the same path meets the first as an ordinary holder and is offered
  another address. The base Module stays covered.
- A covered base route stays in the active route table under its own identity, and its path answers with
  the covering Page. Everything that points at the base Page -- a navigation item, a structured internal
  link -- keeps pointing at it and reaches the covering Page through the path. Nothing is rewritten, and
  nothing waits for a publish, because those targets are resolved when they are read. A navigation item a
  Site placed, relabelled or hid stays exactly as it was.
- The covering Module may contribute navigation items of its own for the same Page. Two entries then lead
  to one address, which is an authoring choice, not a fault: the Site hides whichever it does not want.
- Switching the covering Module off uncovers the base Page, with nothing to restore. A Module that was
  renamed away from the path while it was held keeps its granted address: a rename is the operator's
  decision and does not fall back on its own.
- Error Pages are covered the same way, because an error is rendered by resolving `/error/<code>` through
  the route table; a Module covers one by declaring exactly that path.
- Only the Public base Module yields. Every other holder keeps what it has, Core-owned or not: the Auth
  Module's `/login`, `/register`, and `/reset-password` are replaced by switching the Auth Module off, never
  by covering them.

The Public root `/` follows the same floor-and-cover rule, and adds a choice. `@phis/ui/modules/public`
holds `/` with a landing of its own, so a Site is never without a front door either. A package Module
that declares `/` does not claim the address, it offers a landing, and offers never collide: activating
a second one asks nothing and renames nothing, because a front door somewhere other than `/` is not a
front door. Which Page answers `/` is settled in this order:

- the offer the Site named in its Area config, while that Module is still active;
- otherwise the single package Module offering `/`, which covers the base landing exactly as a package
  `/contact` covers the base contact Page -- live on activation, with nobody choosing;
- otherwise the base landing: no package offers `/`, several do and the Site has not chosen, or the
  Site answered "landing, nobody" -- which adopts no offer and leaves the root to the base landing, for
  the Site to take over and author as its own.

The choice is what `/` has beyond a named address: the Site can switch between every offer, the base
landing included, without switching a Module off. A named offer whose Module goes away falls back
through the order above rather than leaving the root empty. Outside Public the root stays the Area base
Module's route, which no package can declare because every package route lives under its package path.

Two consequences bind every Module. Its declared Public path is not necessarily the path it runs under,
so no Module code may spell out its own address: the way to its own Page is the
`(ownerModuleId, presetKey)` reference resolved through the current route table. And a Module route path
stays descriptor-owned against the Site's authoring surfaces -- no Page Meta Form changes it -- while the
Public address assignment a Site writes at activation is routing rather than authoring, and does change
which address the descriptor is served under.

## Contracts, Server, live Client, Controls, and Authoring projections

The Module exports five independently analyzable projections:

- **Contracts**: namespaced identities, serializable wire types, value schemas, and pure readers with no
  React, runtime host, Provider implementation, or side effect.
- **Server**: definition, lightweight artifact descriptors, presets, Forms, serializable Provider
  descriptors, and lazy server-safe loaders.
- **live Client**: only the Controller, Provider, render, adapter, and optional UI-provider loaders needed
  by eligible live Areas.
- **Controls**: reusable presentation-only `Phi*Control` exports that remain independent of CMS,
  activation, routing, persistence, and Authoring hosts.
- **Authoring Client**: only the safe Preview/editor/provider-resource authoring loaders needed by the
  Builder target-Area sandbox.

Area aggregators select these projections by immutable module id. They do not contain Module-specific
logic beyond listing applicable contributions. For installed packages, `phis module` generates the projection the
Site hands to the Area hosts ([THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md#9-install-without-patching-the-skeleton));
neither installation nor activation patches Skeleton source.

No projection may synthesize an artifact missing from the owner Module. Duplicate ids, owner mismatch,
missing lazy implementations, invalid Area eligibility, cross-Area base references, and live/Authoring
graph leakage are hard validation errors.

### Catalog and lazy loading

- A package builds its catalog entries with `createPhiRuntimeModuleCatalog`; a Site combines catalogs
  with `extendPhiRuntimeModuleCatalog`. Both reject duplicate Module ids and ownership.
  `assertPhiRuntimeModuleCatalog` is the complete-catalog gate, and `createPhiNextCmsSiteBridge` applies
  it after Site composition, so installed packages get the same validation as first-party Modules.
- A catalog entry (`PhiRuntimeModuleCatalogEntry`) declares the definition, complete lightweight Widget
  and Layout definitions with their lazy Server loaders, Forms, `areaShells`, `areaOverlays`, `routes`,
  `navigation`, `themes`, `themeBlocks`, an optional `uiProvider: true`, optional `features`, and `load`.
  Ownership is derived from these entries; there is no parallel ownership list.
- A Widget descriptor has separate mandatory `loadRuntime` and `loadPreview` edges; the render mode
  selects one per occurrence. Descriptors never statically import implementations. A package name read
  from data is never passed to `import()`.
- Server loaders are native, statically analyzable `import()` functions. Server manifests contain no
  Client component; the Server host passes active Module ids and serializable mount data to the generic
  Client host.
- Each live Area boundary receives immutable Client manifests -- Controller Clients (made with
  `next/dynamic`), Render Clients, Data Provider Clients (`loadLive`), Calendar adapters -- containing only
  the Modules eligible for that Area and no other Area's base Module or Authoring code. Server and
  Controller Client projections pair 1:1 by `moduleId`.
- The Builder additionally receives the Authoring manifest (`loadAuthoring` per installed target-Area
  Module) and Data Provider `loadAuthoring` edges for providers whose `authoringMode` is `read` or `edit`.
  Live-only providers stay unavailable in authoring.
- Client lazy declarations (`next/dynamic`, `React.lazy`) are created at module scope, never during
  render. A Server Component does not dynamically import a Client Component to get a split.
- Data Provider descriptors declare `kind` (`options`, `table`, `tree`, `collection`, or `timeline`),
  `executionMode` (`static | live`), and `authoringMode` (`none | read | edit`).
- A `timeline` Provider answers the Timeline Widget's `entriesProvider` with `{ entries }` in the
  `PhiTimelineEntry` shape of `@phis/contracts/timeline` -- key, content, optional title, `at` (ISO date
  the Widget formats for the page locale) or `time` (words shown as written), icon, tone, pending. It
  declares no resources. Its Client is `createPhiTimelineProviderClient({ key, load, resolveLoadKey? })`
  from `@phis/ui/runtime/data-provider-client`; it translates its own texts, as an options Provider does.

### Module UI provider

A Module may use Ant Design, another component library, or its own controls internally; the library is
not cross-module ABI. When a library needs React context, a theme, a CSS cache, locale setup, or a portal
root, the Module brings one UI provider. The host mounts it only around the Module's own render subtree,
and the Builder mounts it inside the Canvas sandbox.

The provider is Client code, so it is split the way a Render Client is. The catalog entry only states
`uiProvider: true`; the loader is a `next/dynamic` component in the Module's Client contribution
(`uiProvider` in `definePhiModuleClientContributions`, or
`PHI_COMMON_RUNTIME_MODULE_UI_PROVIDER_CLIENT_MANIFEST` for first-party Modules), and the Server wraps
the Module's nodes in `PhiRuntimeModuleUiProviderHost`, which loads it from the Area's Client manifest
where a node renders. A Server catalog that loaded the provider itself made it a client reference of
every route that reached the catalog -- the Auth Module's Form provider brought the whole Form stack to
every page, Landings without a Form included. A Module whose entry says `uiProvider: true` and whose
Client half brings none is refused at render, by name. The provider:

- never wraps the application root or another Module's subtree -- a Form widget is the one place where
  several Module providers meet: it mounts the provider of the Form's owner and, nested beside it, the
  provider of each other active Module that owns a field type the Form uses (and says "not available in
  this area" in the fields of a Module that is not active), each around that Form's subtree alone
  ([FORMS.md](./FORMS.md#field-and-validation-providers));
- installs no signal bus, Controller registry, or renderer;
- scopes resets, generated styles, variables, and portal containers to the Module root or sandbox;
- is disposed with its subtree.

Modules interoperate through signals and shared value contracts, never through each other's React
context. The Auth and Asset Modules' Form UI providers are the first-party examples.

### Builder Canvas sandbox

The Builder Pages and Shells Canvases are isolated Module sandboxes
(`plugins/runtime-modules/builder/runtime-module-sandbox.server.ts`). Each Canvas resolves the exact
Module set of the edited target Area -- `core`, the target Area's base Module, and its persisted optional
`runtimeModules` -- and only the implementations its tree demands. It never inherits or accumulates the
outer Builder Area's registry; switching the target Area replaces the sandbox registry. Loader promises
may stay cached, but cached code is not active unless it belongs to the new set.

Module resolution for the Canvas is server-owned. The Builder controller selects the target Area and
triggers the refresh; it never imports Modules itself. Canvas authoring mounts no target-Area live
Controller and no live-only Provider, and its signal partition cannot reach the live Site
([SIGNALS.md](./SIGNALS.md#delivery-and-correlation)).

## Add-on boundary

A Module binds to Core or exactly one logical Add-on. Both halves ship as one package under one name
and one version: the Module is `@scope/name`, the Add-on half is `@scope/name/addon/…`, and the logical
Add-on id is `@scope/name`.

The binding is mandatory definition metadata (`types/server-capabilities.ts`):

```ts
type PhiRuntimeModuleServerBinding = {
  providerId: PhiCapabilityProviderId;
  requiredCapabilities: readonly PhiCapabilityId[];
};
```

A Module without server requirements binds to Core with `PHI_CORE_SERVER_BINDING` (provider
`@phis/server/core`); `createPhiCoreServerBinding(...capabilities)` adds required Core capabilities such
as `@phis/server/authentication:v1`. During request resolution the Site reads the Site's capability
snapshot from `phis`; a selected Module activates only when its provider is available and every required
capability is present. The server side of this contract is
[phis-server SERVER_ADDONS.md](https://github.com/phis-dev/phis-server/blob/main/SERVER_ADDONS.md).

The Site Module never imports Add-on code. The Add-on never imports React or the Site Module. Versioned,
React-free wire contracts may be shared through a neutral package. Module activation cannot install,
enable, migrate, or dynamically discover an Add-on.

## Generalization gate

Phi-owned Modules are reference implementations of the public contract and therefore have the strictest
obligation to avoid exceptions.

When a Phi Module cannot express a requirement through an existing generic Widget, Control, Provider,
Form, Layout, signal, path, or Authoring contract:

1. stop the Module implementation;
2. document the exact missing reusable capability and affected consumers;
3. ask the operator whether the central contract should be extended;
4. if approved, implement and document the generic capability in the Foundation first;
5. consume that capability from the Module without an identity branch or fallback;
6. add validation or regression coverage that prevents reintroduction of the special path.

A local workaround is not an interim implementation. It remains forbidden unless the operator
explicitly approves a time-bounded migration exception and the open migration record identifies its
removal condition.

## Validation requirements

The Runtime Module verifier must eventually enforce at least:

- one unique module definition and owner root per module id;
- at most one atomic Controller contract;
- complete ownership for all artifacts;
- standard Server/live/Authoring projections;
- exact Area eligibility and server capability binding;
- no global or import-side-effect registries;
- no Module-specific branches in generic hosts, Builder, Core Widgets, or presets;
- Provider kind/resource/action compatibility;
- Form/provider ownership and active-Area availability;
- signal capability/route compatibility and closed JSON schemas;
- route, path-injection, navigation, and preset identity validity;
- no Skeleton source imports or mutations;
- no live-only code in Authoring and no Authoring code in live Area graphs;
- every Widget a Module runs is also a Widget it can be authored with. The two catalogs are separate
  files, and a Widget missing from the authoring one fails nowhere until somebody opens a page that
  places it -- then only as a Builder diagnostic, a long way from the edit that caused it.
  `scripts/validate-authoring-catalog.mjs` compares them and runs with the other module checks.

Until every check is automated, review and migration work must treat these rules as binding manually.
