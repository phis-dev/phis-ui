# Repository Guidelines (@phis/ui)

## Core rules

- No workarounds without prior operator approval.
- Never create, change, extend, replace, or reinterpret a documented or typed contract without explicit
  prior operator approval. A request to analyze, review, diagnose, or propose a contract is not permission
  to edit contract documentation or ABI types. Approval is scoped to the stated contract direction and
  does not authorize adjacent fields, values, capabilities, compatibility paths, or design axes.
- Always identify and state the real root cause before changing package structure or dependency strategy.
- Documentation must be written in English.
- Viewer access, provider roles, Core Admin override, and responsive visibility must follow the
  normative `ACCESS.md` target v1 contract.
- Provider-backed visual collections must follow the normative `COLLECTIONS.md` target v1 contract.
- General group claims and Media Space visibility must consume the normative server contracts in
  `phi-server/AUTHORIZATION.md` and `phi-server/GROUPS_AND_STORAGE.md`; shared UI must not persist or
  infer a second ownership, quota, Folder, delivery, or Storage model.
- Provider-neutral user/group authority, operation capabilities, Directory bindings, and future
  LDAP/SCIM/Entra providers must consume `phi-server/DIRECTORY_PROVIDERS.md`. The optional management UI
  belongs to the separate `@phis/groups` package and must not be added to `@phis/ui`.
- Auth Module ownership, replacement, Account Widget delegation, Admin settings, and CLI preset recovery
  must follow the normative `AUTHENTICATION.md` target v1 contract.
- Runtime Module ownership, physical projections, presets, providers, Forms, signaling, generalization,
  and Add-on separation must follow the normative `MODULES.md` target v1 contract.
- Tables, Table Providers, editable static resources, column ordering, tree tables, signaling, and
  Markdown reuse must follow the normative `TABLES.md` target v1 contract.
- Trees, Tree Providers, bindings, node editing, actions, selection, checking, expansion, and DnD must
  follow the normative `TREES.md` target v1 contract.
- Modal/Drawer containers, Overlay ownership, root Layouts, signaling, and authoring boundaries must
  follow the normative `OVERLAYS.md` target v1 contract.
- Source-locale transport, structured Markdown/HTML units, and external document detection must follow
  the normative `TRANSLATIONS.md` target v1 contract.
- Mutable Site Page paths, stable internal Page/Asset targets, navigation selection, Markdown/HTML Phi
  references, and the external-document trust boundary must follow the normative `REFERENCES.md` target
  v1 contract.
- Guided Tours, visual target addresses, Runtime anchor resolution, Tour signaling, and user progress
  must follow the normative `TOURS.md` target v1 contract.
- Use `pnpm` for local commands in this workspace.
- Delete files with `rm -- <explicit-path>`, not with an `apply_patch` delete operation. Resolve every
  target first and do not use recursive deletion, globs, or unresolved variables for individual source
  files. Use `mv` for file moves and renames instead of delete-and-recreate patches.
- Use low-output verification.
  - Capture one Git baseline at the start of a coherent work block.
  - During implementation, inspect only affected files and targeted hunks. Do not repeatedly print full diffs, repository documentation, successful check output, or unchanged status.
  - Use `pnpm -s verify` before a commit. Its default `changed` profile selects the smallest relevant check set from the current Git changes and emits output only when verification fails.
  - Use an explicit `pnpm -s verify <profile>` only when the task requires broader coverage: `docs`, `code`, `runtime`, `antd`, `package`, or `all`.
  - Do not run `all`, a full build, Runtime module validation, or Ant Design doctor for an unrelated small change. Escalate from the default profile only when the affected contract or runtime boundary requires it.
  - Before a commit, inspect the changed-file list and only risk-relevant hunks, then run the selected verification profile once unless an earlier check is needed to unblock implementation.
  - Report successful checks concisely. Show detailed output only for failures or when the operator explicitly requests it.
  - Keep Git output equally narrow: use `git diff --check`, inspect only changed file names and risk-relevant hunks, use quiet commit output, and avoid printing successful or unchanged state repeatedly.
  - Re-read repository guidance after a new session, repository switch, major context compaction, or relevant contract change; do not repeatedly re-read it during one uninterrupted work block.
- Do not commit without explicit operator authorization.
  - A task-local instruction to implement, verify, and commit authorizes only the logically scoped commit for that task.
  - Commit only after the agreed checks pass and no required manual or browser verification remains unresolved.
  - If a required functional check cannot be performed, report the pending check instead of committing the change as complete.
- Use the local Ant Design CLI for Ant Design research before guessing API details, migration advice, or do-and-don't guidance. Prefer `pnpm exec antd info <Component> --format json`, `pnpm exec antd doc <Component>`, `pnpm exec antd demo <Component> [name]`, `pnpm exec antd token [Component]`, `pnpm exec antd semantic <Component>`, `pnpm exec antd lint <target>`, and `pnpm exec antd doctor` as appropriate.
- When a consuming app already runs in dev mode, prefer the quiet `pnpm verify` flow over invoking TypeScript, ESLint, Runtime module validation, or Ant Design doctor separately.
- After changing module ownership or lazy descriptors, use `pnpm verify runtime`.
- In a running `next dev` flow, do not use `next build` as routine verification. Let dev reload handle runtime checks and use typecheck/lint for code validation.
- Run a full `pnpm build` only when production packaging, export behavior, bundling, or SSR output must be verified explicitly.
- Always read the existing shell, region, layout, and routing contracts in `README.md`, `AGENTS.md`, and the relevant preset/component files before making structural changes.
- Do not invent new shell, region, or routing behavior when an explicit contract already exists.
- Use the documented shell/region composition as-is. If the contract is unclear, stop and ask instead of guessing.
- Treat documented contracts, closed enums, discriminated unions, and shared type families as binding ABI.
  - Do not extend a contract, add enum/string action values, add new field types, widen a type family, or introduce a new design axis without explicit operator approval.
  - If an implementation cannot be expressed through the current contract, stop and ask for the contract extension first; do not encode the new meaning in an ad hoc string, custom channel, fallback branch, or local workaround.
  - ABI-breaking cleanup is allowed only inside the approved contract direction; it does not authorize unapproved contract expansion.
- Before adding new code, first look for an existing helper, contract, plugin, preset, or wrapper that can be reused or extended.
- Prefer reusable shared behavior over one-off special cases. If a new surface or helper is not clearly reusable across consuming sites, ask before introducing it.
- Widgets must remain independent plugin units.
  - the builder inspector may read only declarative widget properties and capabilities
  - do not add `if`/switch logic in the builder based on widget type, widget key, or plugin identity to render settings
  - widget-specific settings must be expressed through declarative field types or generic capabilities
  - `fields` declare inspector-editable config only
  - renderable-block `capabilities` declare binary interaction participation only, such as selectable, draggable, focusable, or droppable
  - `runtimeSignals.emits/listens` declare signaling capabilities; do not infer signal wiring from inspector fields or binary block capabilities
  - `runtimeSignals.dragDrop` declares semantic drag/drop payload types and drop modes; do not encode those in inspector fields or ad hoc widget props
- Site/client extensions are Modules; server extensions are Add-ons. Every Module binds to exactly one
  Add-on or to Core. A Module must never install, enable, import, or dynamically discover server code,
  and Site/React packages must stay physically separate from Add-on packages.
- Phi-owned Modules are reference implementations and must converge on the one owner-folder and
  Server/live/Authoring projection structure defined in `MODULES.md`. Existing flat first-party manifests
  are migration input, not a template for new Modules or another contribution path.
- A Module preset must use generic Core Widgets, Provider bindings, Form ids, and declared signal routes
  whenever those contracts can express the feature. Domain-named wrappers that only inject a Provider,
  Form, labels, bootstrap state, actions, dialogs, or missing generic capability are forbidden.
- If a Module cannot express a requirement through a current generic contract, stop and ask before
  implementation. An approved reusable extension is implemented centrally and documented first; a
  Module-local fallback, identity branch, or temporary parallel path is not implied authorization.
- A direct Add-on counterpart uses the Module package name with the mandatory `-server` postfix:
  `@scope/name` pairs with `@scope/name-server`; the logical Add-on id remains `@scope/name`.
- The Skeleton is the reusable Site base. Installing a Module must not patch or generate Skeleton source;
  all optional Site code stays in Module packages and `phis-cli` emits only external immutable build state.
- Use the existing runtime signal/bus system for cross-widget, inspector, and shell coordination.
  - do not add preset-local, inspector-local, or widget-name-specific coordination logic when the same behavior can be modeled through runtime signals
  - signals use the consolidated `PhiSignal` contract from `types/signals`; closed enums and approved action vocabularies must not be widened without explicit operator approval
  - signal routing belongs in `scope`, `channel`, `action`, `sender`, and `receiver`; signal data belongs in `value` with the matching `valueType`; signal direction belongs only in `runtimeSignals.emits/listens`
  - public `valueType: "json"` signal capabilities and routes must declare `valueSchema` in the namespaced form `<npm-package>/<schema-key>`; receivers only match JSON signals with the same schema
  - core `valueSchema` ids must use `PHI_SIGNAL_VALUE_SCHEMAS` or `createPhiSharedSignalValueSchema(...)`; do not repeat or concatenate the core package-name prefix outside the signal contract helper
  - `PhiSignalCapability.id`, `PhiSignalRoute.routeKey`, and `PhiSignalRoute.capabilityId` are required v1 ABI fields. `routeKey` is the stable unique identity of one persisted route and must be unique across the owning instance's emit and listen routes. `capabilityId` references one declared capability: a sender capability from `runtimeSignals.emits` inside `signalRoutes.emits`, or a receiver capability from `runtimeSignals.listens` inside `signalRoutes.listens`. Route CRUD and table identity use only `routeKey`; capability dispatch uses only `capabilityId`. Do not use array indexes, full-object equality, `sourceKey`, labels, option values, timestamps, or free routing strings as route identity.
  - Route keys are created centrally. Code-owned presets use explicit stable keys; Builder-created routes use `createPhiSignalRouteKey()`. A route key remains unchanged when the route is edited, published, or its receiver address is remapped.
  - One sender capability may have several explicit routes. Emitting that capability delivers once through every matching route; a first-match lookup is not valid capability dispatch.
  - `PhiSignal.correlationId` is required at runtime and is created centrally by the signal bus/controller when a user interaction starts. Feedback/state-change signals caused by that interaction must keep the same correlation id. Listeners may update local state from feedback but must not implicitly emit another runtime signal from a listen route.
  - `sender` is a concrete address or `null`; it must never be `broadcast`
  - `receiver` is `null`, `broadcast`, or a concrete address: `null` means not wired and no runtime signal should be sent; `broadcast` means an explicit broadcast in the selected `scope` and current runtime context; an address means targeted delivery
  - runtime controllers use the concrete address form `controller:<npm-package>/<controller-key>:<instance-key>`; singleton controllers must use `default` as their instance key, for example `controller:@phis/ui/asset:default` or `controller:@phis/ui/builder:default`; short non-namespaced controller addresses are not valid v1 addresses
  - a runtime module is the selectable plugin boundary, not a controller: it is a namespaced NPM-owned unit with at most one controller definition plus its coordinated Widgets, Layouts, forms, data providers, option providers, Calendar adapters, authoring extensions, and other declared provider types; controllerless modules must contribute a meaningful artifact and must not add a no-op controller
  - every runtime module declares non-empty `title`, `description`, and `category` metadata plus at least one non-empty `icon` or `iconFamily`; Site-owned Area base definitions use the shared Area-base definition helper so their `<Area> Base` titles cannot diverge
  - runtime modules contribute separate server-safe Area-shell, route, and theme preset descriptors; the generic preset-kind registry and multi-target contributions do not exist in v1
  - Area shell composition uses only declared `(ownerModuleId, presetKey)` sources resolved by the central descriptor compiler; `omitRegionTypes` removes complete Region subtrees, and `omitNodeKeys` may reference only source-declared `exportedNodeKeys`
  - composed Area shell descriptors build only their own overlay nodes; cycles, unresolved sources, duplicate Regions, and unresolved graph references are hard contract errors
  - every declared Area has exactly one locked base module and one versioned shell preset; only optional eligible module ids are persisted through `runtimeModules`
  - Area eligibility is immutable catalog metadata validated by the server resolver. Base modules are derived from Area definitions, never appear in optional-module selectors, and cannot be selected, persisted, or removed; optional modules activate only when explicitly selected for that Area
  - controller types and controller instances must never activate a module; controllers are module-owned runtime components used for orchestration, state, data, and signaling after their owner module is active
  - `moduleId` and controller type are separate explicit manifest fields even if their current namespaced strings happen to match; never derive module selection from a controller key or controller addresses from a module id
  - one module owns at most one controller type, while every Widget, Layout, controller, form/provider definition, data/option provider, and Calendar adapter has exactly one `ownerModuleId`; `controllerType`, `controller`, `controllerMountPolicy`, `controllerDefinition`, and `loadController` form an atomic optional contract; a separately activatable controller or lifecycle requires a separate module, and reuse across domains belongs in Core or a separate module, never in multiple ownership
  - concrete controller mounts are either declared by the active module for the area or materialized from CMS structures that require them; shell-owned widgets materialize area instances and page-owned widgets materialize page instances only when the controller's owner module is active
  - widgets/layouts may require several controller types and may wire signals to any compatible controller; requirements and wiring do not change module ownership and must not auto-enable missing modules
  - module-owned providers may serve generic Core widgets, but remain gated by their `ownerModuleId`; contributing a provider does not move its ownership into Core or make it globally active
  - provider-backed visual collections follow `COLLECTIONS.md`: the generic Collection View Widget owns
    persisted presentation, features, source binding, and signals; the reusable Binding owns query and
    controller state; the selected module-owned Provider resource supplies item and integrated-panel
    adapters; and `PhiCollectionViewControl` owns shared presentation. Core and presets must not branch on
    Provider keys, nest Widgets inside the Collection View, or reproduce its self-contained Controls
  - data providers use one namespaced `providerKey` and split serializable module-owned descriptors from executable provider Clients; the Server registry and Flight payload carry only demanded provider keys/descriptors, while executable `loadLive`/`loadAuthoring` edges exist only in immutable Area-local Client manifests; global provider registration and import-side-effect registries are forbidden
  - Table data follows `TABLES.md`: the generic Table Widget owns persisted presentation, source binding,
    CMS identity, and standard signals; the reusable Core Table Binding owns Provider resolution, query
    and mutation state; the selected Table Provider resource owns row identity/schema/validation/domain
    behavior; and the provider-free Table Control owns presentation events. Presets store only
    presentation, source binding, and routes. Core/Builder/presets must never branch on Provider keys or
    add domain Table wrappers
  - direct `PhiTableControl` use is restricted to immutable, already-resolved static rows with no query,
    loading, editing, actions, reordering, drag/drop, Draft, persistence, optimistic state, or Provider
    lifecycle, plus the explicit controlled compound-value Form field mode defined in `TABLES.md`. In that
    mode the complete local row array is one atomic `PhiFormControl` value and has no Provider lifecycle.
    Any other mutable capability requires `PhiTableBinding` and a declared Provider. A domain store or
    controller is not a substitute Binding. Navigation Drafts are mutable persisted resources and must use
    a Navigation Table Provider through the generic Table path; a Navigation-local Table host, editor,
    action layer, or drag/drop implementation is forbidden
  - editable static Table data is a versioned Provider resource with Draft/Published resolution; the immutable Provider implementation is not edited. Generic Table config must not carry a top-level row store or send its complete presentation config to the Provider
  - Table field types express value semantics and must not encode Control presentation. `boolean` uses
    `switch` by default and may select `checkbox`; `enum` uses `select` by default and may select `radio`
    or `segmented`; `enum[]` uses `multi-select` by default and may select `checkbox-group`.
    `boolean[]` is forbidden: single-choice and multi-choice values use stable `enum` and `enum[]` option
    identities, with labels and optional descriptions supplied by the existing Options contract
  - form field, validation, and handler providers follow the same boundary: `formProviders` contains only namespaced serializable module-owned descriptors, while executable providers are composed through an explicitly injected `PhiFormProviderRegistry`; global mutable registration, import-side-effect discovery, and missing-provider fallbacks are forbidden
  - handler-mode Form submission is server-authoritative: the Browser supplies only `formId`, the requested handler phase, and validated values; the Site gateway resolves the Published Form and its active module-owned handler Provider, constructs all transport/target/CSRF metadata from immutable Server catalog data, and rejects inactive owners, missing Providers, mismatches, or Client-supplied execution overrides. The handler Provider declares the closed `credentialPolicy` mode `none`, `site-session`, or Core-only `auth-link`; arbitrary cookie names and credential requests in Form config, CMS config, signals, or request payloads are forbidden. `none` is an anonymous but still trusted Site-scoped gateway request, not an authorization bypass. Credential forwarding identifies a caller but never grants a role; the destination handler must independently revalidate values and enforce Site, session, membership, role, rate-limit, and domain authorization
  - `PhiFormWidget` owns CMS/runtime identity and delegates controlled fields, grid, validation, and
    keyboard behavior to `PhiFormControl`. Form field providers compose Phi Controls only; Widgets and
    Layouts are forbidden inside a Form field tree. Visible submit/reset/cancel actions are ordinary Button
    Widgets outside the Form and reach it through the owning Controller. Direct Ant Design `Form`,
    `Form.Item`, Table, Tree, or field-control imports are allowed only inside the corresponding canonical
    Phi Control adapter, never in feature, Module, Widget, or Form-provider code
  - module-owned Preset Forms are explicit Server Area `catalogEntry.forms` contributions; their `<npm-package>/forms/<form-key>` id uses the owner module package namespace, and global Form registries or import-side-effect discovery are forbidden
  - live runtime may resolve a live implementation only for a demanded provider owned by an active module and present in the current Area Client manifest; Canvas may resolve only a demanded provider whose `authoringMode` permits `read` or `edit` and whose Authoring loader is present in the Builder Client manifest. `executionMode: "static" | "live"` and `authoringMode: "none" | "read" | "edit"` are the only v1 Provider mode fields; `authoringPolicy` is forbidden
  - provider selection and parameter metadata remain available to Builder from the target-Area module descriptors even when the provider implementation is live-only; missing live providers are contract diagnostics, never static-option or cross-module fallbacks
  - module activation happens once per module id, independently of the number of definitions, providers, adapters, or instances of its optional controller type; controller instances must not imperatively import or activate modules or registries
  - the lazily resolved server module manifest contains only lightweight definitions and server-safe runtime/layout/form/provider loaders; it must never import a controller or authoring Client boundary. A generic Client-owned module host receives only active module ids and serializable mount data, then resolves them through the immutable Client loader manifest from generated external build state and performs the selected `React.lazy` or `next/dynamic` imports
  - every installed catalog entry directly declares its complete lightweight widget/layout definitions and lazy Server loaders; catalog construction derives and validates globally unique namespaced ownership from those entries, with no parallel ownership list in the executable module object
  - controller, render, provider, Calendar-adapter, and authoring implementations live in separate Client entrypoints of the same logical module; the generic Client-owned hosts select only implementations demanded by active modules and Canvas composes only active target-Area authoring Clients. `phis-cli` injects immutable build-time Client loader manifests per route Area through external generated build state; they are not mutable registration and must not be reconstructed in Skeleton routes or controllers. Every live Area manifest contains only its own locked base loaders plus applicable loaders eligible for that Area and must not reference another Area's base or Authoring entrypoint. The Builder manifests contain the union needed to author every allowed target Area, but that union never activates target-Area modules in the outer Builder runtime.
  - Area eligibility is declared by immutable package-owned Server contributions and applicable Client manifest projections sharing the same `moduleId` and namespaced artifact keys, then validated into the external build manifest by `phis-cli`. The Server projection binds the matching catalog entry; each Client projection binds only the static loaders the module actually owns. Controllerless modules omit the Controller Client projection entirely. Server and applicable Client projections are physically separate module graphs and must reject duplicate or mismatched ownership instead of silently widening either graph. A module may occur in several eligible Area compositions, but request data must never choose a new contribution or package import.
  - authoring Client resolution is part of the module extension contract: third-party npm modules export their own Server catalog entry and Client loader pair, while `phis-cli` composes installed Area projections and the Builder union without patching Site/Skeleton source. Third-party authoring Clients use `@phis/ui/runtime/authoring-client`. Do not add module-specific branches to the generic host, mutable global registration, a server-to-client loader-function transport, or request-controlled route eligibility
  - widget/layout descriptors carry their complete lightweight definition; layout definitions are serializable, layout plugins reuse them and add only parser/serializer/renderer behavior, and Builder Picker/Inspector metadata comes only from the exact active Canvas module set
  - a module may declare one lazy client UI provider for its owned render subtree, for example a Material, Radix, or package-specific theme/context/portal boundary; it must not wrap the application root, mutate another module's theme, install a second signal bus, or expose module-private context as a cross-module API
  - module UI providers must scope CSS, resets, popup/portal containers, and theme tokens to the module subtree or Canvas sandbox, clean up on unmount, and preserve the standard Phi config, render, control, signal, and scaffold contracts regardless of the internal UI library
  - The `core` Module is not installed or selectable. It owns runtime infrastructure and generic Form primitives; domain form providers and handlers remain owned by their contributing modules
  - the required Core Runtime Controller is site-owned and mounted exactly once by the shared application Root Layout above all Area layouts at `controller:@phis/ui/core:default`; it remains mandatory, Site-mounted, and outside optional controller/module selection. It is a runtime adapter and state snapshot emitter, not a persistence or domain source: resolved SSR/Page/Theme/Locale state is supplied to it, and Builder/Theme/Page persistence remains with the owning controller and server path
  - Core Runtime Controller receive-and-mount-snapshot channels are `pageTitle/change:string`, `pageDescription/change:string`, `openGraphImage/change:image`, `canonicalUrl/change:string`, `theme/change:json`, `themeMode/change:boolean`, and `locale/change:string`; optional description, image, and canonical metadata additionally support `clear:none`. Theme JSON requires a namespaced runtime-theme schema; `themeMode` selects only the live light/dark projection and does not persist Theme configuration; locale values must be validated against the resolved Site locale set
  - Core Runtime Controller receive-only transient channels are `notification/activate:json` and `message/activate:json`. Message values contain only `level`, `content`, and optional non-negative `durationSeconds`; Notification values additionally allow the closed `placement` and `showTimeoutProgress` fields. They invoke the shared application UI service and are never persisted, rebroadcast as state, or exposed as free Ant Design props. Inline Alerts and anchored Confirms remain local presentation Controls and never use those global channels. Its only Page-context snapshot projection is `pageMeta/change:json` through the current Page partition
  - Phi Controls encapsulate supported Ant Design primitives. When a Phi Control exists for a function, first-party and third-party consumers must use it instead of importing the matching Ant Design primitive directly. `PhiAlertControl` owns inline status presentation; `PhiConfirmControl` owns local anchored confirmation and may await an asynchronous confirm callback. Neither is a Widget, provider, controller, persisted config, or Runtime signal endpoint. Missing reusable presentation capability requires operator-approved Core contract extension, not a direct Ant Design escape hatch or arbitrary prop passthrough
  - guided UI learning uses `PhiTourControl` and the `TOURS.md` target contract; feature code must not
    import Ant Design `Tour`, resolve targets through DOM selectors, or introduce Tour-specific address
    and event families
  - Builder Pages and Shells canvases are module sandboxes: they resolve exactly the target Area base module plus its persisted optional modules, never inherit or union the outer Builder Area's active module registry, and replace their active registry when the target area changes
  - Canvas sandbox module resolution is server-owned and catalog-driven; the Builder controller may select the target area and trigger refresh, but must not import modules itself. Target controller instances, when a render mode needs them, mount only inside an isolated sandbox runtime/signal context
  - runtime renderers must not own fallback/default registries; a missing provider, disallowed type, missing loader, or failed node renderer must stay localized to the affected CMS node and render the shared non-renderable diagnostic block and log the issue, never import or borrow a global registry; `missing-module` is represented only by that block and log, while other renderer failures may additionally raise a deduplicated notification
  - invalid module manifests, duplicate ownership, invalid persisted module selections, and other module-catalog ABI violations remain hard errors; node-level diagnostics apply only after a valid catalog/module set has been resolved
  - every placeable widget/layout declares explicit `runtime`, `preview`, and `authoring` render policies; preview/authoring may explicitly reuse another mode or a declared visual skeleton/placeholder, but missing renderer behavior must never trigger an implicit fallback
  - the shared Authoring/Builder module owns Canvas and scaffold chrome; plugin modules may contribute specialized editor bodies, tools, or layers but must not duplicate the scaffold
  - Canvas authoring never mounts target-Area controllers: target modules supply definitions, capabilities, lazy authoring implementations, and explicitly static authoring providers only; live controllers, non-static data providers, and persisted runtime signal routes activate only in live runtime
  - Canvas selection, Inspector/Wiring opening, slot picking, and other Builder-owned authoring operations use the centralized Builder authoring/store operations; they must not escape the isolated Canvas by broadcasting target-runtime signals or by adding a signal-partition bridge
  - Builder-scaffold authoring providers are composed explicitly with the target Area's static authoring providers for the Inspector section subtree; they must not be resolved from the target module set or borrowed through an outer provider registry
  - `renderEditor()` and `renderEditorTools()` receive the same Builder-only authoring context; widget-specific tools may request atomic config patches through `authoring.updateConfig`, but must never write Builder stores, construct controller addresses, or persist drafts themselves
  - widget-specific structural editing such as Command Toolbar add/remove/reorder belongs in `renderEditorTools()`; Canvas owns applying the patch, history, rerendering, and signal-route lifecycle, while normal widget runtime signal emission stays disabled
  - dynamic signal subcontrols are declared through `signalSubcontrols` collection metadata on the widget definition; Inspector, Wiring, and route cleanup must resolve them generically and must not branch on widget type
  - workspace widgets render their real interactive workspace only in `runtime`; their `preview`/`authoring` policy must use a side-effect-free visual skeleton that does not mount nested controllers, emit signals, mutate drafts, or create a recursive canvas
  - use native statically analyzable `import()` loaders for server implementations and explicit Client-owned `next/dynamic`, `React.lazy`, or cached selected-import boundaries for client implementations; do not dynamically import a Client Component from a Server Component and assume client code splitting
  - every Area route host uses an immutable server-safe catalog containing exactly the modules eligible for that route Area; the Builder catalog contains the union required for every Canvas target Area. The current Area's required, locked, and persisted `runtimeModules` set still defines what is actually loaded and active
  - do not narrow an Area catalog to its current or default selection. Its Client manifest mirrors the same eligibility boundary, while the Builder-only union exists solely for Canvas target-Area resolution. Physical route boundaries enforce client graph isolation and never replace request-time module activation policy for modules allowed in that Area
  - target-v1 tables bind to one module-owned runtime data provider with `kind: "table"` through `{ providerKey, resourceKey, params? }`; Provider resources own row identity, typed field schema, validation, queries, sorting, pagination, mutations, and domain data; the reusable Core Table Binding owns Provider resolution and request/edit reconciliation; and the Widget owns CMS config and signal routing
  - table widgets contain only declarative presentation, generic features, Provider-resource binding, initial query, and signal routes; fixed rows are editable static Provider resources. Direct API URLs, server-action names, controller addresses, top-level row stores, and Provider-specific branches are forbidden
  - mutable Table binding params are declared semantically by Provider resource `bindingFields`, presented and ordered by Widget `features.tools.bindingFields`, and changed only through the Binding; Provider actions own scope, value type, intent, confirmation policy, business availability, authorization, and validation, while Widget config owns labels, icons, display/mode, confirm text, placement, and ordering
  - non-tabular item sets bind to a module-owned runtime data provider with `kind: "collection"` through `{ providerKey, resourceKey, params? }`; collection providers own remote queries and mutations while controllers may retain only transient selection/filter/signal coordination
  - collection renderers stay declarative and provider-neutral; upload transports may remain specialized, but collection reads, deletes, and metadata updates must not bypass the active provider
  - genuinely specialized widgets declare hidden provider dependencies through `requiredDataProviders`; a missing or inactive provider is a visible contract error, never a controller-signal or direct-fetch fallback. Constructing a fixed generic Table/Form/Collection binding does not make a Widget specialized
  - provider-key constants stay in owner-scoped modules; do not recreate a shared object that exposes Builder, Admin, Editor, or optional-module keys to Core/Public Client imports
  - Widgets, Layouts, and objects may declare required controller instances, but they must not mount runtime controllers themselves; the generic runtime controller host is the only controller mount path
  - public v1 signal scopes are exactly `widget`, `layout`, `region`, `page`, `area`, and `site`; `runtime` is an execution environment and Registry partition, not a signal scope
  - public v1 signal addresses are exactly `cms:<instanceId>[:<subcontrolKey>]`, `region:<regionKey>`, and `controller:<npm-package>/<controller-key>:<instance-key>`; Widget/Layout kind is CMS Registry metadata. Do not introduce `widget:`, `layout:`, `object:`, `runtime:`, `site:`, `area:`, `page:`, `slot:`, or `block:` address families
  - controller addresses are part of the same `PhiSignalAddress` contract as CMS and Region addresses; do not introduce a second controller signal contract or controller-local routing shape
  - concrete instance signal routes are persisted with the CMS widget/layout/object instance config, not in `runtimeSignals`; `runtimeSignals` declares capabilities only
  - approved signal actions are exactly `activate`, `change`, `toggle`, `start`, `stop`, `clear`, `open`, `close`, `reload`, `flush`, `filter`, and `drop`
  - command names such as `save`, `publish`, `preview`, `undo`, `redo`, `reset`, `createPage`, and `deleteSelected` are channels with `action: "activate"`, not signal actions
  - focus state uses `focused/change` with boolean values, effects use `effects/start|stop|clear`, drag uses `drag/start|change|stop`, and committed drop uses `drop/drop`
  - runtime signal receivers must register while mounted and unregister on unmount; a receiver is active only while it belongs to the current runtime context such as the current page, area, or region
  - CMS renderable-block routing uses the single concrete receiver family `cms:<instanceId>` and `cms:<instanceId>:<subcontrolKey>`; Widget/Layout kind is registry metadata and must not be encoded as a second address family
  - Area receiver registries remain isolated and signals must never travel laterally from one Area into another. The required globally mounted, site-owned Core Runtime Controller at `controller:@phis/ui/core:default` is the only v1 Site-scope endpoint: active Area/Page instances may target it explicitly and its outputs may address only receivers registered in the current active Area/Page context. Builder Canvas sandboxes use separate Registry partitions and must never reach the live Site endpoint; Site-scope broadcast is forbidden
  - `receiver: null` is not broadcast; use `receiver: "broadcast"` for explicit broadcast routing
  - `scope` is the signal routing scope; `scopeKey` must not be used as a second signal scope or routing fallback and may only name a concrete transient store, provider, or collection namespace
  - `slot` is not a public v1 signal scope or address family; slot state is routed through the owning Layout channels such as `activeSlotIndex` or `activeSlotKey`
  - standard renderable-block channels include `visibility`, `enabled`, `size`, `minSize`, `maxSize`, `background`, `border`, `shadow`, `zIndex`, `opacity`, and `effects`; `background` and `border` use structured `json` values, `shadow` uses CSS `box-shadow` strings, `zIndex` uses numeric values, `opacity` uses a numeric `0..1` CSS opacity value, and `effects` uses `start`, `stop`, or `clear`
  - do not add or revive `payload`-based routing, `payload.key`, legacy signal fallbacks, custom channels, or unapproved action strings to carry new meanings
- Never drop or ignore existing route path segments when a thin wrapper already passes them through the CMS root/page resolution flow.
- Keep Area/Page shell behavior aligned with the documented split between root Page, shell, Region, Layout, and Widget responsibilities.
- Prefer the established preset/renderer structure over ad hoc special cases for every Area.
- Before introducing a new interface, type, contract shape, or config family, first check whether an existing one can be reused, extended, or composed. If reuse is possible, prefer it. If not obvious, ask before adding a new surface.
- Do not build legacy compatibility layers, shadow contracts, or v1 shims. v1 should use one clear contract path and update callers directly instead of preserving parallel old and new shapes.
- Do not duplicate a contract shape just because a new feature feels convenient. Extend the existing shared base contract where possible instead of adding another parallel family.
- Do not add extra wrapper `<div>` layers, alignment shims, or centering helpers when the existing Layout and slot contracts cover the requirement.
- If a Layout or alignment looks wrong, inspect the actual render and slot contract first; do not patch it with new structural wrappers or ad hoc helper elements.
- Even for small React list/render helpers, do not introduce an extra wrapper `<div>` only to carry a `key` or simple layout prop when the existing top-level rendered element can own that `key`, class, or style directly.

## Package contract

- `@phis/ui` is a workspace package consumed through `/opt/projects/workspace` with `workspace:*`.
- Keep `react`, `react-dom`, `next`, `antd`, and `@ant-design/icons` as `peerDependencies`.
- Do not introduce a second active runtime installation of React, Next.js, Ant Design, or Ant Design icons inside this package.
- Do not use `file:` dependency workflows or standalone package installs inside this repository as the normal UI development path.
- The long-term target is a real TypeScript / TSX component library, not an indefinitely hand-maintained `js + d.ts` package.
- Prefer typed source components and explicit package exports over ad-hoc file-level sharing.

## Routing and Composition

- The real Next.js App Router composition stays in each consuming site repository.
- For standard CMS pages, prefer thin site wrappers:
  - `app/[root]/layout.tsx`
  - `app/[root]/[[...path]]/page.tsx`
- `root` should resolve to either a public locale or a controlled CMS area key such as `app`, `admin`, `builder`, `editor`, or `accounting`.
- Those root classes are mutually exclusive. Public routes use `/{locale}/...`; Special Areas use
  `/app/...`, `/admin/...`, `/builder/...`, `/editor/...`, or `/accounting/...` and must never carry a
  locale prefix.
- Canonical CMS Areas are exactly `public`, `app`, `admin`, `builder`, `editor`, and `accounting`.
- `public` is the locale-routed public Site; `/public` is only its explicit technical route. `app` is the authenticated
  Site application. Auth, commerce, and site-specific behavior are modules, not Core Areas.
- If an area has no dedicated code-owned shell preset in `phi-shared-ui`, it should fall back to the public shell preset on read.
- Non-staff CMS areas `public` and `app` should fall back in this order:
  - own DB-backed shell instance
  - public DB-backed shell instance
  - area-appropriate code-owned shell preset
- That fallback does not change persistence ownership: saving in an area must still create or update that area's own revision-backed shell state.
- Staff role to area mapping must follow this contract:
  - `Admin -> /admin`
  - `Developer -> /admin`
  - `Builder -> /builder`
  - `Author -> /editor`
  - `Publisher -> /editor`
  - `Supporter -> /app`
  - `Accountant -> /accounting`
- `builder` is the structural and design-authoring area.
- `editor` is the content and publishing area.
- `admin` is the shared control-plane host; contribution policies distinguish Admin-only surfaces
  from Developer tooling.
- If the page does not exist in the CMS backend for `site + area + path`, return `404`.
- Site `layout.tsx` and `page.tsx` should stay thin and call shared CMS entry points.
- `NEXT_INTEGRATION.md` is normative for the Site/Skeleton boundary. The Skeleton owns physical Next.js
  route registration and deployment config only; reusable root, Area, slot, bridge, proxy, metadata,
  and Client-manifest composition belongs in the separate `@phis/ui/next/*` entrypoints.
- Keep every Area's Server bridge and Client boundary in physically separate package entrypoints. Do
  not add an index or runtime Area switch that statically reaches all manifests.
- `PhiCmsRootLayout` owns root resolution, locale/special-area normalization, the stable area shell, access boundary, area-level presets, and stable shell slot placement.
- `PhiCmsRootPage` should primarily resolve and supply page payload for the shell's page-capable slots.
- `PhiCmsRootSlotPage` is the shared renderer for one page-owned shell slot and is the intended target for thin site-owned parallel-route wrappers.
- Shell slot placement and page payload are separate concerns:
  - the shell owns placement, sticky behavior, offset handling, z-index, and shell-relative sizing
  - the page owns the payload tree and region config for page-capable slots
- Under a stable `[root]` layout, page-owned shell slots such as `header_bottom`, `hero`, `sider_right`, `footer_top`, and `drawer_right` should be refreshed through explicit App Router parallel-route wrappers instead of resolving them directly inside the stable layout render. Do not add a client fetch workaround for that ownership split when a thin parallel-route wrapper can keep the contract clean.
- Site `layout.tsx` and `page.tsx` should stay thin wrappers around shared CMS rendering.
- Shared CMS resolution must keep two explicit runtime classes:
  - fast published-live path for normal live requests
  - authoring/preview path for builder and `revision=<id>` requests
- Normal published-live requests must not pay draft-preview or builder overhead.
- `/public` and `/app` are the primary live-performance paths and should stay published-only unless an explicit preview request is active.
- Authoring and preview requests may pay extra cost for cookies, role checks, draft reads, and additional request metadata.
- Layout and page resolution must consume one shared normalized request context for the active request.
- Site-local wrappers and proxies may transport normalized request metadata into shared code, but they must not re-implement CMS area/page resolution, redirect rules, or preview semantics.
- Shared `Phi*Shell` components in `@phis/ui` own the reusable visual shell implementation, not the Next.js route registration itself.
- Shared area regions should be modeled through the CMS region contract and rendered through shared region containers, not through parallel legacy region families.

## Shared UI scope

- Keep components generic and site-agnostic.
- Keep site branding and logo treatment in each consuming site repository.
- Shared component directories must reflect responsibility:
  - `components/forms/*` for low-level form building blocks
  - `components/layouts/*` for CMS layout nodes, structural composition, and configured container chrome
  - `components/widgets/*` for high-level reusable flow widgets
  - `components/modals/*` for modal containers
- For widgets, keep the runtime split explicit:
  - `components/widgets/config/*` for server-safe widget definitions and parsing metadata
  - `components/widgets/server/*` for live/server render wrappers
  - `components/widgets/client/*` for client-safe widget bodies or lightweight client wrappers
  - `components/widgets/builder/*` for `renderEditor()` only
- For third-party widget authoring, the required modeling path is:
  - one shared definition in `components/widgets/config/*`
  - one live/server plugin in `components/widgets/plugins/*`
  - one builder plugin in `components/widgets/builder/*`
  - optional shared bodies in `components/widgets/client/*` and `components/widgets/server/*`
- Third-party authors should not invent parallel plugin shapes.
  - `config/*` is the metadata and parse source of truth
  - widget-owned content persistence metadata such as `contentBinding` belongs there too
  - `plugins/runtime-modules/*-widgets.ts` are the sole installed Widget catalog and the owner-scoped
    live/server loader manifests; do not add a global Widget definition list or export registry
  - `plugins/runtime-modules/client-authoring-widgets/*` are owner-module-scoped lazy builder/editor catalogs; the generic Canvas loader may reference only the module catalog, never one global widget implementation map
  - Builder Picker/Inspector metadata comes from definitions carried by the resolved active Runtime module set
- Server preset and picker paths must build widget metas from definitions carried by the owner-scoped
  Runtime module catalog; they must not reconstruct a global config registry.
- Never import the client builder registry or `components/widgets/builder/*` into server preset, shell, or picker code.
- Interactive client inners must live only in explicit client implementation directories such as `components/layouts/clients/*`, `components/widgets/client/*`, `components/widgets/client/shared/*`, and `components/modals/clients/*`.
- Shared form architecture must separate low-level `*Form` components from high-level `*Widget` components.
- `*Form` components are presentational building blocks. They render fields, local validation, and UI state from props, but do not own site-aware translation loading, legal-link composition, endpoint selection, or widget-level business flow.
- Public form building blocks may be consumed by shared widgets, site widgets, and third-party widgets as long as they stay on the low-level form contract.
- `*Layout` components are the structural integration point for CMS page trees. Public `*Layout` components should default to server components and delegate browser interaction to internal `components/layouts/clients/*` parts when needed.
- Naming contract:
  - `*Layout` means structural composition plus optional configured visual treatment
  - there is no parallel CMS container kind, directory, registry, parser, renderer, or type-key suffix
- `*Widget` components are the default integration surface for consuming sites. Public `*Widget` components should default to server components that load shared labels/data and delegate browser interaction to internal `components/widgets/client/*` parts, including shared helpers under `components/widgets/client/shared/*`, when needed.
- `PhiModalControl` and `PhiDrawerControl` are provider-free Core presentation adapters. Persisted Modal
  and Drawer workflows use Area-/Page-owned CMS Overlays with explicit Layout roots; domain Widgets and
  public feature components must not privately mount structural Modals or Drawers.
- Internal `clients/*` implementations are not public package surface. Consuming sites import public Phi
  Widgets, Controls, or the CMS Overlay renderer according to the documented ownership boundary.
- Immediate Pickers use only their canonical `Phi*Control`; that Control privately adapts a native
  UI-library primitive or composes `PhiPopoverControl`. No Picker consumer may depend on direct Ant Design
  Picker props, types, events, or values, and a Picker never composes a Modal or Drawer. One-transaction
  workspace prompts and editors may compose a non-persisted Core Overlay Control when they are not
  persisted or Form-backed workflows. They remain Controls, never synthesize CMS Overlay identity, and
  must not be mislabeled as Pickers.
- Widgets and layouts must prefer the documented default contract first. Do not introduce overrides for padding, spacing, alignment, sizing, or visual placement unless the operator explicitly asks for that delta.
- The same rule applies to `style`: treat explicit `style` overrides as opt-in only, not as a default escape hatch for layout tuning.
- If a consuming site has to pre-load shared labels, shared navigation data, or shared config just to render a widget/modal, the shared component boundary is usually too low-level and should be raised.
- Shared widgets that need both runtime data and browser interaction should follow a server-wrapper/client-inner split.
- Shared layouts that need both runtime data and browser interaction should follow the same server-wrapper/client-inner split.
- The server wrapper is responsible for loading site/theme/runtime config and filtering it down to a small widget-specific config slice.
- Widget rendering must stay split by runtime:
  - the active owner module's server loader owns `render()` and `renderPreview()`
  - the active owner module's authoring loader owns `renderEditor()` only
  - `renderPreview()` is the safe live-like preview path used for snapshot/server preview and must not be repurposed as editor scaffold output
  - `renderEditor()` is the single builder authoring/scaffold path and must stay client-safe
  - the shared widget editor scaffold owns default editor inertness, selection/hover chrome, debug outlines, and common editor tools; normal widget renderers must not reproduce those concerns with local `disabled`, `signalsEnabled={false}`, pointer interception, or type-specific wrappers
  - a builder plugin supplies a client-safe editor body either explicitly or through a shared builder-renderer adapter; the client builder must never fall back to the server-owned `renderPreview()` implementation
  - specialized widgets may provide interactive authoring output through `renderEditor()` and widget-owned chrome through `renderEditorTools()`, but the generic scaffold must place those extensions without branching on widget type
  - a full interaction-covering editor layer is valid for Widget leaves only; Layout scaffolds must keep nested slots and descendant scaffolds reachable
- Plugin infrastructure is not a widget implementation concern.
  - owner modules and lazy descriptors belong under root-level `plugins/runtime-modules/*`
  - metadata-only registries belong under root-level `plugins/registries/*` while their consumers are migrated to active module metadata; they are not implementation extension points
  - shared slot/render runtime helpers belong under root-level `plugins/runtime/*`
  - shared plugin adapter/factory helpers belong under root-level `plugins/factories/*`
  - do not place builder/server implementation registries inside `components/widgets/*`
  - do not place shared renderer-owned slot-policy helpers inside `components/layouts/*` or `components/widgets/*`
- Third-party packages extend the immutable build-time runtime-module catalog through `phis-cli`-generated
  external build state. Do not patch Skeleton source or add ad hoc arrays or parallel
  widget/layout/controller/provider implementation registries.
- Do not pull async server wrappers, server-only data loaders, or SSR-only widget implementations into an authoring loader just to make the editor show a fallback or shared live widget.
- Viewer authorization must use provider-scoped `viewer.roleClaims` and the single access-policy
  evaluator from `ACCESS.md`; direct Base/Custom flag branches and feature-permission arrays are
  forbidden.
- A surface whose capabilities differ by role does not branch on the role. The owning controller
  projects a permission from a named policy and the surface binds `disabledWhen` conditions to it, per
  `ACCESS.md` section 6.
- Client implementations should receive only the widget-relevant config they need; do not pass raw site/theme JSON into client components.
- Boundary rule:
  - Do not treat Ant Design usage as an all-or-nothing architectural rule.
  - Shared shell/region infrastructure that renders in the RSC path should stay server-safe and must not rely on Ant Design imports that pull client-only context or css-in-js runtime internals into that path.
- Widgets, forms, interactive surfaces, and other clearly client-bounded UI may use Ant Design normally.
- `components/widgets/built-in/*` is reserved for special non-standard widget runtime paths that are intentionally not normal plugin-owned widget implementations.
  - examples: shared form bridge widgets, confirm flows, structure workspace internals, preview fallbacks
  - do not use `built-in/*` as a staging area for widgets that are merely not migrated yet
- Layouts are defined by their slot contract and behavior, not by a required dependency on Ant Design `Flex`/`Row`/`Col`.
- If a widget renders rich UI from parsed server data, the server wrapper must pass a serializable view-model into a dedicated client component. Do not build Ant Design subcomponent trees such as `Typography.*` directly inside that server wrapper path.
- Shared styling should default to Ant Design primitives and Ant Design theme tokens.
- In client components, do not hydrate raw token-derived visual end values such as `color`, `background`, `border*`, or `boxShadow` directly through inline styles when a CSS variable or class can express the same result. Browsers normalize these values and can trigger React hydration mismatch warnings.
- Use inline styles mainly for geometry and per-instance layout values such as width, height, spacing, transforms, and positioning.
- Hardcoded colors, radii, typography values, or bespoke visual tuning are exceptions and should be introduced only on explicit request or when the required result cannot be expressed cleanly through Ant Design tokens/components.
- For CMS-driven pages, `@phis/ui` is responsible for resolving internal/shared namespaced widget type keys into shared widget implementations.
- Site-custom CMS widgets must pass through a fixed site bridge component; do not push React component names or import paths into backend contracts.
- Ant Design `ConfigProvider` must stay limited to Ant Design theme/component configuration. Do not use it as a transport layer for Phi site/runtime config.
- Shells orchestrate slots; they must not pass widget-specific site-theme modes as bespoke props when those modes belong to the shared site-config contract.
- Widgets that do not need site/theme data should not load it.
- If a config field is absent, widgets may use documented internal defaults, but they must not trigger hidden replacement fetches for site/theme/runtime config.
- Complex widgets may fetch their own domain data, for example tables, records, news, or product data. They must not fetch site/theme/runtime config on their own.
- Shared CMS rendering must enforce this tree shape:
  - area preset region
  - exactly one root layout node per active region
  - nested layout nodes
  - content widgets as leaves only
- Content widgets must never be mounted directly at region level.
- Area presets own the default region set for an area.
- Page records currently provide payload for `hero`, `header_bottom`, `sider_right`, `footer_top`, `drawer_right`, and `content`.
- In `/builder/pages`, workspace chrome above the page canvas is not the selected page's `header_bottom`; the selected page `header_bottom` remains a normal page-owned CMS region with its own root tree.
- `hero`, `header_bottom`, `sider_right`, `footer_top`, `drawer_right`, and `content` are page-owned payload channels, but their placement belongs to stable shell slots.
- Page-owned Drawer content may use the page-owned `drawer_right`/`PhiCmsRegionType.Drawer` Region. Builder Inspectors are different: their three Area-owned Drawer Overlays mount directly from the resolved Builder Area `overlays[]` collection and never occupy a hidden Region or Layout slot.
- Builder chrome has fixed responsibilities: the Builder workspace controller is the single headless controller owned and mounted by the active Builder module; it owns target-Area selection, Inspector field changes, wiring-table services, and Inspector Overlay orchestration. A regular declaratively routed `select-box` Widget presents target-Area selection, `builder-mode-switch` presents the visible mode control, the Region/Layout/Widget Inspector section Widgets render only their declared section, and `builder-chrome-controls` controls chrome visibility/state through signals. No Inspector-host Widget, controller type, signal address, or lifecycle is permitted.
- Cross-workspace save, publish, reset, review, live-preview, and Inspector open/close orchestration belongs to the Builder workspace controller or page/workspace controllers, not to Inspector section Widgets.
- `content` is the only truly page-internal region in the target contract.
- Pages must not redefine the outer area shell through their own region sets; they only fill the shell's page-capable placeholders.
- Controlled page-level slot injections into area-owned regions are a planned contract when the area contract explicitly exposes those slots, for example `header_main.actions`.
- `allowedPageSlotInjections` is currently metadata only; injection merge behavior is not implemented yet.
- Define stable shared interfaces for region/preset data before wiring DB payloads directly into renderers.
- Shared types should carry the canonical contract for region key, region config, resolved region shape, and area preset shape.
- Every Layout, Widget, Overlay, and resolved Navigation item instance has exactly one required canonical `PhiCmsInstanceId`: an opaque 96-bit value serialized as exactly 16 Base64URL characters. Numeric CMS node IDs, UUIDs, and parallel runtime identity fields are not part of the target v1 ABI.
- Codec v1 uses one version/origin header byte, one explicit closed domain byte (`area`, `page`, or `navigation`), six bytes for the safe 48-bit owning Draft revision id, and four bytes for the Draft-local sequence. The complete id is always handled as bytes/Base64URL text, never as one JavaScript `number`. This is the v1 layout; do not add a legacy reader for the earlier pre-domain draft format.
- Every Area, Page, or Navigation Draft persists one monotonic `nextNodeSequence` for its instances. Deleted values are never reused; array length, maximum current node id, timestamps, random values, UUIDs, and per-node-type allocators are invalid. Concurrent Draft saves require revision/version conflict detection.
- Draft, preview, published runtime, signaling, history, move, and persistence use the same `instanceId`. Publish validates the revision and changes revision state/pointers only; it must never remap CMS instance identities.
- Structural references use `PhiCmsInstanceId` as well: layout parents and Page/Region root-layout references point to the target layout instance. Runtime signal addresses use `cms:<instanceId>` and `cms:<instanceId>:<subcontrolKey>`.
- The central CMS instance creator/codec is the only authority that may create `instanceId` values, increment Draft sequences, materialize templates, duplicate nodes, or remap portable imports. Third-party widgets, layouts, modules, presets, renderers, and authoring tools must never generate ids or assemble concrete CMS nodes themselves.
- Manually inserted or duplicated instances receive the next id from the owning Area, Page, or Navigation Draft revision plus its shared sequence. The first mutation of an in-memory preset or resolved Navigation surface creates the owning Draft before adding an instance. Move and config edits preserve the existing id.
- Area-shell, route, and theme presets are distinct descriptor families. Every descriptor has one stable `(ownerModuleId, presetKey)` identity and a positive integer version; one route preset belongs to exactly one Area, one stable Area-local `pageKey`, and exactly one effective normalized path. A route may declare that path directly or declare an explicit Area-owned route mount plus a normalized mount-relative path. `pageKey` is the Builder/Draft identity and must never be derived from the route path; duplicate page keys within an Area are invalid.
- Area route mounts are explicit exported injection points, not collision-driven behavior. Each mount binds one stable key and base path to an exported href-less navigation container. Mounted route paths are materialized as `<basePath>/<module-segment><relativePath>`, where `<module-segment>` is the complete runtime module id with the leading scope marker removed and package/module parts joined by `+` (for example `@acme/status/auth` becomes `acme+status+auth`). `+` is reserved and invalid inside those identity parts. Active-route collision checks run after mount expansion.
- Navigation placement never changes a route path. Overlays may reorder or reparent mounted contributions, tombstone an Area-owned container and thereby hide its remaining subtree, or explicitly move a child out of that hidden subtree. Tombstoned source items remain visible but disabled in Builder navigation authoring.
- Preset-derived instances declare stable preset-local node keys. The central codec derives their identity from `(contractVersion, domain, ownerModuleId, presetKey, nodeKey)`; preset versions, Site, concrete Area key, path, renderer kind, and catalog order never participate.
- Navigation descriptor `itemKey` values are package-owned compile/injection anchors only. Resolved items, overlays, placements, parents, tombstones, authoring rows, and persisted Site Navigation data use Navigation-domain `PhiCmsInstanceId` values. Site-authored items are allocated centrally from the owning Navigation Draft and its monotonic sequence.
- Route descriptors permit exact paths or at most one whole-segment `:id`. Catch-alls, optional segments, regexes, arbitrary match callbacks, multi-target descriptors, and route plugins are invalid v1 ABI.
- The metadata-only descriptor compiler validates Area base ownership, route-mount exports, shell versions, route versions, route syntax, active-set collisions after mount expansion, theme identity, and shell composition without importing React or executable renderers.
- Every Theme descriptor declares its required `themeKey` and `title` plus an optional `description`. Theme discovery and selection read only active module descriptor bindings; import-side-effect registration and parallel first-party registries are invalid.
- Builder Theme selection distinguishes immutable module preset choices from the concrete Site-owned Theme. The Site choice uses the reserved `site:<siteKey>` value and the Site key as its label. It is selected exactly when the Theme scope has a Working Draft or Published revision pointer; clients must never infer Site ownership by comparing Theme payloads with presets. A preset remains persisted provenance and a reusable apply action, while the concrete result participates in the normal Site Theme Draft/Publish lifecycle. Selecting the Site choice restores the current Site-owned snapshot. Unknown selection strings are ignored as invalid input and must never resolve through a default-preset fallback.
- Draft and Published ownership belongs to the concrete target, never to the preset. Different target Areas may independently draft, publish, and reset the same preset; reset uses the currently installed preset while existing Draft and Published snapshots remain unchanged by later preset code updates.
- Widget/layout type does not participate in instance-address resolution. Multiple instances may share one type, so type-based disambiguation is invalid.
- Raw node keys may never cross preset/module contribution boundaries. Cross-contribution composition uses declared slots, exported node references, or wiring descriptors that the central instantiator resolves after all contributions are known.
- Duplicate node keys inside one preset, duplicate active-context ids, invalid 96-bit encodings, unresolved references, and collisions are hard contract errors. Do not add compatibility IDs, negative/positive aliases, collision retries, or implicit publish remapping.
- In v1, prefer explicit contract changes over compatibility shims: do not add legacy or fallback code paths unless the operator explicitly asks for them. ABI breaks are acceptable when they keep the contract coherent.
- Area/page resolution must obey this visibility contract:
  - every area resolves only its own DB-backed pages or explicit area-owned fallback pages
  - no area may resolve pages from another non-public area
  - public pages and public shell roots do not auto-supply other areas
  - explicit area-owned fallbacks such as admin dashboard or admin users/logs stay local to that area
- Widget-instance behavior/config must live on widget nodes in revision `tree_json`, not in `site.theme.widgets.*`.
- If a widget persists canonical CMS content through `content_id`, its shared definition must declare that contract through `contentBinding`.
- Builder write payloads must forward `contentBinding` as explicit metadata; `phi-server` must not branch on concrete widget `typeKey`s when a declarative content-binding contract is available.
- Layout and widget type IDs must be defined in central registry constants, not hardcoded ad hoc inside component files.
- Keep separate central registries for layout types and content/widget types.
- Add or maintain a duplicate-ID validation check so collisions fail fast.
- Every Layout owns topology plus optional visual config through one plugin and render path.
- `*Layout` types declare:
  - named slots or sequential `slots[]`
  - gap
  - alignment
  - distribution
  - width/height/min/max box constraints
  - optional padding, background, border, radius, shadow, and semantic effect
- Layout defaults must be used first. Do not override layout padding, alignment, or style just to make a screen "look right" without an explicit request to do so.
- Preview and live Region containers render a border only when the Region config explicitly provides `border`. Missing or `null` Region borders are visually neutral; family-specific separator defaults are forbidden. Builder Canvas/Editor scaffold outlines remain separate authoring chrome and must not leak into preview or live rendering.
- The shared Layout `borderRadius` value and the Border control's four corner-radius fields are two views of the same effective chrome. Inspector controls normalize the shorthand and explicit per-corner overrides to the rendered value.
- `*Layout` types must be visually neutral by default:
  - transparent
  - no background
  - no border
  - no shadow
  - no glass/blur treatment
  - no implicit inner padding
- `*Layout` types must not add implicit inner slot padding for arbitrary child content.
- Slot occupancy must use one shared contract for all renderable slot children.
  - layouts
  - widgets
- The shared slot-size vocabulary is:
  - `intrinsic`
  - `fill-inline`
  - `fill-block`
  - `fill`
  - `fixed`
- Default slot occupancy depends on the child family:
  - layouts default to `fill/fill`
  - widgets default to `intrinsic/intrinsic`
  - concrete widget/layout definitions may override their own family default
- Parent layouts own the interpretation of that contract because they know the slot geometry.
- Renderers may derive CSS classes and base sizing styles from the declared slot policy, but they must not guess policy from DOM shape or concrete widget/layout type checks.
- Do not hardcode renderer special cases such as `if widgetType === ... then fill`.
- Anchoring is layout-owned and should only affect axes that remain intrinsic under the declared slot-size policy.
- Public Layout component contracts should not use free-form `children` as the primary slot API.
- Named layouts should use explicit slot props only for genuinely semantic sides such as `left`, `middle`, or `right`.
- Single-slot layouts should use positional slots, for example `slots[0]`, not a named alias such as `defaultSlot`.
- Sequential layouts should use `slots: ReactNode[]`.
- If a reusable shared container needs inner padding, background, border, radius, shadow, or glass treatment, configure those fields on the Layout itself.
- Layout type keys are exactly `<plugin-key>/<layout-type>`; a presentation suffix and compatibility reader are forbidden in v1.
- Canonical Layout defaults are visually neutral. Optional creation presets materialize normal config and are never persisted as preset identity.
- Regions may independently configure `padding`, `paddingTop`, `paddingRight`, `paddingBottom`, and `paddingLeft`; Region padding stays flat in Region config and never creates a synthetic Layout.
- Layout nodes belong under `components/layouts/*`.
- Content and flow widgets belong under `components/widgets/*`.
- For both widgets and layouts, keep overrides minimal and only apply them when the operator explicitly requested a deviation from the default token/theme behavior.
- Consuming sites should keep area layouts and page entrypoints thin; structural page resolution should flow from site app code to shared UI to `phi-server`.
- `Suspense` and route/region loading boundaries should usually be owned by higher-level composition layers such as shells, headers, footers, and pages, not by every widget individually.
- Widgets and modals should own interactive loading states caused by user actions (for example submit/loading/error states), while initial server-side loading fallbacks should usually be coordinated one level above them.
- Preset Forms such as Contact, Login, Registration, Confirmation, and Password Reset are referenced by
  `formId` and rendered through the generic `PhiFormWidget`; do not create domain-specific CMS Widget
  aliases for Forms. `PhiFooterWidget` remains the shared footer composition surface.
- Public shared component names should use the `Phi*` prefix for consistency across the package surface.
- Low-level building blocks may still use neutral names such as `ContactForm` and `RegistrationForm`, but exported high-level shared widgets and layouts should follow the `Phi*` naming scheme.
- Shared math/layout primitives such as neutral spacing scales or golden-ratio variables are allowed here.
- Start layout/math primitives from a strict golden-ratio / Fibonacci-inspired scale and only round when the UI demonstrates a clear need.
- Shared token helpers may generate Ant Design `ConfigProvider` token/component payloads from those neutral layout primitives.
- The base `phi` spacing scale is global across Phi sites; site themes may override from that base but should not replace it with unrelated spacing systems.
- Runtime constants, enums, and flag definitions belong in `constants/*`, not in `types/*`.
- Pure helper functions belong in `helpers/*`.
- `types/*` is reserved for type-only definitions.
- `gateway/*` is internal-only in `@phis/ui`; it contains the internal Phi-server adapter layer used by shared widgets, regions, and shells. Public runtime APIs must live in their own non-gateway namespace such as `constants/*`, `helpers/*`, or `net/*`.
- Shared root CSS may own:
  - Ant Design reset
  - global `phi` CSS variables
  - minimal root / `html` / `body` baseline rules

## Next.js / Ant Design constraints

- Local workspace consumers must use `transpilePackages: ["@phis/ui"]`.
- In local development, `transpilePackages` is the preferred default over requiring manual rebuilds after every shared UI change.
- The compiled distribution package must expose executable ESM and declarations directly and must not require `transpilePackages`.
- In CI / production, the package should be treated as a real build artifact with explicit exports and a reproducible build step.
- Ant Design SSR/style injection is owned by the consuming site's root App Router layout via `@ant-design/nextjs-registry`.
- If a shared React component causes styling, hydration, or context regressions, verify duplicate runtime package resolution before editing component behavior.
- Prefer Ant Design layout primitives (`Layout`, `Flex`, `Space`, `Row`, `Col`) before writing custom CSS layout logic.
- Exception:
  - shared shell/region infrastructure in the RSC path may intentionally use plain React/HTML structure instead of Ant Design `Layout` when that keeps the server/client boundary valid under Next App Router and Turbopack.
- Prefer Ant Design theme/component token configuration before CSS overrides.
- Prefer Ant Design token colors, typography tokens, spacing tokens, and component variants before introducing custom visual values in shared code.
- Special colors or styling settings should be treated as opt-in work and added only after an explicit operator request.
- Use CSS overrides only when Ant Design primitives or theme tokens do not express the required behavior cleanly.
- Site-specific spacing or shell deltas should resolve to concrete values derived from the shared `phi` scale.
- Do not rely on arbitrary formula strings as the persistent theme contract.
- Theme resolution uses three layers:
  - shared root CSS baseline
  - shared default Ant Design theme derived from the `phi` scale
  - site-specific overrides from `site.theme`
- NEVER hardcode provider-level component style props in root layout (for example `ConfigProvider` `modal/styles`, `button/styles`, or similar inline provider config) when those values should stay DB-overridable.
- Root layout may wire provider composition only; visual defaults must flow through shared theme token/component helpers and remain overridable by `site.theme`.
- Site theme config is a delta layer, not a replacement for the shared base.
- Merge Ant Design component overrides per component instead of replacing the whole `components` object.
- Do not override Ant Design typography defaults in shared UI unless there is an explicit shared-system decision to do so.
- If a site needs different typography, prefer `site.theme.antd.token` overrides such as `fontSize*` and `lineHeight*`.
- Shared shell architecture should follow App Router composition rules:
  - server layouts load data and compose
  - client shell components handle interactive layout UI
- Prefer explicit area route segments over implicit route-group shell tricks when stable area layouts and cache boundaries matter.
- Use `loading.tsx` and nested `Suspense` boundaries to keep shell rendering decoupled from slower content regions.
- Treat intercepting routes and parallel routes as a follow-up tool for modal flows, not the initial shell foundation.

- Internal Phi-server adapter functions belong in `phi-shared-ui/gateway/*`. Public server-only helpers must use a separate namespace such as `server-helpers/*`.
- `gateway/site-config.ts` is the typed server-side fetch/read layer for site config JSON from `phi-server`; it is not a widget-level fallback fetch path for client code.
- Guard issuance/verification, session persistence, and other backend-owned security state still belong to `phi-server`, not to `@phis/ui`.
- Shared server-side translations must use the internal site-aware translation path behind the public shared `server-helpers/translate` helper.
- The public shared free-text translation helper contract is:
  - `tr(msg, params?, ctx?, format?)`
  - `trForLocale(locale, msg, params?, ctx?, format?)`
- `ctx` should stay empty by default for normal free text and only be set when collisions or semantic conflicts require it.
- `format` defaults to `text`; use `html` only for intentional translatable HTML markup.
- Shared UI label sets should continue to use dedicated label-set loaders, not ad-hoc page text translation.
- Shared UI label sets are only for Phi-owned copy. Do not route Ant Design locale strings or Dayjs/date formatting through Phi label sets.
- Dynamic values must never be embedded in strings that are sent to `tr`, `trGlobal`, `trBulk`, or label-set translation. Use `%1`, `%2`, ... placeholders and insert user/profile/company/email/site values only after translation.
- Label sets may define placeholder templates, but they must remain static UI copy and must not be built from resolved user data.
- Client components must format translated templates locally instead of concatenating translated labels with dynamic values.
- A small in-process cache for shared label sets keyed by `locale + setKey` is allowed.
- Shared UI label sets should default to `PHI_TR_CTX_WEB_UI_LABEL`.
- Only diverge from those defaults when the same visible text must intentionally resolve differently in another semantic context.
- Label-set definitions should use semantic keys mapped to default texts. Do not treat free text as the working lookup contract in widget/layout code.
- Positional translation arrays are acceptable as an internal transport detail only when the mapping back to semantic keys is verified.
- Do not invent site-specific translation contexts for common shared UI labels when a shared fixed UI context is sufficient.
- Shared server wrappers may normalize a runtime object with `site`, `locale`, `area`, and `viewer`.
- Treat that runtime object as a server-side coordination contract.
- Pass only the runtime slice a given client component actually needs; do not blindly forward the whole runtime object.
- `area` is UI/render context only.
- `viewer.roleClaims` contains one provider-scoped flag matrix per effective provider. Core and
  third-party bits must never be merged into an unqualified mask.
- `viewer.access` and role claims are runtime state only. Authorization still belongs to matching
  backend policy checks; Client helpers are presentation only.
