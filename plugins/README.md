# Plugin Infrastructure

This directory contains plugin/runtime infrastructure, not widget or layout implementations.

For a complete third-party package walkthrough, start with
[THIRD_PARTY_MODULES.md](../THIRD_PARTY_MODULES.md). This document remains the detailed infrastructure
contract.

The normative Runtime Module structure is [MODULES.md](../MODULES.md), and the normative Table and Table
Provider ABI is [TABLES.md](../TABLES.md).

## Purpose

Third-party widget authors need three separate implementation artifacts:

- a server-safe widget definition
- a live/server widget plugin
- a client-safe builder widget plugin

Those artifacts are owned by one logical runtime module and exposed through
statically analyzable lazy loader descriptors. A package may register several
logical modules. A module owns at most one controller type, and every contributed
Widget, Layout, controller, form/provider, data provider, option provider,
Calendar adapter, and authoring extension has exactly one `ownerModuleId`. A
controllerless module must contribute at least one meaningful artifact and must not
declare a no-op controller.

A module may additionally contribute separate server-safe Area-shell, route, and theme preset descriptors.
Preset ownership follows the same module boundary; a host must not activate or compose a contribution from
a module outside the resolved target-Area module set.

Installed module-catalog entries expose those descriptors through `areaShells`, `routes`, and `themes`.
Descriptor metadata and lazy tree builders are catalog-owned; sites extend them with the same
`createPhiRuntimeModuleCatalog(...)` and `extendPhiRuntimeModuleCatalog(...)` boundary used for widgets,
layouts, controllers, and providers. `compilePhiCmsDescriptorCatalog(...)` validates the complete installed
descriptor set, while `compilePhiCmsActiveRouteTable(...)` detects collisions only in the selected Area's
active module set.

Global implementation arrays are not an extension boundary. The site bridge
provides the installed runtime-module catalog. The request host activates
Platform Core, the Area's locked base module, and explicitly enabled optional area modules, resolves tree demand, and passes a
fully resolved registry to the renderer.

Packages build catalogs with `createPhiRuntimeModuleCatalog(...)`; sites combine first-party and
third-party catalogs with `extendPhiRuntimeModuleCatalog(...)`. Both helpers reject duplicate module
ids and controller ownership before request-time resolution. `assertPhiRuntimeModuleCatalog(...)` is
the reusable complete-catalog gate, and `createPhiNextCmsSiteBridge(...)` applies it after Site
composition so third-party artifacts receive the same runtime contract validation as first-party ones.

## Registries

### `runtime-modules/*-widgets.ts`

Owner-scoped server descriptors for widget definitions and lazy live/preview
implementation loaders. These files may import lightweight definitions, but
must not statically import implementation modules.

These manifests are the sole installed Widget catalog. Server metadata consumers use the definitions
carried by the resolved active Runtime module set. Global Widget definition providers, export registries,
or import-side-effect registration are forbidden.

### `runtime-modules/client-authoring-widgets/*`

Client-safe widget authoring loaders are split by owner module. Each module's `AuthoringClient`
registers only its own widget loaders and lazily resolves the requested adapter. `React.lazy()`
declarations are created at module scope and never during render. The Builder scaffold rejects types
outside the active Canvas module set and missing module-owned authoring adapters.

### `runtime-modules/client-authoring-module.tsx`

The shared Client factory composes one module-owned Widget resolver and that module's Layout
authoring loaders into an `AuthoringClient`. The Canvas server host nests only the Clients from its
resolved target-Area module sandbox. Third-party packages use the public
`@phis/ui/runtime/authoring-client` entry; a central first-party switch or global layout map is
not an extension boundary.

### `runtime-modules/client-area-contributions/*`

Area-scoped Controller Client projections contain only `loadController`. They pair 1:1 with the Server
Area contributions and are the only module implementation edges imported by normal live routes. Public
must therefore remain physically unable to reach Builder, Admin, Editor, Theme, or Authoring Clients.

### `runtime-modules/client-authoring-contributions/*`

Canvas-only projections contain only `loadAuthoring`. The Builder provider mounts their complete
target-Area union around its isolated sandbox; Public, Admin, and Editor providers do not import this
manifest.

### `runtime-modules/*-data-providers.ts`

Owner-scoped provider manifests split serializable descriptors from executable Provider Clients.
Live runtime composes `loadLive` only for active modules. Canvas receives the same descriptors for
configuration, but composes `loadAuthoring` only when the target Authoring mode permits it. The current
`executionMode: "static" | "live"` and `authoringMode: "none" | "read" | "edit"` fields are independent;
`authoringPolicy` is not accepted by the v1 descriptor ABI. Live-only providers
must not register globally or leak DB/API/controller state into authoring.

Third-party packages build scoped option or table Provider Clients through
`@phis/ui/runtime/data-provider-client`; module descriptors and live/authoring loaders remain
declared by that package's runtime-module manifest.

### `registries/runtime-controller-core.ts`

Runtime controller shared contract helpers.

Use this for controller provider types, definition/plugin map builders, config
parsing, mount validation, instance-key validation, signal-address derivation,
and helpers that must be safe in both server and client modules.

This module must not import controller definitions, controller plugins, or
server-only preload code.

### `registries/runtime-controllers.ts`

Strict parsing helpers for persisted controller settings. Controller metadata used by Builder settings
and option providers comes from the installed module catalog's serializable controller descriptor;
this file must not rebuild a first-party controller-definition list.
It must not import server preload implementations or client controller bodies.
Request-specific server definitions come from active runtime modules;
each active module supplies its own controller Client Component.
The serializable module controller descriptor includes its `runtimeSignals` metadata so Builder Wiring
can catalog active controller endpoints without loading or mounting the controller Client in Canvas.

Controller runtime execution is client-side. Controller metadata is server-safe.
Controllers may optionally declare a server preload phase when a controller
needs request-scoped server data before its client runtime can mount.

- `PhiRuntimeControllerDefinition` is the server-safe contract for picker,
  settings, validation, capabilities, and optional server preload metadata.
- `PhiRuntimeControllerPlugin` extends the definition with the client runtime
  `renderController(...)` implementation.

Controller plugins are not widgets and must not be registered in the widget
registries. They are mounted by runtime/page/shell settings through the
controller host and use the standard address form
`controller:<npm-package>/<controller-key>:<instance-key>`.

Structured table data uses the module data-provider contract:

- descriptors declare `kind: "table"` and one globally unique namespaced provider key
- the executable Provider Client implements query and may implement declared mutations for one or more
  stable Provider resources
- third-party modules keep API access and mutations inside their provider implementation; the public
  `PhiTableWidget` binds only to provider key, resource key, and optional serializable params
- execution mode (`static | live`) and Authoring mode (`none | read | edit`) are independent v1 metadata;
  `authoringPolicy` is forbidden
- editable static content is a versioned Provider resource edited through generic Builder Provider
  Authoring, never through a Provider-key branch or domain Table Widget
- the Provider receives normalized resource/query/action requests, not the complete Table Widget config
- complete behavior, signals, static resources, column ordering, hierarchy, and Markdown reuse follow
  `TABLES.md`

Hierarchical non-tabular data uses the corresponding Tree provider contract:

- descriptors declare `kind: "tree"`, a globally unique namespaced provider key, and one or more stable
  resources with identity, parent, title, field, action, and DnD metadata
- Provider queries return flat nodes; the generic Binding validates and builds the hierarchy
- `PhiTreeWidget` persists presentation and source binding, while `PhiTreeBinding` owns Provider query,
  mutation, selection, checking, expansion, and optimistic reconciliation
- `PhiTreeControl` stays provider-free and uses shared Phi editors plus Ant Design Tree interaction
  primitives; domain Tree wrappers and direct Provider-key branches are forbidden
- complete behavior and ownership follow `TREES.md`

Non-tabular item collections use the parallel collection-provider contract:

- descriptors declare `kind: "collection"` and one globally unique namespaced provider key
- widgets bind through `{ providerKey, resourceKey, params? }`
- the executable Provider Client owns remote queries and actions; renderers own only declarative
  presentation and local interaction
- controllers may coordinate transient filters, selection, pagination, and signals, but do not fetch
  or mutate collection data
- specialized upload transports remain module-owned; subsequent reads, deletes, and metadata updates
  go through the collection provider

Module activation and controller mounting are separate:

- optional active modules are read from Area `runtimeModules`; the locked base module comes from the
  Area definition and must not be persisted
- persisted module ids use `<npm-package>/<module-key>` and must resolve through the installed module
  catalog; controller types are not module-selection values
- module id and controller type are separate explicit manifest fields and must not be derived from one
  another, even when their current namespaced strings match
- an active module may own one controller type and, when present, declares whether it receives a
  default area mount or is materialized on demand
- CMS instances may materialize additional controller instances only when the controller's
  `ownerModuleId` is active
- server preload only runs for active registered controllers that declare it
- areas without server-preload controllers must not pay controller preload cost
- the host must not special-case `runtime.area`, widget types, or plugin keys

The host split is:

- a server controller host reads settings, parses config, validates mount scope,
  and awaits optional `serverPreload(...)`
- each active module supplies its own controller Client Component; the shared mounted-controller helper
  registers its address and renders the module controller plugin with parsed config and serializable
  preload data

`serverPreload(...)` is server-only. Its result must be serializable and scoped
to the current request/runtime context. It must not process browser runtime
signals directly; browser signals remain owned by the client signal bus and
client controller runtime.

Typical use cases:

- builder orchestration
- asset/media scope orchestration
- search/query orchestration
- form state and submit orchestration
- third-party non-renderable workflow controllers

Third-party packages register controller metadata and implementation loaders
through the controllers' owner module. Do not reintroduce definition/plugin provider
arrays beside the module catalog.

Client controller plugins use `@phis/ui/runtime/controller-client` to build the module-owned
`ControllerClient` boundary. The lazily resolved module manifest owns exactly that reference; sites,
bridges, and the generic runtime host do not maintain a second controller implementation map. The
server host selects the reference only from the active module set and passes serializable mount data
into it.

Client authoring plugins use `@phis/ui/runtime/authoring-client` to build the same module's
separate `AuthoringClient` boundary. Live runtime never renders that Client. Builder Canvas composes it
only for modules active in the current target-Area sandbox and does not mount those modules' live
controllers.

## Runtime Helpers

### `runtime/slot-size-policy.ts`

Shared slot-size policy normalization and derived DOM/runtime metadata.

Use this when a renderer, layout, or scaffold needs to interpret declared slot occupancy without inspecting widget/layout-specific DOM.

### `runtime/phi-slot-child-frame.tsx`

Renderer-owned wrapper for slot children.

Use this to carry normalized slot-size policy through live, preview, and editor render paths.

## Authoring model

For a normal widget, keep the implementation split explicit:

- `components/widgets/config/<widget>.ts`
  - shared definition and parser
- `components/widgets/plugins/<widget>-widget-plugin.tsx`
  - live/server plugin with `render()` and optional `renderPreview()`
- `components/widgets/builder/<widget>.tsx`
  - builder plugin with `renderEditor()`
- optional `components/widgets/client/<widget>.tsx`
  - reusable client body
- optional `components/widgets/server/<widget>.tsx`
  - reusable live/server wrapper

The shared definition in `config/*` is the single source of truth for:

- `pluginKey`
- `typeKey`
- `title`
- `description`
- `fields`
- `defaultConfig`
- `parseConfig`

Do not duplicate those values across server and builder plugins.

## Module composition

The complete normative logical and first-party physical structure is defined in
[MODULES.md](../MODULES.md). Existing flat first-party manifests remain migration input; new modules and
materially reworked Phi-owned modules use the standard owner folder and its Server/live/Authoring
projections.

Third-party packages contribute one statically analyzable loader per runtime module to the site
bridge's `runtimeModuleCatalog`. A module is keyed by namespaced module id and owns at most one
controller definition plus Widget, Layout, form/provider, data-provider, option-provider,
Calendar-adapter, and authoring descriptors. It may also expose one lazy client UI-provider descriptor for a package-owned
theme/context/CSS/portal boundary. Hosts compose catalogs by module id and must reject duplicate ids and duplicate
contribution ownership; they must not rebuild parallel widget, layout, builder-widget, controller,
form, or provider implementation arrays.

The module UI provider wraps only module-owned output. It may integrate Material UI, Radix, or another
library, but must scope theme, CSS resets, generated styles, and portal containers to that module root
or its Canvas sandbox. It must not wrap the app root, install another signal bus or renderer, or use
private React context for cross-module communication; interoperability remains standard Phi signaling.

Lightweight widget and layout definitions belong directly to their owner-module descriptors. Builder
Picker and Inspector consumers receive the exact active target-area module definitions; they must not
assemble or filter a global first-party metadata list. Any lightweight definition registry that still
exists is legacy internal infrastructure, not an extension boundary for live or authoring implementations.
Widget descriptors expose separate mandatory `loadRuntime` and `loadPreview` edges, and Authoring remains
owner-scoped through its Client manifest. The resolved tree render mode selects exactly one Server implementation
edge per Widget occurrence; activation alone executes neither loader.

### Module descriptors

Area-shell, route, and theme presets are separate descriptor families. Every descriptor has one stable
`(ownerModuleId, presetKey)` identity and a positive integer version. A route preset belongs to exactly
one Area, one stable Area-local `pageKey`, and one immutable effective normalized path; `pageKey` identifies
its Builder/Draft target and is never inferred from `path`. Duplicate Area-local page keys, multi-target
presets, and generic preset kinds do not exist.

An Area may export explicit route mounts. Each mount binds a stable key and normalized base path to an
exported href-less navigation container and requires an exact base-module route at that path. An opting-in
route declares the mount key and a normalized mount-relative path. The compiler prefixes it with the mount
base and a single module-derived segment: the complete runtime module id without its leading scope marker,
joined with `+` (`@acme/status/auth` becomes `acme+status+auth`). `+` is reserved inside encoded identity
parts. Route collisions remain hard errors after this expansion; collisions never create mounts implicitly.

Route paths are exact or contain at most one whole-segment parameter such as `/news/:id`. Catch-alls,
optional segments, regexes, arbitrary match callbacks, and multiple dynamic segments are rejected. The
metadata-only compiler validates the active route table and resolves Exact before Dynamic. Runtime requests
resolve that table by effective URL path; Builder/Draft selection resolves it independently by Area-local
`pageKey`. Navigation overlays may reorder or reparent a mounted item without changing that path. A
tombstoned Area container hides its remaining runtime subtree, but Builder authoring still exposes the
source subtree as disabled and may move a child outside it.

Preset templates contain no numeric CMS node ids. Before rendering or authoring, the shared instantiator
derives canonical 96-bit `PhiCmsInstanceId` values from
`(contractVersion, ownerModuleId, presetKey, nodeKey)` and resolves structural and signal references.
Preset versions, Site, Area, request path, catalog order, and widget/layout type do not participate in
node identity.

Area shell composition uses `(ownerModuleId, presetKey)` sources. `omitRegionTypes` removes complete
Region subtrees, while `omitNodeKeys` may reference only source-exported node keys. Source resolution,
cycle detection, duplicate-Region rejection, and final graph validation belong to the central compiler
and instantiator.

Each Theme descriptor declares a required `themeKey` and `title` plus an optional `description`. Theme
discovery and materialization use only active module descriptor bindings; mutable registries and import
side effects are forbidden.

The current first-party migration has moved Area shell selection, stable live route selection, and
Builder Page title/path discovery to this descriptor catalog. First-party legacy builders still return concrete trees
and must be converted to local-key templates before the central instantiator is the sole node-construction
authority; this is a tracked migration boundary, not a supported third-party authoring pattern.

Builder Canvas module resolution is server-owned, so its target area and page are canonical URL scope.
When a Builder workspace route is entered without either scope parameter, the Builder controller writes
its current area and page to the URL before the interactive Canvas mounts. During a scope transition the
Canvas may render its declared side-effect-free workspace skeleton, but it must never render one area's
draft tree against another area's resolved module registry.

## Boundary rules

- `config/*` may be imported by server and client paths.
- `builder/*` may only be imported by client builder/editor paths.
- `renderPreview()` belongs to the live/server widget plugin, not to the builder registry.
- `renderEditor()` belongs to the builder registry, not to server preset or snapshot preview code.
- The shared widget editor scaffold owns generic inertness, selection/hover/debug chrome, and common
  editor tools. Builder plugins must not duplicate that behavior with local disabled flags or pointer
  interception.
- A normal builder plugin must provide a client-safe editor body directly or through the shared
  `createPhiCmsBuilderWidgetPlugin(...)` adapter. Passive public widgets should use the adapter instead
  of repeating the builder-plugin object shape. Missing builder output must not fall back to server
  `renderPreview()`.
- `renderEditor()` is reserved for the client-safe body and specialized authoring output;
  `renderEditorTools()` is the widget-owned chrome extension. Neither extension changes scaffold
  ownership or permits generic code to branch on plugin identity.
- `PhiCmsBuilderWidgetPlugin.editorInteraction` defaults to `inert`; `authoring` explicitly declares a
  body whose editable text targets the common scaffold activates on click and deactivates on blur,
  outside click, or Escape. The exit action must not also open the Inspector, and `authoring` must not
  make the body permanently interactive.
- `components/widgets/built-in/*` is not the extension surface for ordinary third-party widgets.
- Runtime controllers are headless runtime plugins, not widgets. They must use
  `runtimeSignals.emits/listens` for capability declarations and
  `controller:<npm-package>/<key>:<instanceKey>` for signal identity.
- Optional controller server preload is part of the same controller registry
  contract. Do not introduce area-specific root-layout mounts, site-controller
  singletons, or controller-local routing contracts for preload needs.

## Contract governance

Changing, extending, replacing, reinterpreting, or widening the infrastructure contracts in this
document requires explicit prior operator approval after the exact gap and affected ABI have been
presented. They must not be bypassed through a parallel, shadow, local, Module-specific,
Provider-specific, fallback, or compatibility contract. If they cannot express a requirement,
implementation stops and asks the operator first.
