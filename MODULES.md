# Runtime Module Contract

This document defines the normative target v1 structure for Runtime Modules in `@phis/ui`.
First-party Phi Modules must follow it. Third-party packages may choose different source filenames, but
their exported contribution graph must be structurally equivalent.

## Purpose and identity

A Runtime Module is the one Site/client installation, ownership, activation, and lazy-loading boundary
for a coherent feature. It is identified by one stable namespaced `moduleId`, belongs to declared Areas,
binds to Core or exactly one server Add-on, and owns every artifact it contributes.

A Module may own at most one Controller type. A controllerless Module is valid only when its Widgets,
Forms, Providers, presets, adapters, or other declared artifacts are independently meaningful; no-op
Controllers are forbidden.

Generic cross-domain infrastructure belongs in the Foundation (see below), domain behavior in its
Module. A direct server counterpart is a physically separate Add-on package with the mandatory
`-server` postfix.

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
├── authoring.tsx             Authoring Client contribution   ─┘
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
   `controller/client.tsx`. Controller fields and `loadController` are complete as one group or absent
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

8. **Run `pnpm runtime-modules:check` and `pnpm typecheck`.** Twenty-five contract verifiers run; they
   catch what typecheck cannot — route grammar, ownership collisions, Area synchronisation, projection
   boundaries, provider/loader pairing.

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

Module Widgets and Layouts follow the same shared config, render-mode, signal, access, slot-size,
Preview, and Authoring contracts as Core artifacts. Their lightweight definitions are the only Picker
and Inspector metadata source.

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

Presets are declarative composition, not implementation hosts. They may:

- place generic or Module-owned Widgets and Layouts;
- select Provider/resource bindings and Form ids;
- provide appearance config and translated label references;
- wire declared signal capabilities;
- contribute route/path/navigation metadata through the central descriptor contracts.

They may not fetch data, import Client implementations, create local registries, mount Controllers,
branch on another Module, or encode a missing generic capability in a custom Widget/config string.

Path collisions, mount injection, module-derived path segments, navigation reordering, and tombstones
follow the central route/navigation contract. A Module never patches Site or Skeleton route source.
Module configuration surfaces follow the Settings container contract in [SETTINGS.md](./SETTINGS.md);
working-surface routes and navigation entries remain ordinary contributions under this contract.
Mutable Site Page paths and typed internal Page/Asset targets follow [REFERENCES.md](./REFERENCES.md).
Module route paths remain descriptor-owned and cannot be changed by a Site Page Meta Form.

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
logic beyond listing applicable contributions. `phis-cli` composes installed manifests into external
immutable build state; neither installation nor activation patches Skeleton source.

No projection may synthesize an artifact missing from the owner Module. Duplicate ids, owner mismatch,
missing lazy implementations, invalid Area eligibility, cross-Area base references, and live/Authoring
graph leakage are hard validation errors.

## Add-on boundary

A Module binds to Core or exactly one logical Add-on. When the Module package is `@scope/name`, its direct
server package is `@scope/name-server`, while the logical Add-on id remains `@scope/name`.

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
- no live-only code in Authoring and no Authoring code in live Area graphs.

Until every check is automated, review and migration work must treat these rules as binding manually.

## Migration status

The owner-folder layout is no longer a target: all eighteen first-party Modules live in it, and the
collection directories that preceded it are gone — `modules/`, `module-definitions/`, `client-loaders/`,
`client-authoring-modules/`, `client-authoring-widgets/`, `client-data-providers/`, and the shared
`ids.ts` from which seventeen Modules once drew their id.

`components/` now holds only what belongs to no Module: `controls`, `forms`, `layouts`, `regions`,
`root`, `runtime`, `widgets`, and the other shared families.

All seventy Widgets live in their owning Module as `widgets/<widget>/{config,client,server,plugin,
authoring}`. `components/widgets/` keeps only what belongs to no single Widget: `label-sets`,
`label-types`, `helpers`, `signals`, `shared`, and the shared configuration building blocks such as
`parser-primitives`, `mask` and the background patterns.

A Widget whose Client has a façade in front of its implementation keeps both: `index.tsx` re-exports,
`client.tsx` implements.

There is no second contribution path any more, and adding one is a contract change, not a shortcut.

## Contract governance

Changing, extending, replacing, reinterpreting, or widening this contract requires explicit prior
operator approval after the exact gap and affected ABI have been presented. This contract must not be
bypassed through a parallel, shadow, local, Module-specific, Provider-specific, fallback, or compatibility
contract. If it cannot express a requirement, implementation stops and asks the operator first.
