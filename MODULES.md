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
| `@phis/ui/modules/asset` | optional | all | Media, upload, asset picking, asset data |
| `@phis/ui/modules/auth` | optional | `public`, `admin`, `app` | Site login and authentication workflows ([AUTHENTICATION.md](./AUTHENTICATION.md)) |
| `@phis/ui/modules/avatar` | optional | `app` | a personal picture in the person's own Media Space |
| `@phis/ui/modules/dashboard` | optional | `app`, `accounting`, `admin`, `builder`, `editor` | Area Dashboard routes |
| `@phis/ui/modules/form-builder` | optional | `builder` | Form-definition authoring lifecycle |
| `@phis/ui/modules/groups` | optional | `admin`, `app` | Site groups and their Media Spaces |
| `@phis/ui/modules/localization` | optional | `admin`, `editor` | locale and translation administration |
| `@phis/ui/modules/observability` | optional | `admin` | Site-runtime log administration |
| `@phis/ui/modules/revisions` | optional | `builder` | revision history, restore, deletion |
| `@phis/ui/modules/theme` | optional | `builder` | Theme and brand editing ([THEME.md](./THEME.md)) |
| `@phis/ui/modules/threads` | optional | `app` | conversations a person is in, and the one composer every Module writing into one reuses |
| `@phis/ui/modules/user-management` | optional | `admin` | users, roles, invites |

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

## Building a new Module, step by step

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
   as one group; a no-op Controller is worse than none.

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
- Optional Modules are persisted per Area as `runtimeModules`: a unique array of Module ids, selection
  only. Controller types, instance keys, addresses, and config do not belong in it. A duplicate id or a
  selected locked Module is an error (`plugins/runtime-modules/settings.ts`, `resolver.ts`).
- `eligibleAreas` on the definition is the only statement of where a Module may be selected. A Module never
  enables itself, and installing a package never selects it.
- A selected Module activates only when its server binding is available (see
  [Add-on boundary](#add-on-boundary)). An unavailable Module is left out of route, Controller, Widget,
  Layout, and Provider resolution while its selection stays persisted, and produces a scoped diagnostic.
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
  instances. The Form controller works this way.

Additional instances never reload the Module. The generic runtime controller host is the only mount path;
Widgets, Layouts, and Controllers never mount a Controller themselves. A Controller definition may declare
an optional server-only `serverPreload` whose serializable, request-scoped result is handed to its Client;
it never handles browser signals.

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

## Definition and Controller

`definition.ts` is server-safe, serializable, and the single source for:

- module id, kind, canonical source locale, title, description, category, and icon metadata;
- eligible Areas and access policy;
- Core/Add-on binding and required versioned capabilities;
- optional Controller descriptor and mount policy;
- serializable Provider and adapter descriptors.

## Module source locale and authored copy

Every Module has exactly one canonical `sourceLocale`. Omission means `en`. Phi-owned Modules author all
canonical package copy in English and may not declare another source locale. A third-party Module may
declare another supported locale once on its Module definition.

That Module locale is inherited by all package-authored user-facing copy owned by the Module, including
Module title and description, Widget and Layout metadata, Forms and validation labels, Provider/Table/
Tree presentation labels, preset copy, navigation injections, dialogs, actions, and tooltips. A child
artifact must not introduce another source locale or silently mix source languages. Module-owned Label
Sets use the shared Runtime-Module Label-Set helper so the owner definition remains the single source of
this inheritance.

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
`contentId`, and a `sortOrder` that follows the slot unless it is given -- because those repeat for
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

### Descriptor identity and instantiation

Area-shell, Area-Overlay, route, navigation, Theme, and Theme-block descriptors are separate families
(`types/cms-module-descriptors.ts`). Each preset has one stable `(ownerModuleId, presetKey)` identity and
a positive integer version. A route preset belongs to exactly one Area and one normalized path. The
Builder addresses a Module Page by `createPhiPresetCmsPageId({ ownerModuleId, presetKey })`, a hash of
that pair: recomputable, unique across Modules, and unchanged when the path is reassigned. A Site Page is
addressed by its path.

- Route paths are exact or contain at most one whole-segment parameter (`/news/:id`). Catch-alls,
  optional segments, regexes, match callbacks, and several dynamic segments are rejected.
- `compilePhiCmsDescriptorCatalog` validates the installed descriptor set -- ownership, versions, route
  syntax, route-mount exports, Theme identity, shell composition -- without running a tree loader.
  `compilePhiCmsActiveRouteTable` builds one Area's active route table. Building it never refuses: where
  two active routes want one address, the first claim answers and the second is absent, which hides its
  navigation entry. Requests resolve the table by path; Builder targets resolve it by Page id.
- An Area may export a route mount such as `settings`: a `mountKey` bound to an href-less navigation
  container. A route that opts in with `mount: { mountKey }` places its navigation entry there. A mount
  composes navigation, never paths.
- Navigation descriptors inject only into surfaces an Area declares. `before`, `after`, and
  `parentItemKey` may reference only items the surface exports through `exportedItemKeys` or items the
  Module injects itself. Reordering or reparenting an item never changes a route path; a tombstoned
  container hides its remaining subtree at runtime and shows it disabled in Builder navigation authoring.
- Area-shell composition names `(ownerModuleId, presetKey)` sources; `omitRegionTypes` removes whole
  Region subtrees and `omitNodeKeys` may name only `exportedNodeKeys` of the source. Cycles, unresolved
  sources, duplicate Regions, and unresolved references are errors.
- A Theme descriptor declares `themeKey` and `title` and an optional `description`; Theme blocks are
  described in [THEME.md](./THEME.md#theme-blocks).

Preset templates carry no instance ids. Nodes use preset-local `nodeKey` values, and the central
instantiator derives each canonical id from `(version, domain, ownerModuleId, presetKey, nodeKey)`
(`createPhiPresetCmsInstanceId` in `@phis/contracts/cms`). Preset version, Site, Area, path, node type,
and catalog order never participate. Preset authors never create ids or concrete CMS nodes; raw node
keys never cross contribution boundaries. See [CMS.md](./CMS.md#instance-identity) for the codec.

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
`/app/phis/ui/security`.

In Public there is no such namespace, so the path a route descriptor declares is an application and not
a title. The Site settles it when the Module is enabled, and whoever asks second bears the cost: the
newcomer is offered another address and cannot be enabled without taking one, while the holder keeps what
it has. A holder is another active Module or a Page the Site authored; both answer the same way.

Outside Public that same principle produces the other outcome, because there the newcomer has nothing to
yield with. A Site Page authored before a package was installed can sit on that package's path, and
activation is then refused -- naming the occupied path -- until the Site moves the Page. A Site Page may
not be moved onto the path of a package active in its Area, so the case can only arise in that one order.

One holder yields instead of keeping: the Public base Module, `@phis/ui/modules/public`. Its Pages --
the error Pages, `/terms-and-conditions`, `/contact` -- are there so that a Site is never without them,
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
  `navigation`, `themes`, `themeBlocks`, an optional `loadUiProvider`, optional `features`, and `load`.
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
- Data Provider descriptors declare `kind` (`options`, `table`, `tree`, or `collection`),
  `executionMode` (`static | live`), and `authoringMode` (`none | read | edit`).

### Module UI provider

A Module may use Ant Design, another component library, or its own controls internally; the library is
not cross-module ABI. When a library needs React context, a theme, a CSS cache, locale setup, or a portal
root, the catalog entry declares one lazy `loadUiProvider`. The host mounts it only around the Module's
own render subtree, and the Builder mounts it inside the Canvas sandbox. The provider:

- never wraps the application root or another Module's subtree;
- installs no signal bus, Controller registry, or renderer;
- scopes resets, generated styles, variables, and portal containers to the Module root or sandbox;
- is disposed with its subtree.

Modules interoperate through signals and shared value contracts, never through each other's React
context. The Auth Module's `loadUiProvider` is the first-party example.

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
[phis-server SERVER_ADDONS.md](../phis-server/SERVER_ADDONS.md).

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
