# Widget contract migration completed archive

This file is a compact archive of completed migration work. It is intentionally separate from the
active findings in [WIDGET_CONTRACT_MIGRATION_TODOS.md](./WIDGET_CONTRACT_MIGRATION_TODOS.md) so routine
planning does not require parsing the full historical record. Git history remains the detailed source
for individual implementation changes. Entries describe the implementation at the time they were
completed and are not normative when the active v1 target contract or TODO explicitly supersedes them.
In particular, the later 96-bit `PhiCmsInstanceId` migration supersedes the archived numeric
publish-materialization batch below.

## Status lines that match the answer

- Moved the route decision out of Next middleware. `next/site-proxy.ts` redirected protected roots to
  `/<locale>/login` on `hasSession` alone, before the App ran, so the guards that know the descriptor
  catalog never saw the request and a Site without the Auth Module was sent to a page that does not
  exist. The proxy forwards protected roots now and the Area guards own the decision.
- Made the Layout answer both "does this exist" and "may you see it", in that order, because it is the
  last place that can still set the status line. Deciding in the Page could not: the shell has flushed
  by then and Next can only swap the body, so every unresolvable path answered `200` with the 404 page
  and a deleted Page kept reporting success to crawlers and caches. Access is answered first, or a
  staff Area would report a missing page to anyone not allowed to see it.
- Keyed the per-request root cache on the effective path rather than the passed one, so the Layout,
  which receives no catch-all segments, and the Page, which does, share one resolution instead of
  resolving the same request twice. That is what makes the Layout's decision free.
- Separated "no login route" from "cannot tell". A staff Area bridge deliberately omits the Public Area
  definition, so it cannot verify the route; refusing there would strand a visitor on a Site with a
  working sign-in page. Where the catalog can answer, `unauthorized()` is the answer when nobody owns
  the route, as `AUTHENTICATION.md` section 6 requires.
- Measured anonymously on 2026-08-20. With Auth active: `/admin`, `/app`, and `/builder/pages` answer
  `307` to the login route, an unknown Public path and a tombstoned Page answer `404`, and `/en`,
  `/en/login`, and `/en/contact` answer `200`. With Auth published off: the redirect still happens and
  the login route itself answers `404`, so the visitor learns the truth instead of reading success.
  Authenticated access to every staff Area is unchanged.

## Active Builder Page catalog browser regressions

- Verified the single-cached-request claim in the production Builder route on 2026-08-20. Cold load,
  hard reload, Area changes across `public`, `app`, and `admin`, Page creation, publish, reload,
  deletion, Module activation changes, Draft Status, Page Header, and Page meta each issue at most one
  `GET /api/site/cms/pages?area=<area>` and raise no console or page error. Save and publish refresh
  from the local store rather than refetching, and Page meta stages Title, Path, and Description into
  the draft so the write stays with Save and Publish.
- Fixed the one defect it surfaced. `usePhiControlOptionsProvider` passed the live Client snapshot as
  `getServerSnapshot`, so React hydrated against a store that could already have filled. The Builder
  Page Cascader rendered the raw storage path `/` on the server and the resolved title `Home` on the
  client whenever the catalog won that race -- a hydration mismatch in 1 of 6 loads of the same URL.
  Providers may now declare a real `getServerSnapshot`; the default is the empty snapshot, so options
  appear after hydration instead of disagreeing during it. 18 consecutive loads report no mismatch and
  the Cascader still shows `Home` once hydrated.

## Unified generated image-variant rendering

- Made the original-versus-variant decision a single resolver. `components/media/image-presentation.ts`
  answers delivery URL, `fit`, position, presentation box, and simulated crop for every surface that
  draws an Asset: the Image Widget, the Card Widget on server and in the Editor, and Background bases.
  No surface builds a variant URL or derives a focal placement of its own any more.
- Stated the rule the surfaces had drifted from: an original is raw material that Authoring frames with
  the configured `fit` and `objectPosition`, falling back to the focal rectangle for an automatic
  position; a generated variant is a finished server crop that renders with its spec `fit`, always
  centered, never re-consuming the focal rectangle. Background bases re-applied the focal rectangle to
  an already-cropped variant, and the Card cover hard-coded `objectFit: "cover"` with no position at all.
- Moved the delivery facts a Background needs -- delivery revision, focal rectangle, intrinsic size --
  out of authoring config and into a render-time projection. `resolvePhiRenderableBackgroundAssets`
  fills it for a live page in one bulk reference request over Region, Layout, and Overlay configs;
  the Picker fills it in the Builder draft; `builder-persistence` and the Region serializer strip it
  before saving, the same lifecycle `resolvedContent` has on Content Widgets. The walk is shape-driven,
  so a Background nested in a new container is covered without extending a key list.
- Gave the Card Editor the same authoring Asset the Image Editor reads, through the extracted
  `usePhiAuthoringAssetDetails`, so an invalidated variant reaches the Editor instead of the crop that
  was cached before the focal change.
- Routed Builder drafts through the same bulk reference resolver as the live render. Nine call sites
  reached `buildPhiDeveloperBuilderRegionDraftsFromTree` directly and produced drafts with no Asset
  projection, so the Editor requested a variant without its version and cached a crop independently of
  Live; a browser check caught it. `buildPhiProjectedBuilderRegionDrafts` is now the only path, and the
  regression forbids either preset builder from naming the raw helper. Editor and Live compute
  byte-identical delivery URLs and both follow a focal change.
- Kept Background motion drawing the original on purpose: a variant is already reduced to the visible
  crop and leaves the effect nothing to reveal. `scripts/validate-image-presentation-contracts.ts`
  pins that opt-out alongside the shared rules, so it stays a decision rather than an oversight.

## Stable Page paths and internal Page/Asset references

- Added the shared reference ABI in `types/references.ts`, exported as `@phis/ui/references`. It
  owns the opaque `PhiPageReference` codec, the `phis:page/<reference>` and `phis:asset/<assetId>` URI
  forms, and the pure readers. `phi-server` keeps a byte-compatible counterpart in
  `src/lib/internal-references.ts`; neither package imports the other.
- Separated immutable Page identity from the mutable Site Page path across the Builder Page catalog, Page
  Meta state, preview transport, routing helpers, and Navigation authoring. Module preset identities stay
  path-locked and surface the server-provided ownership reason through the generic Form condition path.
- Made the Area Page source Tree emit the stable reference on insert and drag/drop. Navigation persists
  that reference, shows the resolved path read-only in its Table, keeps the literal URL editor for
  explicit external targets only, and preserves unresolved references in Draft with a deleted-target
  diagnostic while omitting their links from Live navigation.
- Wired the explicit Page-path command through `builder-page-catalog-client.ts` against
  `POST /api/site/cms/pages/:scopeId/path`, outside Page Form revision save and Builder Undo/Redo, with
  catalog and route refresh plus the server's affected-reference and collision diagnostics.
- Added the server-side bulk resolver in `components/widgets/helpers/internal-reference-resolver.server.ts`.
  It resolves Site Page references through the Site projection, Module preset references through the
  active Area descriptors under the viewer access policy, and Asset references to public delivery URLs
  only. `html-internal-references.server.ts` applies it to HTML, and the Markdown server renderer to
  Markdown; both re-sanitize without the internal scheme afterwards, so no unresolved `phi:` URI can
  reach Client output.
- Extended the Markdown and HTML authoring controls with Page and Media reference pickers, and enforced
  the external-document branch before translation and rendering: forbidden Phi links are unwrapped,
  forbidden Phi media removed, and ordinary relative URLs resolved against the external source URL, with
  bypass encodings normalized before the check.
- Added `scripts/validate-reference-contracts.ts` to `runtime-modules:check` covering the codec, the
  sanitizer scheme gate, Navigation persistence shape, and picker presence.
- Moved Asset resolution onto the same bulk endpoint as Page references. `resolveSiteInternalReferences`
  answers both kinds in one round trip, so a page with a dozen images no longer issues a dozen Asset
  lookups. The single-Asset gateway `gateway/media.ts` and its `@phis/ui/gateway/media` export
  are removed rather than kept alongside it; the Image and Card server renderers use the shared path.
- Replaced the Asset payload on that path with a public rendering projection. It carries only what a
  rendered public page already reveals, and projects the focal rectangle as a typed field instead of
  shipping the opaque `meta` blob. Ownership, Folder placement, audit attribution, checksum, and byte
  size no longer reach a caller holding just the internal token.

## Group-aware Media Spaces and Folders

- Replaced the Asset Media Group vocabulary with `folderId` and `folderPath` in one ABI-breaking pass
  across types, providers, options providers, Form fields, signals, stores, and controller state. No
  alias and no second vocabulary remains.
- Added the server-issued active Media Space to the Asset Provider and Binding context through the
  Collection payload metadata, with `PhiMediaSpace` and its closed `site | user | group` kind in
  `types/media.ts`.
- Extended `PhiRuntimeViewer` and the one access-policy parser/evaluator with provider-qualified
  `groupClaims` and the closed `groups` policy variant, keeping roles and groups orthogonal and the Core
  Admin override intact. `scripts/validate-access-policy-contracts.ts` covers the matching and
  foreign-provider rejection cases.
- Kept `PhiCollectionViewWidget` as the only Asset collection path: header, Folder Cascader plus Create
  Folder companion action, Upload integrated panel, tiles, Inspector, skeletons, and pagination changed
  only their Provider data contract.
- Moved Asset metadata and focal workflows onto stable Asset ids and server-returned delivery
  projections. No Storage key, bucket, Provider package id, public URL, signed URL, or quota decision is
  constructed in the Client.

## Authoritative active Builder Page catalog

- Centralized the active per-Area Page catalog from active module presets, persisted Site Pages, and locally
  pending Pages. One cached Client request hydrates the Builder store; Page Header, Page Controller, Draft
  commands/status, Revisions, Page options, the source Tree, and Navigation DnD consume that same snapshot.
- Added an explicit per-Area hydration state and delayed URL/workspace scope reconciliation until the complete
  catalog is present. Persisted custom Pages therefore remain resolvable after direct reload and during
  Save/Publish/Preview rather than existing only in a component-local list.
- Kept storage-path resolution strict and removed the guessed unbound Page path from Client and Server reads.
  Server rendering resolves non-preset Pages through the authenticated Site Page catalog; only an actually
  registered Site Page or active module preset can become the current Builder Page.

## Region and Layout Background motion

- Added the canonical image-owned `background.motion` ABI with `static`, `fixed`, and `parallax`, normalized
  strength, and natural/reverse direction. Region and Layout Inspectors expose it through their existing shared
  `PhiBackgroundControl`; no Inspector-specific field or alternate Background contract was added.
- Added one conditional motion layer shared by Regions and Layouts. It coordinates intersection, resize, scroll,
  animation frames, automatic overscan, clipping, reduced-motion fallback, and cleanup without React state or
  one global listener per instance.
- Both call sites reach it through one Client-owned `React.lazy` boundary that also owns its `Suspense`. The
  Region container no longer declares a local lazy wrapper, and the Layout renderer no longer routes through a
  Server Component that dynamically imported the Client implementation. That server indirection split only the
  server module graph, is forbidden by `AGENTS.md`, and additionally pulled `server-only` into the Layout
  contract validator's import graph. The lazy boundary now holds the sole reference to the implementation
  module, so nothing statically links it into a route's client graph.
- Measured on a 2026-08-17 production build of `phis-site-skeleton` (Next.js 16.2.11, Turbopack, cold browser,
  cache disabled, service worker bypassed). The motion implementation is emitted as its own 3,326-byte chunk and
  is the only chunk carrying its `backgroundAttachment` / `prefers-reduced-motion` / `insetInline` signatures.
  Public `/en` requested 44 initial scripts (717,855 transferred, 2,199,745 decoded) plus 18 late scripts
  (94,244 transferred, 249,264 decoded), and did not request that chunk at all. The chunk holding the lazy
  boundary was in the initial set, so the dynamic-import edge was present and live in the loaded graph; the
  implementation stayed unfetched because no Region or Layout on that route declares motion. A positive control
  on a motion-carrying route is still open and tracked in
  [WIDGET_CONTRACT_MIGRATION_TODOS.md](./WIDGET_CONTRACT_MIGRATION_TODOS.md).
- Removed the open-ended image `attachment` field and the complete `PhiParallaxWidget` family from the v1 ABI,
  renderers, module catalogs, manifests, and exports. Parallax content now remains an ordinary Region or Layout
  with an image Background and normal child Widgets.

## Server-authoritative Forms and responsive Grid placement

- Replaced Browser-carried handler descriptors with server-side resolution of the Published Form, active
  module-owned handler Provider, immutable transport target, CSRF metadata, and closed credential policy.
  Browser submissions now carry only `formId`, phase, and validated values; destination endpoints retain
  independent Site, session, role, abuse, and domain authorization.
- Added canonical container-responsive Grid slot placement with 24-unit `span` and logical-inline-start
  `offset` values for Compact, Medium, and Wide, including shared validation and Builder/runtime rendering.
  Admin Locales uses that Grid for its Form, externally aligned Submit action, and Table.

## Shared Collection Header and Auth login Overlay

- Centralized provider-backed Table and Tree title, description tooltip, query controls, and compact action
  toolbar through `PhiCollectionHeaderControl` and `PhiToolbarControl`. Removed the separate Revisions count,
  delete-selected, reload, and status wiring path in favor of generic Table Provider state and actions.
- Replaced the private Auth login Modal with Auth-Module-contributed Public and App Area Overlay presets.
  Both hosts render the same registered Login Form Widget; the Area Auth Controller hydrates `next`, controls
  open/close, and falls back to the canonical localized Public login route when the projection is unavailable.
- Made Auth UI capabilities Area-specific: Public exposes login and pre-session workflows, Admin exposes Site
  settings, and App exposes account security plus in-place primary login.

## Deterministic Root theme propagation

- Consolidated Root and Builder-preview Ant Design theme identities so text inputs, buttons, Tables, and
  Segmented Controls consume the same token-driven light/dark configuration without Widget-local colors.

## Immediate Picker Controls

- Centralized the immediate open/change/commit/Escape-discard lifecycle and Phi-semantic placement in the
  canonical Picker Controls without exposing Ant Design value, event, or placement types.
- Moved Color Picker presentation unchanged from the Color Widget into `PhiColorControl`, including its
  existing popup padding, panel offset, palette dimensions, swatches, and token-derived content.
- Split Media and Mask selection into their canonical Controls and provider-aware Bindings; toolbar and Mask
  consumers no longer nest the placeable Media Picker Widget or own a direct Ant Design Popover path.
- Centralized media collection layout, asset tiles, and matching loading skeletons in provider-free Controls.
  Media Picker now uses those cards, compact Phi input controls, and a Phi Slider for transient tile sizing
  instead of a second Button-wrapped image grid.
- Moved the Builder Widget/Layout selection surface out of the Region scaffold and anchored each instance to
  the invoking empty Region or concrete Layout Slot while preserving the existing dimensions and content.

## Canonical Form Control, Builder Effects, and Inspector Overlay trees

- Split the Form renderer into `PhiFormWidget -> PhiFormControl -> field Provider -> Phi*Control`, removed
  descriptor-owned actions and Modal presentation, rejected those legacy keys in v1 parsing, and kept
  submit/reset/cancel as correlated Controller inputs from ordinary external Button Widgets.
- Added the complete descriptive validation family, explicit Enter/IME/textarea/compound-editor keyboard
  behavior, initial-value rehydration after the concrete Form Widget is mounted, and controlled atomic
  Table/Tree Form fields without Provider lifecycle.
- Added the canonical Popover, Pagination, Tabs, Media Picker, Focal Rectangle, Background, Border, Shadow,
  Padding, Geometry, and Effects Controls. Controls no longer mount complete CMS Widgets; the Media Picker
  separates its provider/signal Binding from its presentation Control and Widget identity.
- Made Builder Effects an Area-owned Overlay containing one Form Widget and external Save/Cancel Widgets.
  It holds one transient effects value, commits through one correlated Builder patch/history transaction,
  and discards on Cancel, Escape, or Header close.
- Replaced the imperative Inspector Drawers and nested Collapsible host with three Area-owned glass Drawer
  Overlays. Their direct n-slot Collapsible roots contain 18 independent Builder-Module section Widget types
  with declared routes to the Builder Controller.
- Removed generally registered Background and Geometry configuration Widgets, the old
  `PhiInspectorCollapsibleSections` path, and the generic `builder-inspector-host` type. The remaining
  workspace host owns only transient Pages and Signal Wiring Picker Controls.
- Extended low-output contract validation for Control boundaries, forbidden legacy Form descriptor keys,
  keyboard rules, compound Form Providers, Inspector section identity, and Core/Builder graph ownership.

## Builder Page Metadata Overlay

- Replaced the private Page Metadata dialog with a Page-owned `/builder/pages` Modal Overlay whose Body is
  one registered Form Widget and whose Footer contains ordinary Save and Cancel Button Widgets.
- Routed initial-value hydration, validation, submission, persistence, close, and discard through the
  Builder Controller with correlation preserved. The Overlay closes only after successful persistence;
  first-open hydration waits for the concrete Form Widget receiver.

## External Form actions and controlled Overlay close

- Added standard correlated submit/reset inputs and submitting, validation, success/error, dirty/valid, and
  reset-complete outputs to the generic Form Widget while preserving inline actions as the default.
- Added declarative Phi-Control Overlay footer actions and request-controlled close gestures. The Overlay
  emits only opaque commands; Controllers forward them to Forms and close only after correlated success.
- Migrated Admin Users create/edit workflows and Editor Translation editing to explicit Page-owned Overlays,
  external Form actions, and Controller coordination. Custom auth/contact renderers no longer swallow failed
  submit promises as successful completion.

## Remaining P1 Table, Input, and Runtime Module convergence

- Migrated Editor Translations to a self-contained generic Table, removed the empty HeaderBottom path, and
  replaced its private Form modal mode with an explicit Overlay/root Layout.
- Moved Signal Wiring to its Builder Table Provider and Binding host; migrated Effects, Navigation Draft,
  signal capability metadata, Brand preview, and Static Options to `PhiTableControl`; removed the parallel
  Collection Table Control. Navigation keeps its resolved Draft and atomic Builder history as the owning
  transient state rather than introducing a fake Provider.
- Replaced the Revisions Table Widget alias with the ordinary Table Widget and moved its Provider, Controller,
  presets, and separate Server/live/Authoring projections into `plugins/runtime-modules/revisions/`.
- Added enforcement against direct Ant Design Tables, domain Table Widget aliases, generic-host Provider-key
  branches, missing owner projections, and Area aggregators rebuilding owner-folder Modules.
- Added versioned static Table Provider resolution where live reads Published and Authoring mutates only a
  Working Draft, plus the generic Authoring resource editor. Native GFM tables now render through
  `PhiTableControl`; Provider-backed Markdown embeds remain closed until demand-safe parsing exists.
- Replaced the persisted Search Widget family with generic Input search configuration and replaced the special
  Builder Area Selector Widget with a declarative Select Box. Removed their definitions, plugins, loaders, and
  Runtime Client types.

## Generic Admin Logs Table and module-owned detail

- Replaced the `observability-logs-table` wrapper with the generic Provider-backed Table Widget in the Admin
  Logs preset. Search, filters, reset, reload, pagination, and the Warning/Error MultiSelect default are ordinary
  self-contained Table configuration inside a vertical Flex Content root.
- Removed the repeated Table title and description, the special Table definition and render paths, and the
  Provider mutation used only to emulate reload.
- Added an Observability-owned Log Detail Widget wired through the generic Table action signal. It reads the
  complete record through the Provider `recordRead` contract and the Core detail endpoint while the Table sends
  only the stable row identity.
- Removed the module's no-op Controller and updated Runtime validation so controllerless modules are excluded
  from Controller Client manifest equality while remaining part of Server and Authoring module unions.

## Owner-scoped Widget catalog as the single source of truth

- Removed the global first-party Widget definition provider lists and their public package entrypoints.
- Removed the incomplete `PHI_CMS_WIDGET_REGISTRY` export and its derived namespaced lookup Map. Individual
  Core Widget type constants remain stable identifiers only and are not a discovery registry.
- Changed Runtime module validation to discover server-safe definitions from `components/widgets/config/*`
  and require exact ownership through `plugins/runtime-modules/*-widgets.ts`, without comparing against a
  manually maintained second catalog.
- Updated the binding repository and plugin documentation so Builder Picker/Inspector metadata resolves
  only from the active owner-scoped Runtime module set.

## Demand-driven Data Provider Client manifests

- Removed executable Data Provider Client loaders from Server runtime modules and descriptor files. The
  Server resolver now carries only module-owned descriptors and passes only demanded provider keys across
  the Flight boundary.
- Added immutable Area-local Data Provider Client manifests with `React.lazy` loading. Live Areas expose
  only providers owned by modules eligible for that Area; Builder additionally exposes the static
  authoring loaders required by its target-Area union.
- Hardened Runtime module validation so all 14 first-party provider descriptors have exactly one matching
  Client loader and `authoringPolicy: "static"` matches the presence of `loadAuthoring`.
- Proved the boundary in a Turbopack Production build: Public `/en` remained at 41 initial scripts while
  dropping from 705,618 to 698,588 transferred bytes and from 2,154,259 to 2,130,418 decoded bytes. Its
  initial scripts no longer contain the Asset Collection implementation or `/api/site/media`, and the
  route performs no Media API request.
- Proved demand loading on authenticated `/builder/media`: the provider implementation and
  `/api/site/media` transport load after the initial manifest, the API returns 200, and the final page
  contains 12 loaded images with no remaining skeleton, Console error, or page error.

## Provider-scoped access and responsive render blocks

- Replaced merged Base/Custom viewer flags with provider-scoped role claims and one shared access-policy
  evaluator, including the explicit Core Admin Site-superuser rule.
- Applied policies to Area, Module, Route/Page, Navigation, and server API resolution so unauthorized
  contributions are filtered before the Client boundary.
- Removed the `dev` Area, route host, base module, client manifest, and compatibility paths. Core
  Developer viewers now resolve to the shared `admin` control-plane host, while user, locale, settings,
  and Site-administration contributions remain Core-Admin-only.
- Added canonical Compact/Medium/Wide `viewportFlags` to the common render-block configuration. Missing
  or `0` remains unrestricted, persisted values are limited to `0..6`, and named Site/Builder Canvas
  Container Queries apply inherited visibility without device detection.
- Replaced Core role columns with provider-scoped role-claim persistence and an authorization revision;
  effective third-party claims are exposed only while their server Add-on provider is available.
- Completed access-policy coverage for Widget/Layout artifact minima, persisted Region/Layout/Widget
  instances, and Command Toolbar actions. Catalog construction rejects foreign-provider policies;
  server resolution prunes denied subtrees before renderer/controller Client boundaries, while Builder
  pickers receive only accessible artifact definitions.
- Added a Builder toolbar warning when inherited Compact/Medium/Wide masks have an empty intersection,
  using the same central mask normalization as runtime rendering.

## Provider-owned signal runtime partitions

- Replaced module-global signal subscriptions, receiver registries, and mutable current-context state with
  explicit Site, Area, and isolated Builder Canvas providers.
- Bound every raw/domain dispatcher and receiver registration to its nearest runtime partition.
- Kept Page/Region endpoint context on mounted Area entries so shell-to-current-page routing remains possible
  while unmounted receivers unregister normally.
- Removed browser `BroadcastChannel` delivery; v1 signals never cross tabs or isolated Canvas boundaries.
- Kept Site delivery restricted to the concrete required Core controller and rejected Site broadcast.

## Canonical CMS instance identity and stable Working Drafts

- Added the strict 96-bit, 16-character Base64URL `PhiCmsInstanceId` codec for deterministic preset and
  versioned Draft origins.
- Migrated layout, surface, and widget identities plus structural references and runtime signal addresses
  from numeric/family-specific values to the single `cms:<instanceId>[:<subcontrolKey>]` family.
- Migrated first-party preset node identities to deterministic
  `(moduleKey, presetKind, presetKey, nodeKey)` derivation and removed the negative node allocator.
- Replaced publish-time positive-ID materialization with validation-only publish that preserves canonical
  identities.
- Persisted Working Draft `revisionId`, optimistic `version`, and one shared monotonic `nextNodeSequence`
  in revision metadata; repeated saves update the same Working Draft revision and stale writes conflict.
- Made the Builder create the first Working Draft before structural insertion, allocate from its shared
  sequence, clear allocation state on reset/publish, and reject missing legacy Draft metadata.
- Removed old family-address readers and reduced public addresses to canonical CMS, Region, and namespaced
  Controller forms.
- Made the required Core controller a root-owned Site endpoint at
  `controller:@phis/ui/core:default`; Site broadcast and unknown concrete receivers are rejected.
- Replaced Support Inbox Site broadcast and Builder Theme Site broadcast with explicit CMS/controller
  routes; Theme applies its runtime preview through the targeted Core endpoint.

## Capability-driven Wiring editor and shared scaffold tool

- Replaced the Wiring modal's plain AntD selects with the shared `PhiSelectBoxWidget` control surface.
- Added session-local route editing with stable `routeKey` identity; add, edit, and delete use the
  Builder-owned table provider and persist only after explicit Apply.
- Added translated signal label-set entries for the modal, fields, validation, and route actions.
- Added active area-mounted controller endpoints to the Inspector catalog through serialized module
  controller capabilities and `resolvePhiControllerSignalEndpoints(...)`.
- Configured emit routes whose concrete receiver is unavailable now remain visible as contract errors.
- Added the generic Wiring tool to the shared widget/layout/surface scaffold; it selects the concrete
  CMS instance and opens the controlled Wiring modal without a widget-specific path.
- Route scope remains derived from the receiver endpoint, and normal Wiring offers only explicit
  concrete targets rather than broadcast.

## Semantic structure DnD and shared scaffold handles

- Added shared scaffold drag handles for Widgets and root/nested Layouts without placing drag behavior
  inside individual Widget or Layout implementations.
- Moved structure authoring to `dnd-kit` with semantic draggable and droppable contracts, a shared
  drag-overlay snapshot, accepted-target feedback, and central slot/Region mutations.
- Enabled Widget and Layout moves between nested slots and root Regions while preserving the maximum
  Layout nesting contract and preventing a successful drop from opening the Inspector.
- Kept drag signals semantic (`dragStart`, `dragOver`, `dragEnd`, and accepted `drop`) and excluded
  pointer coordinates from the runtime signal ABI.

## Signal ABI v1

- Removed `PhiSignal.kind`, legacy payload routing, `payload.key`, `sourceKey`, delivery flags, and mixed
  old/new route parsing.
- Closed the action vocabulary to the approved v1 actions and moved domain operations into channels.
- Split concrete route identity into mandatory stable `routeKey` and capability references into
  mandatory `capabilityId`; kept capability declaration `id` as the referenced metadata key.
- Made control and toolbar capability dispatch fan out through every explicit matching route instead of
  resolving only the first route.
- Added central route-key creation for Builder wiring and strict duplicate route-key rejection.
- Split sender output capabilities from receiver input capabilities.
- Made runtime `originId`, `correlationId`, and `timestamp` metadata central and mandatory.
- Defined sender as address or `null`; receiver as address, explicit `broadcast`, or `null`.
- Made JSON `valueSchema` mandatory for public JSON routes and centralized core schema IDs.
- Hardened `readPhiSignalRouteSet(...)` so incomplete legacy routes are rejected instead of defaulted.
- Centralized address creation/parsing, including namespaced controller addresses and subcontrol suffixes.
- Removed `block:<id>` routing; the later canonical identity contract supersedes the intermediate family
  addresses with `cms:<instanceId>[:<subcontrolKey>]`.
- Removed public slot addressing; slot state is handled through owning layout/surface channels.
- Reduced renderable-block emission to one canonical helper and removed the obsolete command/event
  aliases.
- Removed duplicate editor emissions and implicit listener feedback re-emissions.
- Added central signal-route receiver pruning/remapping, including addressed subcontrols.

## Renderable-block runtime

- Centralized standard receivers for visibility, enabled state, size, min/max size, background, border,
  shadow, z-index, opacity, and effects.
- Added the shared widget editor scaffold layers: normal widget bodies are centrally inert and cannot
  emit runtime signals without runtime-disabled styling, selection/hover/debug chrome is
  theme-aware, common tools render above the interaction layer, and explicit `authoring` plugins keep
  interactive inline editor bodies.
- Removed local Builder `disabled`/`signalsEnabled={false}` boilerplate and the AntD-selector-based
  Inspector click allowlist; specialized editor and toolbar events now stop at their shared scaffold
  boundaries.
- Centralized mounted receiver registration/unregistration and runtime identity in `PhiSlotChildFrame`.
- Kept hidden blocks mounted so they can receive a later visibility signal.
- Removed duplicate standard receiver implementations from layout clients.
- Centralized layout/surface chrome through `PhiBaseLayout`.
- Made layout/surface Inspector endpoint resolution inherit the same standard receiver capabilities as
  widgets without duplicating plugin declarations.

## Choice and control widgets

- Replaced segmented, select-box, and stack-tabs option types with the common `PhiWidgetOption` contract.
- Centralized option parsing in `readPhiWidgetOptions(...)` and normalized selected option values.
- Added generic multi-select support for `enum[]`, `string[]`, and `number[]`.
- Migrated generic button, selection, switch, input, pagination, cascader, color, search, and command
  toolbar signaling to `PhiControlSignalController`.
- Centralized mounted sender identity so ordinary CMS controls no longer build their own widget address.
- Added optional shared badge chrome with `badge/change:string|number` receivers.
- Added toolbar subcontrol addressing and route references through stable button keys.
- Removed signal routing fields from normal widget Settings; instance wiring is stored in `signalRoutes`.

## Widget field contracts

- Added common color field modes for single color, gradient, or both.
- Kept gradients as CSS strings under the color value contract.
- Added structured background and border field storage contracts.
- Migrated the background and color widget definitions to those shared fields.
- Added shared Inspector rendering for color, background, border, shadow, radius, dimension, and other
  declared config fields.
- Centralized renderable-block plugin fields and shared widget dimension/surface padding field groups.
- Centralized standard control state fields such as disabled/read-only behavior instead of redefining
  them in each widget.

## Controllers

- Added the namespaced runtime-controller definition/plugin registries and generic client/server hosts.
- Added server preload support without forcing server work on controllers that do not declare preload.
- Made controller mounting settings-driven and removed area/plugin special-case root mounts.
- Migrated Builder, Theme, Asset, and Form controllers to the registry/host path.
- Centralized controller addresses as `controller:<npm-package>/<controller-key>:<instance-key>`.
- Made controller mounts a derived runtime concern of active modules and CMS instance requirements;
  controller types and instances no longer activate area functionality.

## Structured tables

- Replaced the controller-signal table ABI with scoped module data providers declaring `kind: "table"`.
- Added the Core content-table provider so fixed Editor-managed rows use the same query pipeline.
- Migrated Builder Signal Routes, Admin Logs, User Management, Admin Locales, and Editor Translations
  to module-owned providers and removed controller table metadata and table signal schemas.
- Added `requiredDataProviders` for specialized widgets whose binding is constructed by their server
  renderer instead of persisted in widget config.
- Replaced the old API/inline/server-action table data ABI with a real public provider-backed CMS
  `PhiTableWidget`.
- Registered the table in public runtime, definition, and Builder widget registries.
- Made provider demand resolution load only provider Clients referenced by widget config or explicit
  `requiredDataProviders`.
- Added the Builder Signal Routes table as the first provider-backed consumer, including stable
  `routeKey` row identity and session-local route deletion.
- Added registry-driven Table Provider Inspector choices filtered by descriptor kind and generic nested
  config-path persistence.
- Kept incomplete nested table bindings editable from raw draft config until the parser can resolve the
  complete provider/table pair, removed editor loading activity, and replaced live table spinners with
  a Skeleton loading state.
- Added shared translated labels for generic search, reset, toolbar/row/bulk actions, selection, empty
  state, and strict provider-binding diagnostics. Table cells now centrally render date, date-time,
  code, JSON, badge, tag, email, and link values.
- Added declarative toolbar actions and an explicit local-action interception point so a thin
  domain Client can retain a detail dialog without owning the table implementation or its data loading.
- Migrated Admin Logs from a direct-fetch Ant Design table to declarative `PhiTableWidgetConfig`.
  The Observability table provider owns HTTP loading and the read-only `logs` query/action contract.
- Extended declarative tables with switch-cell actions, row-value disabled guards, confirmation metadata,
  externally supplied search state, and shared provider actions for modal-backed operations.
- Migrated Admin Users to the User Management provider's writable `users` and read-only `userSessions`
  tables. Query, create, update, delete, enabled-state mutation, and session-history loading are
  provider-owned; the domain Client retains only editor/history dialog presentation and contains no
  direct fetch or specialized Ant Design table.
- Migrated Builder Revisions to the Revisions module's `history` table provider. History loading,
  message/status projection, review-link derivation, restore, single/bulk deletion, and active-revision
  guards are provider-owned; the thin Client retains only scope resolution, header signal coordination,
  translated feedback, and confirmation presentation.
- Completed the stateful table migration: Builder Signal Routes, Admin Logs, User Management,
  Admin Locales, Editor Translations, and Builder Revisions now share the same provider-backed
  `PhiTableWidget` path with no controller-table, direct-fetch, or specialized Ant Design table fallback.

## Runtime modules

- Replaced controller-keyed activation with explicit namespaced `PhiRuntimeModuleId` manifests. Every
  module declares a separate module id, exactly one controller type, required state, and area or demand
  controller mount policy.
- Assigned widget, layout/surface, data-provider, and authoring descriptors to one `ownerModuleId` and
  hardened manifest validation against duplicate or mismatched ownership.
- Made Core and Form required catalog modules and moved optional area persistence to the strict
  `runtimeModules` string array without a `runtimeControllers` compatibility reader.
- Centralized area-locked module policy so the Builder module is consistently active, selected,
  persisted, and non-removable in the Builder area across live runtime, Canvas sandbox, Builder state,
  persistence, and module options.
- Replaced the Builder Shells controller selector and signal route with the generic module selector,
  sourced from the installed runtime module catalog including third-party metadata.
- Added lazy module UI-provider descriptors and renderer-owned provider boundaries for module-owned
  widget/layout output.
- Added the Builder Pages/Shells target-area module sandbox. It resolves an exact nested module and
  render registry from the edited area's configuration instead of inheriting or unioning the outer
  Builder registry.
- Added strict module-catalog checks for module identity, one-controller ownership, separate
  module-owned controller Client entries, contribution ownership, duplicate ids, and missing active
  widget/layout loaders.
- Removed concrete controller Client Components from server module manifests. The Server host now emits
  only serializable active mounts into a route-owned Client host whose cached import promise resolves
  only the selected module controller.
- Replaced hard node-level failures for inactive modules, missing renderers, failed implementation
  loaders, invalid render output, and node render exceptions with one shared diagnostic block.
- Added structured server/client logging while keeping the affected CMS node in its original slot.
  Missing modules use only the local diagnostic block and log; other renderer failures may additionally
  raise a deduplicated Ant Design error notification. Diagnostics never borrow a renderer from an
  inactive or global registry; invalid manifests, duplicate ownership, and invalid module selections
  stay hard.
- Applied the same diagnostic boundary to lazy authoring widgets and layout/surface authoring output,
  including the exact owner module for first-party authoring widget descriptors.
- Split lightweight layout definitions from lazy layout parser/render implementations and made each
  loaded first-party layout plugin reuse that definition as its single metadata source.
- Replaced Builder Picker and Inspector global widget/layout metadata assembly with the exact active
  target-area Canvas module definitions. Insert defaults, fields, slots, signals, and layout/surface
  variants now travel through serializable module metadata instead of global implementation registries.
- Added manifest validation that keeps layout definitions, runtime-module descriptors, and lazy layout
  plugin loaders in one-to-one sync.
- Replaced the Canvas global first-party layout implementation lookup with active-module client
  authoring loaders and explicit runtime, preview, and authoring policy dispatch for layouts and
  surfaces.
- Split the global first-party authoring-widget loader list into owner-module client catalogs. Canvas
  now receives only active sandbox widget metadata, loads the matching module catalog on demand, and
  dispatches the declared authoring policy through its explicit client-safe adapter.
- Made runtime widget/layout and Canvas widget/layout rendering consult the declared runtime, preview,
  and authoring policies instead of selecting render functions solely from the requested mode.

## Forms

- Made `PhiFormDescriptor` a mandatory versioned atomic definition and removed split field/validation
  and rendered/hybrid Form paths.
- Migrated Login, Registration, and Contact fields, validation, actions, and placement to the generic
  Descriptor renderer while keeping guard, terms, draft, bootstrap, and result orchestration in wrappers.
- Added immutable nested provider composition, an Auth-owned terms provider, generic label resolution,
  and hard missing-provider diagnostics for third-party module boundaries.
- Completed runtime Form transition snapshots for values, field, validity, touched, dirty, reset, and
  clear without emitting controller traffic for every keystroke.
- Moved v1 persistence to one validated `descriptor` JSON document; server execution, security, and
  guard flags remain separate. The visual Builder canvas and Draft/Publish protocol remain open by design.
- Added the multi-instance runtime Form controller contract and client.
- Moved contact, login, registration, confirm, and reset-password transport orchestration behind the Form
  controller client.
- Removed form-controller self-mounting from form widgets.
- Added declarative required-controller instances to form widgets.
- Added demand-driven controller materialization for area- and page-owned CMS trees; controllers owned
  by required modules do not depend on optional area policy.
- Removed derived area/page controller instances from Builder persistence; optional module activation
  is persisted once through `runtimeModules`, while Form controller instances remain demand-driven.
- Kept visible form SSR separate from client-side form lifecycle orchestration.

## Media and search controls

- Added the generic `kind: "collection"` runtime data-provider ABI and declarative
  `{ providerKey, resourceKey }` binding used by non-tabular item views.
- Migrated Asset collection loading, pagination, deletion, and metadata/focal-rect updates to
  the module-owned Media Collection provider. The Asset controller now owns only transient
  filter/selection/signal coordination; binary upload remains the specialized upload transport.
- Bound Collection View and Media Picker to the same provider and added collection-provider choices to
  the generic Inspector data-provider control.
- Registered the Asset controller and moved media state/listening/loading into its headless mount.
- Replaced media-specific kind, search, reload, group, flags, pagination, and upload-toggle controls with
  generic CMS widgets and explicit Asset routes.
- Added the real `area-upload` CMS widget and routed its visibility through standard block signaling.
- Removed the old media scope widget wrapper and its `object:<scopeKey>` routing; Controller instances use
  the canonical `controller:<npm-package>/<controller-key>:<instance-key>` family.
- Added runtime-controller options through the common options-provider registry.
- Completed the Page-owned Asset Inspector Drawer through the canonical Overlay zones: an explicit
  Collapsible Body owns Preview and the Asset Metadata Preset Form, an explicit Footer Layout owns the
  external Save command, and the Asset Controller coordinates selection, submission, and collection reload.
- Kept focal rectangle as a controlled Asset Form value edited by the Asset-owned Modal Widget; Preview,
  Form, Footer commands, collection tools, loading, feedback, and Picker behavior use their canonical Phi
  adapters. Later Space, Folder, policy, quota, and Storage work remains solely in the dedicated Media
  Spaces migration contract rather than in a second Drawer-specific domain model.

## Builder signaling and presets

- Builder insert IDs are allocated against every loaded region draft rather than only the currently
  edited region, so HMR or switching regions cannot restart the draft range at an already-used ID.
- Routed Builder workspace commands directly to the Builder controller instead of broadcast.
- Migrated area selection, page selection, page title, Builder mode, debug scaffold, Theme/Brand, Stack,
  revisions, and navigation DnD to the v1 signal contract.
- Removed the legacy Builder controller host widget and hardcoded controller mounts.
- Made Core and Form required modules for every area and set the Builder preset's optional modules to
  Builder, Theme, and Asset.
- Centralized Builder-created draft IDs below `-10000` and removed timestamp-derived allocation.
- Builder node deletion now prunes routes to the removed node and every removed descendant across the
  affected area/current-page draft owners in the same store mutation.
- Split the Builder preset implementation into independent Area and Page structural trees. Area generation
  now owns only stable shell regions and Page generation owns only page-capable regions; the combined concrete
  tree plus recursive region-graph filtering path has been removed.
- Added central declarative Area preset composition by `(moduleKey, presetKey)`, including cycle/ownership
  validation, exported-node and complete Region-subtree omission, signal-route pruning, duplicate-Region
  rejection, and final graph validation. Auth and Admin now build only their own overlay nodes on the composed
  Public Area template.

## Inspector infrastructure

- Made lazy and generic widget fallback skeletons honor the widget definition's normalized slot-size
  policy on the immediate parent-layout slot child, including fixed explicit axes, without mounting a
  temporary widget signal receiver. Fill-policy workspace previews therefore retain the same available
  slot geometry before and after their authoring implementation loads.
- Propagated layout slot policies through the immediate authoring transition frame and declared
  Three Column as `fill-inline`, so intrinsic workspace headers no longer share the remaining vertical
  height with the fill-policy workspace body.
- Canonicalized missing Builder workspace area/page URL scope from the mounted controller state and
  gated Pages/Shells Canvas mounting on an exact server-sandbox/client-scope match, preventing stale
  Builder drafts from rendering against a Public module registry during route transitions.

- Made authoring widgets use the central scaffold lifecycle: clicks over editable text activate and
  focus it, other clicks open the Inspector, and blur/outside click/Escape commits and exits without
  reopening the Inspector; Markdown no longer leaves its textarea permanently above the scaffold
  interaction surface and keeps one stable controlled input while signal feedback updates its source.
- Kept authoring scaffold outlines and tools visible while suppressing hover/selection surface tint;
  scaffold tool buttons retain event priority over authoring and Inspector selection.
- Centralized single-line canvas title/text authoring in `PhiInlineTextEditor`, including Space-safe
  event isolation, IME-aware Enter commit, Escape cancel, and blur commit; Collapsible titles and Simple
  Text now share it.
- Registered Cascader as a real Builder widget renderer so editor canvases no longer use the generic
  widget preview fallback for Cascader instances.
- Added the public `createPhiCmsBuilderWidgetPlugin(...)` adapter and migrated the passive Cascader,
  Button, Segmented, Pagination, Stack Tabs, Spacer, and Table builder plugins so their modules register
  only a client-safe visual body while the adapter owns the standard builder-plugin shape.
- Made the central widget scaffold hover boundary include its toolbar descendants, keeping widget state,
  title, and tools visible while the pointer moves from the widget body into scaffold chrome.
- Consolidated Inspector mutations, Overlay orchestration, and the signal-route table service into the
  single Builder module/controller lifecycle.
- Completed the canonical Area-owned Region, Layout, and Widget Drawer Overlay topology. Header, Body, and
  Footer adapters contribute no content padding; every declared zone root Layout is its sole padding owner,
  and the resolved Builder Area mounts its `overlays[]` independently of Region occupancy.
- Removed the transitional Inspector-host render path and the unused standalone Region Inspector Widget.
  Each normal Inspector section Widget now consumes Builder Controller/workspace state directly and renders
  only its declared Collapsible slot, while the Builder Controller exclusively owns matching Drawer
  open/close orchestration. No hidden `drawer_right` Region, host Layout, or host Widget remains.
- Replaced direct AntD section collapse shells with `PhiCollapsibleLayout`.
- Centralized widget/layout config-field rendering in `inspector-config-field.tsx`.
- Centralized widget/layout signal sections in `inspector-signal-section.tsx`.
- Added capability tables for Emits and Receives and inherited standard layout/widget receiver caps.
- Added the first capability-driven signal wiring modal and persisted targeted emit routes.
- Kept the Inspector Signal section read-only for Emits/Receives capabilities and moved persisted route
  listing/deletion into the wiring modal; capability headings use the normal Inspector label typography.
- Made Wiring-modal route additions/deletions transactional: the Builder controller owns an
  isolated modal session, Cancel discards it, and Apply performs the single config write. The modal uses
  paired Sender/Receiver columns and icon-only Trash actions.
- Simplified Inspector capability tables: Emits shows the capability id instead of a meaningless
  Channel column, tables fill their Inspector slot, Value types use tags, Receives sorts by channel,
  and inherited renderable-block channels are hidden behind a
  default-off translated switch derived from the central standard receiver contract.
- Replaced the Shadow editor's direct AntD Segmented control with `PhiSegmentedWidget` and added shared
  full-width `control`/`config` presentation while preserving intrinsic CMS rendering.
- Removed duplicate capability declarations and made duplicate concrete receiver signatures fail contract
  validation.
- Replaced direct Inspector Input, Switch, AutoComplete, Select, and InputNumber branches with shared
  Phi controls/widgets, including controlled autocomplete/custom-choice and icon-picker rendering.
- Routed plugin-declared padding fields through the same Inspector config-control resolver while
  preserving the Builder controller's canonical root-padding persistence action.

## Layouts and surfaces

- Added `PhiCollapsibleLayout` with sequential slots, editor affordances, editable source titles,
  translation-aware resolved live titles, configurable open state, anchoring, panel height, size, and
  spacing.
- Reused the Collapsible layout for Widget, Layout, and Region Inspector section groups.
- Centralized collapsible header/body spacing and default Inspector presentation.
- Made layout and surface plugins conform to the shared base signal and chrome contract.
- Restored intrinsic child anchoring by separating outer available-space fill from child fill policy.
- Kept Stack-specific active slot behavior local while standard block behavior remains centralized.
- Made Collapsible sequential keys and fallback labels consistently 0-based and preserved explicit
  empty `defaultOpenSlotKeys` arrays so live/preview layouts may start fully closed.
- Centralized the shared spacing scale and registered its padding/margin options through the common
  options-provider registry; Collapsible, Grid, and Padding controls no longer own repeated scale maps.
- Routed normal Inspector single- and multiple-choice fields through the real Phi Select/MultiSelect
  controls and the shared options-provider resolver instead of an Inspector-local provider path.
- Removed the obsolete Stack Control ID config from fields, parser, serializer, types, and client props;
  Stack identity is only its concrete layout/surface address.
- Implemented the documented `activeSlotKey/change:string` Stack receiver alongside the existing
  `activeSlotIndex/change:number` receiver.

## Codebase hygiene and module-graph audit

- Moved the remaining Builder controller orchestration behind a dedicated lazy
  `builder-controller-mount.tsx` entry. The controller registry loads only that small selected module;
  the 2,000-plus-line workspace controller is no longer a static dependency of registry, Inspector,
  mode-switch, chrome-control, or signal-route table clients.
- Extracted Builder route scope, page view models, page/region helpers, preview lifecycle, Inspector
  mutations, node finders, and selected signal-route resolution into one-way narrow modules. The
  Inspector and mode switch now subscribe only to the state fields they consume, and the duplicated
  Inspector/controller layout and widget node finders share one canonical implementation.
- Moved Page catalog loading, Create/Update dialog state, page navigation, and title signaling into one
  Page controller, and moved Save/Publish/Preview/Reset behavior for Shells, Pages, Navigation, and Theme
  routing into one draft-command controller. The remaining shared Builder scope/signal coordinator
  dropped from 2,480 to about 910 lines without adding another state owner or persistence path.
- Split the 1,200-line runtime signal module along its existing contract boundaries: transport and
  delivery remain in the roughly 210-line bus, mounted instance/runtime-context ownership lives in the
  registry, sender identity and emission boundaries live in the identity module, and standard block
  signal/state behavior lives in the renderable-block runtime. Internal consumers now import their
  narrow layer directly; no compatibility facade or second bus was added.
- Added a catalog-level installed ownership index for complete namespaced widget/layout type sets.
  Catalog construction rejects duplicate ownership without loading modules, loaded manifests must match
  their descriptors exactly, and inactive-type diagnostics can now name the exact owner module without
  making that module active or importing its implementations.
- Removed three dormant/duplicated Builder runtime paths: Effects labels now load through the global
  label-set contract and reach every structure-region scaffold; CMS revision and theme-review request
  parsing now has one server helper; runtime forms reuse the signal bus's canonical correlation-id
  creator.
- Centralized Gateway upstream path and query construction while keeping data-source reads and mutation
  writes as distinct public contracts.
- Consolidated four exact shared helpers: Builder/Pub brand wordmark text, server/client root-node CSS
  sizing, Button/Command Toolbar button-type parsing, and Link/NavLink external-href detection.
- Removed the parallel preview/general Region draft-key builders in favor of the canonical Builder key
  helper, removed its compatibility alias, and confirmed Inspector node lookup already uses the shared
  recursive node finders. Common-control and color label loading now also share runtime adapters instead
  of repeating plugin-local loaders.
- Consolidated normal, sequential, and async-resolved CMS layout child assembly into one server-local
  traversal and one sequential-slot reducer. Plugin resolution remains at the renderer boundary and no
  aggregate Client import was introduced.
- Split Builder workspace types and the shared state/draft store out of the controller monolith. Pure
  type consumers and 22 selector/draft consumers now depend on narrow modules instead of importing the
  full workspace controller; the controller file dropped from about 99 KB to about 88 KB.
- Extracted the pure region draft key/default/resolution boundary and the complete Builder state
  dispatcher from `developer-workspace.tsx`. Public/Core region surfaces no longer import the Builder
  controller module, and all state writes use the narrow workspace store.
- Removed the Structure Region runtime plugin's static dependency on its large Builder scaffold client;
  the server adapter now loads that client only when an active Structure Region widget is rendered.
- Rebuilt and remeasured Production after those cuts. Public and Builder remained effectively equal at
  about 1.14 MB encoded initial JS and still requested the same Workspace/Authoring signature chunks,
  proving that the shared `[root]` route graph—not a remaining Public source import—is the next boundary.
- Added the first thin static Area-host pilot at `/builder/[[...path]]` in the canonical site Skeleton,
  including its stable layout and page-owned parallel slots. Next emits a distinct Builder route, but
  Production browser measurements showed only the same one-script / roughly 24 KB decoded reduction on
  both Public and Builder; the installed catalog's client-reference boundary remains the actual payload
  blocker and is recorded as open work rather than masking the result by rolling out more route copies.
- Completed the physical controller boundary after the pilot: each lazily resolved module manifest owns
  exactly one static reference to its controller Client boundary. The server controller host selects
  only from the active module set; the site bridge and route hosts no longer carry a parallel all-module
  controller Client import map.
- Added explicit static filesystem hosts for Auth, Shop, Admin, Builder, Editor, Support, Accounting,
  Dev, and Custom. The initial locale catch-all used a Core/Form-only Public catalog, which incorrectly
  conflated installed modules with active modules and was subsequently removed; all Area hosts now use
  the site-installed lazy catalog while request-time Area settings determine the exact active set.
- Rebuilt and remeasured Production after removing the residual Core/Form server-authoring edges.
  Public fell from roughly 1.13 MB encoded / 3.63 MB decoded to 903,374 encoded / 2,788,104 decoded
  bytes and no longer requested measured Builder, scaffold, `renderEditor`, or widget-authoring
  signatures. Builder remained independently functional at 1,055,921 encoded / 3,365,448 decoded
  bytes.
- Recorded a fresh-cache browser-request baseline for the Skeleton dev runtime: Public `/en` requested
  87 scripts (21 Phi-named chunks), while Builder `/builder/pages` requested 96 scripts (32 Phi-named
  chunks). This is a development request baseline only; the subsequent Production analyzer exposed
  shared Builder reachability that cannot be inferred reliably from development chunk filenames.
- Added narrow CMS root-layout, root-page, root-slot-page, error-page, request, and plugin subpaths and
  migrated the site skeleton away from the aggregate `cms` and `server-helpers` route imports.
- Removed internal imports through the package's own `cms`, `helpers`, and `server-helpers` barrels;
  internal source now uses leaf modules and no longer pulls aggregate entry graphs into server helpers.
- Removed unused surface contract/server wrappers, Sidebar Navigation and Table client re-export
  wrappers, the obsolete Navigation Key config widget, the unused render-debug color mirror, and stale
  `package.json#files` entries for removed wrappers.
- Merged the duplicate HTML content resolver/type path into the canonical HTML widget config module.
- Indexed layout and widget children once in the recursive CMS layout renderer, removing repeated
  full-tree filtering and sorting from the render hot path.
- Centralized CSS-length normalization, cached date/time formatting, registry-key uniqueness checks,
  and shared spacing token keys. Reused the common spacing scale for margin instead of maintaining an
  identical numeric object.
- Enabled `noUnusedLocals` and `noUnusedParameters` for all package TypeScript/TSX sources and removed
  the unused Builder/shell parameters exposed by that stricter check.
- Recorded the remaining entry-point, Builder-workspace, renderer, helper, and generated-output work in
  the active findings file instead of treating development cache size as production bundle evidence.
- Added the Builder-owned widget authoring mutation context and migrated Command Toolbar add/remove/
  reorder tools to atomic config patches with live signals disabled. Dynamic signal subcontrols now use
  declarative collection metadata instead of a Command Toolbar type branch, and removing a subcontrol
  prunes routes to its address through the existing atomic draft lifecycle. The same central mutation
  path now updates widgets nested inside layouts instead of only direct root children.
- Split live layout anchoring from authoring overlays and moved inline-title editing plus scaffold controls
  behind Client-owned lazy boundaries. Region rendering now receives preview state explicitly instead of
  importing the Builder workspace store.
- Replaced the first-party widget switch, global layout authoring map, and global controller-definition
  list with module-owned `AuthoringClient` boundaries and serializable controller descriptors. Builder
  Canvas now composes authoring providers only from its active target-Area module sandbox; third-party
  npm modules use the same public authoring-client factory. Generic live layout Clients receive Builder
  controls by injection and no longer import scaffold overlays or inline authoring editors.
- Moved Structure Region and Page Region layout ownership from Core into the Builder module, matching
  their documented Canvas/shell-adapter role. The manifest validator now validates layout ownership per
  owner module rather than assuming every layout belongs to Core.
- Rebuilt the isolated Skeleton Production runtime after the module-boundary changes. Public requested
  56 scripts / 1,021,675 encoded bytes / 3,230,968 decoded bytes; Builder requested 66 scripts /
  1,072,042 encoded bytes / 3,446,750 decoded bytes, with its additional route chunks absent from the
  Public request. Public and Builder smoke checks remained renderable without module diagnostics.
- Replaced the process-global option-provider map and registration import side effects with module-owned,
  namespaced data-provider descriptors and React-scoped executable Provider Clients. Live runtime loads
  implementations only from active modules; Canvas retains provider metadata but loads only explicitly
  static authoring providers such as spacing/theme metadata. Asset and Builder DB/store-backed providers
  remain live-only, and generic Inspector fields select providers from the target-Area descriptor set.
- Added concrete `region:<region-key>` endpoints to the shared Wiring catalog with page/area ownership
  derived from the canonical Region contract. The single Region Client renderer now registers through
  the central renderable-block runtime and consumes the same visibility, enabled, geometry, appearance,
  opacity, and effects receiver capabilities as widgets, layouts, and surfaces. Live slot-child receivers
  now use the same containing page/area scope instead of a family-default scope, and Region rendering no
  longer maintains parallel server and client style implementations.
- Centralized Builder and server-preview render-tree construction so authoring plugins receive the
  concrete current layout/widget tree instead of an empty synthetic tree.
- Added demand-materialized controller endpoints to the Wiring catalog. The active module's authoring
  plugin evaluates its existing `requiredRuntimeControllers` resolver for the concrete widget, and the
  Builder stores only the resulting serializable controller settings for the current page/area context.
  It does not mount target-Area controllers and never reconstructs instances from persisted route
  receiver strings.
- Migrated Simple Text, Markdown, Rich Text, Image, Icon, and Description Canvas editing from
  renderable-block Runtime signals to the Builder-owned `authoring.updateConfig()` path. Removed the
  Inspector signal-to-draft bridge, its node-id patch action, and the obsolete buffered-editor flush
  broadcast. Canvas Runtime emissions now remain disabled while inline authoring is active; structural
  insert/delete/move operations continue through the central scaffold mutation path.
- Added persistence-owned publish materialization in `phi-server`. Page and Area publish now assign
  global positive identities from the server-owned sequence to new negative layout/widget nodes, reuse identities by stable
  `instanceKey`, remap structural references plus numeric widget/layout/surface signal receivers and
  subcontrols, and activate the revision in the same database transaction. A client-supplied positive id
  is retained only when it exists with the same `instanceKey` in the previous published revision;
  unresolved negative targets fail publish. Node identities remain stored only in revision `tree_json`.
- Separated scaffold Wiring activation from Inspector activation and corrected the Builder Signal Routes
  table response path: controller replies now derive their scope from the registered concrete response
  receiver instead of copying the request scope. Page-owned Inspector tools can therefore query the
  area-owned Builder Controller without leaving the Routes table in its loading state.
- Moved the Wiring modal out of the Inspector Drawer into the Builder host. Scaffold Wiring tools are
  now its only opener; Inspector Signal sections contain only read-only Emits/Receives capabilities and
  no longer require a forced Drawer mount or a second Wiring button.
- Removed the static first-party Builder Page seed catalog. Page targets now declare required `title`,
  `pageKey`, and canonical `storagePath` metadata; Builder selection, labels, initial scope, navigation,
  revisions, persistence, and preview paths consume the active module Preset Registry catalog explicitly.
- Removed the hardcoded Theme plugin Registry. Core Theme presets are now module-owned Theme
  contributions with required target metadata; Builder discovery filters the central Registry by the
  active module set, and Root/Client resolution consumes an explicitly materialized preset list. The
  former registry/map exports and unknown-key fallback were removed.
- Corrected the Shell Structure and Media preset routes to their registered controller/instance scopes:
  the Sider layout switch now targets the Area-mounted Builder Controller, Asset controls target the
  Area-mounted Asset Controller, Asset pagination feedback uses the controller mount scope, and the
  Upload button targets its page-owned Upload Area widget with the existing visibility-toggle contract.
- Separated Theme draft-preview propagation from Root Theme application. Theme control changes now flow
  through the Theme Controller back to the preview widgets, the Canvas mode switch is page-local, the
  Header mode switch remains the explicit Root Theme command, and the preset Select receives the actual
  loaded draft preset through its declared selection route.
- Restored centralized layout/runtime presentation behavior: Card widgets are intrinsic in the block axis
  so Content Layout anchoring can position them, Shell content hosts stretch Page content through the
  remaining viewport height, and disabling animated effects in Canvas no longer disables static
  transparency.
- Made the Builder save path acquire the canonical Working Draft allocation before its first write in a
  browser session. Existing drafts are now written with their required `revisionId`, optimistic `version`,
  and monotonic `nextNodeSequence` even when no new CMS node was inserted before Save.
- Replaced the global Admin/Editor search signal helper with concrete CMS-instance and Editor-controller
  routes. Admin Users/Locales receive only their page-owned query routes; Editor search/actions target the
  Area-mounted Editor Controller, which owns the translation workspace mutations.
- Made Media Picker signaling declarative. The Client no longer creates its own CMS/subcontrol/controller
  addresses or broadcast selection route; kind, flags, query, path, reload, pagination, and optional
  selection outputs consume declared capability routes, while embedded pagination reports through the
  parent Picker capability.
- Constrained Page-title snapshot listeners to Page scope, explicit broadcast delivery, and the approved
  Core/Builder controller senders.
- Added the recursive generic `collection` Inspector field contract with stable item-key metadata,
  declarative nested fields, add/remove/reorder controls, and item-count constraints. The shared
  Inspector renders it without plugin-type branches.
- Made the generic Table widget fully authorable through declarative fields for controller/table binding,
  columns, nested filter options, search, pagination, sorting, selection, row/bulk actions, empty state,
  and presentation. Row and bulk actions share one config-field definition.
- Added the optional client-only Form Builder runtime module and its Area-mounted headless controller
  lifecycle without inventing persistence capabilities.
- Added namespaced module-owned form field, validation, and handler provider descriptors; catalog and
  active-module resolution now enforce provider namespace, ownership, and uniqueness.
- Added package-namespaced module-owned Preset Forms as explicit Server Area catalog contributions.
  Active-Area resolution now validates every referenced field, validation, and phase-specific handler
  provider; global Form registration, import side effects, bare Form ids, and synthetic numeric ids are
  outside the v1 ABI.
- Prepared Form persistence for future authoring without another schema migration: runtime reads only
  Published Site overrides, while the v1 revision table reserves one Working Draft, one Published row,
  and archived Published revisions per Site/Form. Visual Form authoring remains deferred to P2.
- Added explicitly composed executable form-provider registries and the generic descriptor renderer,
  with visible missing-provider diagnostics and no global mutable registration or fallback.
- Unified shared form preset field metadata on the provider-key contract and migrated Confirm and
  Reset Password editable controls and validation to the descriptor renderer while retaining their
  domain bootstrap and result lifecycles.
- Restored Inspector selection after Canvas signal isolation by moving scaffold, Region, and slot
  selection to one centralized Builder authoring operation shared with the Builder Controller's
  external selection listener. Removed the obsolete `inspector/open` mixed-contract reader; target
  Canvas Runtime signals remain isolated.
- Completed the Core Runtime Controller contract and adapters: closed transient notification/message
  payload readers now drive the shared application service, and the Page snapshot output is centrally
  emitted only into the active Page partition.
- Restricted the Builder Shell Canvas server payload to the selected target Area's drafts. The client no
  longer receives a complete cross-Area shell-draft map while rendering one isolated Canvas target.
- Replaced the generic `presetKind + targets[]` Registry with separate versioned Area-shell, route, and
  theme descriptors. Added immutable Area definitions, module eligibility metadata, exact/dynamic route
  compilation with collision checks and typed params, navigation-injection ABI validation, and the clean
  `(ownerModuleId, presetKey, nodeKey)` preset-node identity. Removed the unused arbitrary Route Plugin ABI,
  its site-bridge surface, the old registry files, and the Public Form Builder Server/Client contribution.
- Moved `eligibleAreas` into each module definition as the single Server/Builder/Inspector metadata source.
  Locked ownership now resolves from the Area definition; the hard-coded exclusive-module map and automatic
  Builder-module persistence were removed, and Area settings reject required or base module ids.
- Replaced the temporary Core-owned Public-family grouping with explicit Public, Auth, Shop, Support, Accounting,
  Developer, and Custom base modules and Area controllers. Each of the ten canonical Areas now has one distinct
  locked base owner.
- Removed the remaining Public-host catalog/manifest grouping. Public, Auth, Shop, Support, Accounting, Developer,
  Custom, Admin, and Editor now expose separate Server catalogs and Controller Client manifests containing only
  their own locked base module plus modules eligible for that Area. Their Skeleton route hosts use the matching
  bridge and provider. Builder alone retains the complete target-Area Server/Controller/Authoring union for its
  isolated Canvas; target-Area modules remain inactive in the outer Builder runtime.
- Replaced full-tree navigation presets and persistence with Area-base-owned surfaces, route-owned module injections,
  immutable descriptor-derived hrefs, and Draft/Published override overlays with tombstones. Builder now selects only
  active declared surfaces, edits labels/icons/placements, restores hidden module links, and no longer exposes free
  navKeys, Page-source drops, arbitrary links, separators, or the legacy navigation item flags/type ABI.
- Deleted the separate required Form runtime module and its common Client loader. Platform Core now owns generic
  field/validation descriptors and demand-materializes the Form controller only for resolved form widgets. Public owns
  Contact, while Auth owns Login, Registration, Confirmation, Reset, and their handlers/routes. The shared Account
  session control remains Platform-owned for internal Area shells but is absent from the Public baseline; Auth is
  optional in Public and its routes/navigation/widgets disappear together when inactive. Form Builder remains its own
  optional authoring module.
- Default-select Auth in new and fallback Public Area shells because protected Area requests use its standalone
  `/login` route as the authentication entry point. Auth remains an optional Public module for explicitly persisted
  Area configurations, while the versioned Public shell preset no longer creates an unusable anonymous bootstrap.
- Replaced the generic `required` module flag with one explicit `kind: "platform"` Core contribution. Runtime,
  request routing, Builder navigation/palette/persistence, and Inspector activation now compose Platform Core plus
  the Area definition's locked base module plus selected optional modules; Platform/base ids cannot be persisted.
- Restored the explicit stable Area-local `pageKey` on route descriptors after removing generic preset targets.
  Builder Page catalogs now use that key for Draft/Published identity and retain the descriptor `path` only as the
  immutable route/storage path; the compiler rejects duplicate page keys within an Area.
- Made the lazy Builder Controller's server-catalog handoff explicit through `builderCatalogHydrated`. Page headers,
  Page option providers, and Page-scoped Draft status now wait for that handoff instead of resolving an empty startup
  key, while unknown non-empty Page keys still fail the strict active-catalog contract.
- Bound Area-shell Draft status to the selected Builder target Area's immutable source-preset identity. The status
  widget now waits for the hydrated descriptor catalog and addresses Area drafts by `area`, `ownerModuleId`, and
  `presetKey`; it no longer sends the incomplete legacy Area-only request from the outer Builder runtime.
- Moved the Builder `/theme` and `/media` route presets out of the locked Builder base module and into the optional
  Theme and Asset modules. Their sidebar entries are now module-owned navigation injections anchored to exported
  Builder items, disappear together with an inactive module, and derive preset-node identity from the owning module.
- Added optional Dashboard and Revisions modules with their own controller identities, Server/Controller/Authoring
  contributions, route presets, and navigation injections. Admin and Builder retain stable base `/` routes without
  Dashboard; Builder no longer owns the Revisions route or its five widgets. Revisions signaling now uses the
  Revisions controller address, and the replaced Builder-prefixed widget type keys were removed.
- Split Localization, Observability, and User Management out of the locked Admin base module. Each optional module
  now owns its controller, widgets, Admin route preset, Authoring contribution, and sidebar injection. The Admin base
  retains only `/`, `/settings`, its shell, and `admin:sidebar`; the obsolete singular `/locale` route was removed in
  favor of module-owned `/locales`. Their public widget type keys were renamed from the obsolete `admin-*` family to
  module-owned `localization-*`, `observability-*`, and `user-management-*` keys without compatibility aliases.
- Corrected navigation ordering when different modules contribute `before` and `after` placements against the same
  anchor. Each side is now ordered independently and deterministically instead of inheriting the first contribution's
  placement direction.
- Added the active route table's dedicated `pageKey` index and switched Builder preset hydration to it. The initial
  Builder Page selection is now derived from the active root route (then active catalog order) rather than passing a
  Page identity into the URL-path resolver. Builder navigation widgets also wait for the same catalog handoff.
- Removed every Area base module from optional-module selection and reject all base ids in persisted selections,
  including base modules eligible for another Area. Builder Canvas sandbox resolution now receives the target Area,
  so Platform Core and that Area's locked base module are active before optional modules are loaded.
- Moved lightweight widget/layout definitions and lazy Server render loaders into each catalog entry. Executable
  module objects now contain only controller/provider implementations; lazy module UI providers are catalog loaders.
  The duplicated `ownership.ts`
  map and module-level widget/layout arrays were deleted, and catalog validation derives ownership directly.
- Added executable route-snapshot and navigation contract suites to `runtime-modules:check`. Route resolution now has
  one shared tested decision path for exact preset snapshots, dynamic Site-page precedence, installed-preset
  materialization, and inactive-module routes. Preset-version comparison used by Revisions is centralized and tested.
  Navigation tests cover surface ownership, exported anchors, cross-module anchor rejection, deterministic sibling
  ordering, immutable route targets, overlays, tombstones, restoration, and stale-reference diagnostics.
- Made active runtime-module resolution metadata-only. Executable module objects now load only for referenced
  widget/layout UI-provider owners, concrete Live data-provider keys, materialized controller settings, or explicitly
  static Canvas authoring providers; a contract suite verifies that activation and empty trees execute no loaders.
- Replaced active-module-wide Live data-provider composition with resolved-tree provider demand, including independent
  Page and parallel-slot boundaries. Ordinary Live Areas no longer hydrate the Builder-only runtime-module metadata
  context; the full descriptor provider remains scoped to the Builder runtime and isolated Canvas sandboxes.
- Extended runtime demand contracts with installed-but-inactive widget diagnostics and target-Area sandbox isolation.
  Missing widget owners remain unloaded, while each sandbox resolves exactly Platform Core, its own locked Area base,
  and its explicitly selected optional modules.
- Deleted the obsolete aggregate runtime-module definition and first-party preset barrels. Area catalogs already
  consume owner-scoped module definitions and preset descriptors directly; the complete First-Party catalog remains
  only as the intentional Builder Server catalog rather than a compatibility loader path.
- Split the Widget loader ABI into mandatory per-type Runtime and Preview edges. Registry resolution reads each
  node's render mode and executes only the required loader; Runtime and Preview plugins have distinct structural
  types and failure maps, while slot-size metadata remains descriptor-owned. Contract checks require both loaders
  for all 90 first-party Widgets and verify that Live never executes Preview or vice versa.
- Physically separated Builder Pages/Shells workspace Preview plugins from their heavy Runtime workspace imports.
  Their lightweight skeleton previews no longer make the Canvas preview path import Pages/Shells orchestration.

## Compiled package, ownership, and module-graph audit

- Built and packed the real `@phis/ui` ESM artifact, installed it into a temporary Skeleton without
  `transpilePackages`, and verified package export resolution, a single compatible React/Next/Ant Design dependency
  set, Skeleton typechecking, a Webpack Production build, Public rendering, and authenticated Builder redirects.
- Made the server the sole emitter of published `--phi-*` root variables. The Client root now resolves only Ant
  Design `ConfigProvider` state; custom palette generation lives in a separate Theme/authoring boundary and
  published Phi variables change only with a new server render.
- Moved Media file-drop window listeners from the global Root to the Media upload widget. Split global runtime layout
  geometry from Builder debug/editor scaffold CSS, moved Builder/authoring styles to the Builder Authoring entry,
  and removed HTML-editor-only selectors from global Root CSS.
- Reduced the string-driven icon boundary to a small Core icon set. Management icons and Builder widget/layout
  motifs now load through separate lazy Client boundaries; Iconify remains demand-loaded and no wildcard Ant Design
  icon import was introduced.
- Added `pnpm audit:graph` for public-entry reachability, Runtime and Client source sizes, dynamic-import-aware dead
  source detection, Client-to-`server-only` violations, broad Client barrel imports, and exact duplicate files.
  The audit covers 68 entries and 1,134 sources and currently reports zero unreachable sources, zero invalid
  Client/server crossings, and zero exact duplicate files.
- Replaced all 52 Runtime imports of the broad `types.ts` barrel found in Client-reachable code with direct leaf
  contract imports. Removed four stale `package.json#files` patterns; the remaining manual source manifest is kept
  as an explicit follow-up because the compiled `dist` manifest is already authoritative.
- Removed the stale Shells full-height-sider TODO after aligning Preview and Editor with Live: full-height spans the
  shell, while embedded mode fills its Sider region through `footer_main` rather than collapsing to intrinsic
  content height.

## Runtime-module, route-preset, and navigation ABI

- Replaced the generic required-module and preset registries with one locked base module per Area, optional
  Area-eligible modules, separate Area-shell/route/theme descriptors, immutable route patterns, and versioned preset
  snapshot identities.
- Split Server, Runtime Client, Preview, and Authoring implementation graphs; Builder Canvas resolves only the
  selected target Area base plus its selected optional modules.
- Replaced materialized navigation copies with base surfaces, module injections, and Site-owned overlays supporting
  stable placement, tombstones, custom links, containers, separators, origin metadata, and module-owned immutable
  route targets.
- Added the Page navigation source, controller-owned authoring operations, sortable table behavior, custom nav keys,
  module-origin display, external-link target handling, and container deletion that promotes children one level.

## Public and App Area ABI

- Renamed the canonical Public Area from `pub` to `public`, including `public:*` navigation scopes and the explicit
  `/public` technical route. Locale-prefixed URLs remain the normal Public live paths.
- Replaced the fixed `auth`, `shop`, and `custom` Areas and their Skeleton hosts with one authenticated `/app` Area.
- Kept Auth and Shop as optional modules eligible for `public` and `app`; site-specific capabilities use the same
  module contribution contract instead of creating Core Areas.
- Reduced the canonical Area set to `public`, `app`, `admin`, `builder`, `editor`, `support`, `accounting`, and
  `dev`. No old Area-key, route, package-entry, navigation-scope, or persisted-data aliases remain.
- Kept `/api/auth/*` and `/api/shop/*` unchanged because they are domain transports rather than CMS Area routes.

## Public Production baseline and CMS hot paths

- Completed the Runtime/Preview/Authoring loader boundary, static Live layout/Region path, target-Area Builder
  Authoring boundary, Turbopack production comparison, and repeatable cold-browser payload measurement.
- Reduced the final Public Turbopack baseline to 38 initial scripts, 700,732 transferred bytes, and 2,147,655
  decoded bytes while retaining zero Builder modules in the Public Client-reference graph.
- Rebuilt and compared Public, Builder Pages, and Admin Users after the declarative Table and Collection
  provider migrations. Public measured 41 initial scripts / 705,618 transferred / 2,154,259 decoded bytes;
  Builder measured 57 / 918,979 / 2,896,153; Admin measured 41 / 707,426 / 2,166,389.
- Confirmed from the downloaded Production chunks and Next's integrated Turbopack analyzer that Builder
  implementations remain absent from Public and Admin. Admin replaces the Public Area chunk with one
  similarly sized Admin chunk; Builder adds its isolated authoring chunks.
- Indexed recursive layout children once and split request-wide module-scope resolution from tree-specific runtime
  registry resolution without retaining aggregate Client graphs.
- Completed the source/package dead-code and duplicate-helper audit: package publication is generated from `dist`,
  unused-symbol checking remains enabled, and trust-boundary-specific record guards remain local.

## Localization declarative tables

- Moved Admin Locales and Editor Translations loading, filtering, pagination, and mutations into the
  area-mounted Localization Controller. Both domain Clients now render the shared declarative
  `PhiTableWidget` and use the correlated controller-action path for modal edits and locale settings.
- Removed the process-global Editor Translations workspace and the translation-specific signal behavior
  from the Editor Controller. Editor header controls now coordinate with the page table through explicit
  signal routes, while the Localization Controller broadcasts only the closed workspace option snapshot.
- Made the Localization module eligible for Admin and Editor, added it to the default Editor module set,
  and moved all translation widget ownership and Authoring loaders into that module. Builder catalog
  assembly now merges repeated Area projections of the same module without duplicating its definitions.
- Extended the generic table response with optional JSON companion metadata and columns with a static
  localized value map. Neither extension creates a second data or mutation path.

## Module-owned Picker availability

- Made the resolved target-Area module set the sole Picker availability contract: Platform Core plus
  the locked Area base plus active optional first- and third-party modules. Removed the reserved
  `internal`/`admin` category blacklist and retained active module/type filtering only.
- Kept `category` as presentation metadata for grouping, ordering, colors, and search, and closed it
  to the shared semantic CMS plugin category set. Package ownership is exposed as a separate Picker
  filter for Widgets, Layouts, and Surfaces.
- Reclassified former internal workspace definitions semantically and moved Test Block from Platform
  Core to the locked Builder module.
- Replaced the Contact, Login, Registration, Confirmation, and Password Reset CMS Widget aliases with
  one generic Form Widget that references active module-owned Preset Forms by `formId`.
- Documented that third-party modules may be eligible for every canonical Area and are activated per
  Site/Area; Widget-local Area lists and parallel authoring policies remain outside the ABI.

## Complete Widget catalog and third-party reference Module

- Audited all first-party Widget definitions and the installed `@phis/support` Widgets through the
  owner-scoped runtime-module catalogs; no parallel global Widget definition registry remains.
- Exported `assertPhiRuntimeModuleCatalog(...)` and made the Site bridge validate the complete combined
  catalog. First- and third-party artifacts now share ownership, loader presence, render-policy,
  signal-metadata, category, access, and declarative-definition checks after Site composition.
- Exported the shared control config parsers through the server-safe `@phis/ui/controls/config`
  entrypoint and migrated
  `@phis/support` away from its local signal parser and direct Ant Design action buttons.
- Replaced the Support Widgets' literal Preview placeholders and live-fetching authoring render with
  the real presentation path backed by stable, non-interactive sample data and no Preview API calls.
- Removed the unregistered `PhiTextBoxWidget` implementation and public export. `simple-text` and
  `card` remain the canonical text-oriented CMS contracts.

## Dimension Control and CMS Widget

- Replaced the legacy Builder-owned, self-sizing dimension-input special path with the Core-owned
  `PhiDimensionWidget`. It follows the standard CMS config, Runtime/Preview/Authoring registration,
  and `size` signal contracts without a compatibility alias.
- Rebuilt `PhiDimensionControl` as two compact number/unit pairs backed by Ant Design `InputNumber`,
  `Select`, and `Space.Compact`. Supported units are the closed `px`, `%`, `em`, `rem`, `vw`, and `vh`
  set; persisted `PhiRenderableBlockSize` values keep numbers for `px` and CSS strings otherwise.
- Kept presentation and CMS responsibilities separate: Forms and Inspector fields use the Control,
  while only the Widget owns config parsing, signal routing, labels, and module discovery.

## Scalar Length Control and Geometry typing

- Added the Core-owned `PhiLengthWidget` and its `PhiLengthControl` over the closed `px`, `%`, `em`,
  `rem`, `vw`, and `vh` unit set. The Widget owns the new typed `length` signal channel; Inspector and
  Geometry consume the Control directly.
- Made `PhiDimensionControl` a composition of two Length Controls separated by the shared compact gap,
  so scalar and paired dimensions no longer maintain parallel parsing or Ant Design implementations.
- Replaced every declarative `css-size` Inspector field with `length`, including layout widths, gaps,
  table-column width, Parallax dimensions, and Collection View sizing. No free-text CSS-size field
  remains in the v1 authoring ABI.
- Switched Geometry `offsetTop` to the scalar Length Control, including negative values, and hardened
  `zIndex` across Geometry, Renderable Blocks, layouts, and signals to a unitless integer rendered by
  `PhiNumberControl`.

## Navigation menu presentation on the Control layer

- Added `components/controls/phi-menu-control.tsx` as the owner of the Ant Design `Menu` primitive and
  of its item interface. Widgets describe navigation as `PhiMenuControlItem`s; `menu-items.tsx` no
  longer returns `ItemType` from `antd/es/menu/interface`. `PhiTabsControl` already existed and needed
  no work.
- Centralized the theme wiring that the menu surfaces had each carried: the scoped `cssVar` key, the
  `ConfigProvider` and the Menu component tokens now live in the Control. The stacked and horizontal
  modes keep distinct item geometry — only the stacked menu drops item inline margin and item
  backgrounds, because the horizontal item spacing is what separates entries in a header bar.
- Migrated `sidebar-navigation-body.tsx` (both the live and the Builder preview client) and
  `header-navigation.tsx`. The `Menu as unknown as ForwardRefExoticComponent` cast in the sidebar is
  gone; it existed to pass a `collapsedWidth` prop that was only ever a component token.
- Closed the boundary in `validate-control-boundaries.mjs`: `Menu` and `Tabs` joined the
  primitive-owner map, an `antd/*/menu*` import outside the Control is rejected, and `controls.ts`
  must export `PhiMenuControl`.

## Dropdown menu presentation on the Control layer

- Added `components/controls/phi-dropdown-control.tsx` as the owner of the Ant Design `Dropdown`
  primitive. Entries are `PhiMenuControlItem`s, the same description the navigation menus use.
  Migrated `phi-avatar.tsx`, `phi-locale-switch.tsx` and `area-menu-body.tsx`, plus the two item
  builders `phi-account-menu.tsx` and `account-preview.tsx`.
- The trigger mechanics existed three times: the press stamp and the 250 ms guard against Ant Design
  reopening a dropdown when the closing click lands on the trigger, `["hover", "click"]` with
  controlled open, and the chevron-when-non-empty rule. They live in the Control now, the guard
  window as one named constant.
- Moved the pill trigger into `phi-dropdown-control.module.css`. It had drifted — two surfaces wrote
  raw `var(--ant-*)` strings where the third read `usePhiConfig()` tokens — and its hover was React
  state in all three. Hover is a CSS state now, so a trigger no longer re-renders to change its own
  border colour, and the avatar's inner label pill lights from the surrounding trigger through a
  descendant selector.
- The active entry now consistently stays in the list and renders disabled (operator decision
  2026-08-19). The locale switch previously filtered it out; a Site with a single locale still shows
  no menu, because a dropdown that cannot open must not present itself as one.
- `PhiAvatar.menuItems` no longer types against `MenuProps["items"]`. That leak was published
  through `navigation.ts`, so the Ant Design item shape had been part of the package API.
- Closed two validator gaps: `readAntdNamedImports` never matched `import type { … }` at all, and
  the owner rules only checked value primitives. Prop types (`MenuProps`, `DropdownProps`, …) are
  rejected outside their Control now, and `Dropdown` joined the primitive-owner map.

## Area menu visibility on the access policies

- `buildPhiVisibleAreaMenuItems` (`components/widgets/area-menu-items.ts`) projects the menu from
  `PHI_ALL_RUNTIME_AREA_DEFINITIONS`, filtered with `canPhiViewerAccess` against each Area's own
  `accessPolicy` — the same check the Area routing performs in the root layout. The hand-maintained
  if-chain in `components/widgets/server/area-menu.tsx` is gone, along with its five Area literals
  and five base-path literals.
- This fixed a real defect. The old chain asked for base roles, and three of its four branches
  omitted Developer although `Structure authoring`, `Content editing` and `Accounting` all include
  it: a Developer without further roles saw only App and Admin, and had to know the URLs for Builder,
  Editor and Accounting. The `isAdmin` branch fell away too — `canPhiViewerAccess` already carries
  the Site-superuser rule.
- Removed the `viewer.resolvedArea` conditions. ACCESS.md defines it as a landing destination and not
  an authorization boundary, and section 9 lists "direct Area compatibility checks based on one
  `resolvedArea`" among the removed target-v1 contracts; the menu was an overlooked remnant, where
  the condition papered over the incomplete role check for one Area per viewer. `resolvedArea` is now
  only what the contract says: the redirect target in the root layout once access was denied.
- `scripts/validate-access-policy-contracts.ts` pins the outcome per role, including the case that
  was broken, so the menu cannot drift away from the Area policies again.
- Ordering follows the Area declarations, and Public stays out: it is the Area a viewer is already
  in, not one to switch to. Both were implicit in the old chain and are now stated and asserted.

## User management read/write split verified against phi-server

- `phi-server` splits `/api/site/admin/users` per method: `GET` takes
  `requireSiteDeveloperApiContext`, while `POST`, `PUT`, `PATCH` and `DELETE` all take
  `requireSiteAdminOnlyApiContext`. Its policy constants in `src/lib/authorization.ts` are structurally
  identical to the shared ones, including the Admin superuser rule, so both sides speak the same
  language.
- The frontend already matched that split, through a path an `accessPolicy` search does not reach:
  `user-management-controller-plugin.tsx` projects `permissions.readOnly` and the page binds cell
  editing, the create action and the edit and delete row actions to it through `disabledWhen`, with
  the controller refusing the same actions. The route stays on `PHI_VIEWER_ACCESS_DEVELOPER_TOOLS`:
  entry is the route's decision, capability is the surface's.
- A brief excursion had made the route Admin-only, which removed a Developer's read access that both
  the server and the page had deliberately granted. Reverted; the regressions now assert the intended
  split — Developer and Admin both reach route and nav entry, a Builder reaches neither.
- The server additionally refuses self-directed role, enabled-state and delete changes, and blocks
  Medusa-managed accounts from editing and deletion. None of that is mirrored in the frontend.

## Controller permission projections on named policies

- `ACCESS.md` gained section 6, "Capability inside an authorized surface": access decides entry, the
  owning controller resolves capability once from a named policy and publishes it as a permission, and
  the surface binds `disabledWhen` conditions to it. Sections 7-10 renumbered accordingly. The rule
  entries in `AGENTS.md` and `README.md` that forbid role branches now name this as the answer, so a
  module author reading either finds the pattern instead of inventing a Widget-level role check.
- `user-management-controller-plugin.tsx` reads the permission from
  `!canPhiViewerAccess(runtime.viewer, PHI_VIEWER_ACCESS_SITE_ADMIN)` instead of
  `!hasPhiBaseRole(runtime.viewer, PhiBaseRole.Admin)`. Identical answers today, since the Site-admin
  policy is the Admin role and the superuser rule is the same role, but the policy form survives a
  widened mask. It was the only such projection in the package.
- `ACCESS.md` section 5 said user, role, accounting and Site-administration contributions are
  Core-Admin-only, which the Developer-readable `/users` route contradicts. It now scopes the rule to
  changing them and points at the entry/capability split.
- Removed `PHI_CORE_RESOLVED_STAFF_AREA_KEYS` and `PhiCoreResolvedStaffAreaKey` from
  `constants/cms-areas.ts`. Nothing read either one. They were the remnant of a role-to-landing-Area
  mapping `phi-server` owns; the frontend only receives its result as `viewer.resolvedArea`. A dead
  export that looks authoritative invites a second Area list next to the definitions.

## Internal reference contract regressions

- `scripts/validate-reference-contracts.ts` grew from a codec and picker-presence check into a full
  contract regression. It now runs the real server resolver in process: `runWithPhiRequestRuntime`
  supplies the request scope, `setPhiRequestNavigationContext` the compiled first-party catalog, and a
  `fetch` stub the reference projection. The script therefore needs the `react-server` condition, like
  the Form gateway check.
- Covered: Site and Module Page ownership including collision freedom across module id and preset key;
  rejection of every invalid identity and encoding; fragment preservation through `#`-prefixes,
  whitespace, embedded `#`, Unicode and malformed escapes; Asset id validation; deduplication and
  invalid-id filtering before the request; missing, pathless and tombstoned targets resolving to
  nothing; a malformed projection failing loudly; and Module targets resolving only when the current
  Area, module activation and the route's access policy all agree.
- The external-document branch is covered against bypass encodings: entity, single and double
  percent-encoding, partial escapes, case and interspersed control characters all lose the link while
  keeping the visible text. Legitimate relative, fragment, `mailto` and `tel` targets still resolve
  against the document URL, and a remote `javascript:` href survives URL resolution but never the
  sanitizer behind it.
- The Client boundary is asserted structurally as well: the sanitizer wraps the projection result
  without the authoring flag, and translation runs after it, so no unresolved `phi:` string can reach a
  Client component even if a future projection path forgets to unwrap one.
- The coverage found a defect. `REFERENCES.md` requires Page resolution to produce the current
  locale-/Area-correct href, but `resolvePhiWidgetInternalReferences` returned the stored CMS path
  verbatim. Both sources are Area-relative: the server projects `scope.path` and the route table holds
  the descriptor path. A public Page link therefore rendered `/about`, which the `[root]` route reads
  as a locale segment and redirects to `/de` with the path dropped; a staff Page link rendered
  `/users`, which resolves the same way. Navigation never had the bug because it localizes through
  `resolvePhiNavHref`. The resolver now shares that helper, so references produce the href Navigation
  would, and the widget runtimes gained `locale` in their resolver input.
- Not covered in process: the translation round trip. `trBulk` resolves the request locale through
  `next/headers`, which has no counterpart outside a Next request. Carried as a P1 runtime regression.

## Media Space contract regressions

- Added `scripts/validate-media-space-contracts.ts`, the first media validation script, wired into
  `runtime-modules:check`. It runs as a plain `tsx` script rather than under the `react-server`
  condition, because the media surface is Client code: the Collection runtime, the preview store, the
  Folder helpers and the upload flow all import React client modules.
- Space isolation is asserted from the direction that matters: nothing in the shared UI may name a
  Space. `PHI_ASSET_COLLECTION_DATA_SOURCE` carries exactly a provider key and a resource key with no
  params, the Collection resource declares exactly the `kind`, `presentationFlags` and `folderId`
  filters, and `buildPhiAssetCollectionQuery` emits no other filter key. `activeSpace` is reported
  state only: a User or Group Space survives verbatim into the store, a payload without meta clears it
  instead of leaving a stale claim, and the Space id stays on the tile.
- The public Asset reference projection is held to its own documentation. Its type block must not name
  `spaceId`, `folderId`, `siteId`, audit attribution, checksum, byte size, `meta`, lifecycle or
  delivery policy, so a convenience field cannot leak a Space id onto a rendered page.
- Folder handling is covered end to end: nesting and sort order, path and cascader construction, value
  round trips, and the two corruption cases the Picker must survive -- a cyclic parent chain and an
  orphan pointing at a missing parent. A Folder value only ever selects a Folder present in the current
  projection, so a stale value from another Space resolves to nothing.
- Picker and Inspector binding: every Picker signal route addresses the Asset controller, route keys
  stay unique so two Pickers on one Page cannot collide, the capability set is independent of prefix
  and scope, Inspector/Overlay/Media-page instance ids do not collide, and the Picker reads the
  Collection provider instead of opening its own request path.
- Upload context inheritance was inline in a `useMemo` and therefore untestable. Extracted as
  `resolvePhiMediaUploadInitOptions` in `media-upload-flow.ts` with the rule stated: a hosting
  Collection panel wins outright including a deliberate "no flags", a standalone upload inherits the
  controller's preview state and only then the Widget default. The session request itself is asserted
  against a stubbed `fetch`: it carries the inherited context, drops an invalid Folder id, keeps a
  meaningful zero, rejects a non-object `meta`, and names neither a Space nor a Storage location.
- Provider availability is covered through `resolvePhiRuntimeModuleServerBinding` for all five
  outcomes. The Asset module's own binding requires no capability, so media availability never depends
  on a probe; that is pinned as a deliberate state rather than left implicit. An unbound Collection
  provider surfaces as an error rather than an empty gallery.
- Module disable and restore: the Asset module is an ordinary selectable module in every Area, so
  absence disables and presence restores it, idempotently. Locked, uninstalled and ineligible
  selections still throw, and the build-time catalog keeps its declarations regardless of Area
  selection, which is what makes restoring possible.
- Legacy paths stay gone: no Media Group identifier and no direct Storage key, bucket or URL in any
  media source, and the upload flow addresses only the site media API.

## Server-authoritative Form gateway regression matrix

- `scripts/validate-form-gateway-contracts.ts` grew from four descriptor assertions into the full
  matrix. It drives the real `buildPhiSiteFormRouteHandlers` with a `NextRequest` and a routed `fetch`
  stub that answers the Area preset, the capability snapshot and the Form registry, and records every
  upstream call. Four upstream endpoints are enough to reach a complete dispatch, so nothing about the
  route had to be refactored for a test seam.
- Descriptor authority: a submission body carrying `upstreamPath`, `csrfPath`, `requiresCsrf`,
  `credentialPolicy`, `method`, `submitHandlerKey`, `endpointKey`, `category` and `transport` is
  ignored in full. The dispatch still lands on the Provider's own path with the Provider's own method
  and no credential, and a tampered `csrfPath` does not even add a round trip. Identity normalization
  is the gateway's: a mixed-case, whitespace-padded Form id resolves to the same handler, while a
  non-namespaced, unknown or traversal-shaped id resolves to nothing.
- Area authority: the Area comes from the referer and only after the host matches the request, so a
  referer from another origin selects no Area. A proxied host is honoured through `x-forwarded-host`.
- Activation and availability are independent gates that both fail closed: an inactive owning module
  does not dispatch, and neither does an active module whose server capability is missing from the
  snapshot. A phase the Form does not declare has no handler and does not dispatch either. An Area
  naming a module the catalog does not install fails loudly rather than falling back.
- Credential policies are asserted at the wire. The relay strips the browser cookie header and re-adds
  exactly the cookie the Provider's policy names: `none` forwards nothing at all even though the
  browser sent a Site session, `site-session` forwards only `phis_session`, `auth-link` forwards only
  `phis_auth_link`, and the CSRF handshake carries the same restriction. A denied handshake stops the
  dispatch instead of submitting without a token, and an empty token is treated as a denial.
- Upstream authority: values are forwarded verbatim and the verdict is relayed with its status and
  payload. Covered for unauthenticated, insufficient role, disabled membership, Site mismatch, invalid
  values and rate limiting. Server-issued cookies reach the browser, and a transport failure surfaces
  as a gateway error rather than a successful submission.
- Third-party dispatch runs through the same gateway: a test Add-on module is added next to the
  first-party entries with `createPhiRuntimeModuleCatalog`, so Area definitions and base modules stay
  real, and its Form dispatches to its own Provider path with no credential.
- The descriptor algebra gained the rest of its surface: the closed `none` default when a Provider
  names no policy, category derivation from the handler-key namespace including the unknown-category
  fallback, endpoint keys resolving under each category prefix, path normalization, and transport and
  method normalization.

## Control shape across every Control size

- Answered the open decision in the entry: the absolute shapes flatten the size scale and the relative
  ones keep it. `square` resolves to `0` and `pill` to a full capsule at every size, because no size can
  make "no rounding" or "capsule" partially true. `rounded` is the authored numeric scale unchanged and
  `subtle` the same scale shifted one step toward the small end, so the Small and Large numbers an
  author types in the Style tab stay live inputs under both.
- The default size still travels on antd component tokens. The other two cannot: antd derives them from
  `borderRadiusSM` and `borderRadiusLG`, and those same tokens draw the Select dropdown, the DatePicker
  panel and its date cells, and the ColorPicker swatches, which `SITE-CONFIG.md` keeps on the surface
  scale. `styles/control-shape.css` applies them by size class instead, so the selector names the
  Control body and no popup.
- The rules read inherited custom properties rather than fixed values so a nested Builder preview
  resolves its own shape: two equally weighted rules tie and let source order decide, while an inherited
  property always comes from the nearest ancestor that declares it. Portalled Modals and Drawers render
  outside the Root element, so `PhiConfigProvider` mirrors the properties onto the document element
  after mount, where a portal can still inherit them.
- Corrected the shaped-component list, which claimed four components it never touched. `AutoComplete`
  and `TimePicker` ship no stylesheet and render as `.ant-select` / `.ant-picker`, already covered by the
  Select and DatePicker entries; `TreeSelect` hardcodes its radius; and `Cascader` was worse than inert,
  because its token reads the dropdown panel, so shaping it would have rounded a popup. The list is now
  eight real entries including `ColorPicker` and `Mentions`.
- Also reached the Segmented items and thumb inside their track. antd keeps them one step below the
  track radius, so a pill Segmented used to hold square items -- the same defect one level down.
- Measured in the browser: the Style tab preview resolves small/default/large as `0/0/0`, `5/5/8`,
  `5/8/13`, and `9999` across the four shapes; a published `pill` moves all 22 small Buttons in the
  Builder chrome and the Segmented items and returns them on `rounded`; a small Button inside a portalled
  Modal renders as a pill; and the guards hold, with compact groups rounding only their outer boundary
  (first `9999/0`, middle `0/0`, last `0/9999`) and Switch keeping its intrinsic capsule.

## Signal wiring as a contract overlay

- Rebuilt the wiring surface on the overlay contract. It used to be a Modal of its own -- `PhiModalControl`
  with a hand-written form, a local field helper and a hand-built footer, driven by props from the
  inspector host -- which predated the contract and is why the forms/overlay consolidation dropped it
  instead of migrating it, leaving the scaffold's wiring button pointing at nothing.
- It is now declared in the Builder Area preset like the effects editor: a Modal with a body layout,
  `footerPresentation: "actions"`, and open/close signal routes. The body is a Form Widget bound to a
  descriptor plus a Table listing the block's routes; Apply and Cancel are a command toolbar in the
  footer, and Apply routes through the Form's own submit so its validation runs before a route is written.
- The four selects cascade, and a Form field's options provider only ever sees its own static config,
  never its siblings' live values. The Form publishes its values to its own Form controller address as
  the author edits; the Builder controller mirrors them into a wiring session in the workspace store, and
  four options providers read that session back.
- A receiver is only offered when its input can carry the chosen output -- same action, same value type,
  and for JSON the same schema -- and the check is repeated before the route is written, because the
  session outlives a selection change.
- The routes Table runs WITHOUT the provider's session key: the Form writes routes straight into the
  draft config, so a staged session would be a second truth to keep in step. Removing a row writes to the
  same place and reloads the Table.
- Three defects surfaced while building it and are pinned by contracts now: a creation preset that named
  another Layout's kind inherited chrome built for the wrong axis (the Modal body lost its block
  padding); an overlay with `closeMode: "request"` whose close request nobody answered could not be
  closed at all; and the endpoint collectors the consolidation deleted had to be restored, since a
  receiver list cannot be derived from the selected block alone.

## Internal reference survival, end to end

`scripts/validate-reference-contracts.ts` proves the contract in process, including the ordering that
keeps the translator from ever seeing a `phi:` string; see the archived entry in
[WIDGET_CONTRACT_MIGRATION_COMPLETED.md](./WIDGET_CONTRACT_MIGRATION_COMPLETED.md#internal-reference-contract-regressions).
The runtime half now exists too. `browser-test/scripts/make-reference-fixture.mjs` authors and publishes
`/zz-reference-fixture` -- a Markdown Widget whose body carries a `phis:page/...` link and a
`phis:asset/5` image -- and `check-reference-survival.mjs` asserts the round trip across `en`, `de`, and
`fr`. Measured on 2026-08-21:

| | en | de | fr |
| --- | --- | --- | --- |
| heading | Reference fixture | Referenzvorrichtung | Dispositif de référence |
| link text | the second page | zweiten Seite | la deuxième page |
| link target | /en/new-page | /de/new-page | /fr/new-page |
| image alt | A photograph of the harbour | Ein Foto vom Hafen | Une photo du port |
| image src | /api/site/media/5/content?r=1 | *identical* | *identical* |

Everything a reader sees moves; the target does not. Only the locale prefix on the href changes, which is
routing rather than translation, and no `phi:` string reaches the page in any locale.

The attribute half is covered too, as of 2026-08-21. The fixture's Rich Text Widget now carries a
`phis:page/...` link and an image with all three attributes, authored through the Builder's own save body
rather than through Lexical's keyboard (`browser-test/scripts/author-rich-text-reference.mjs`), so the
markup travels the authoritative sanitizer at the write endpoint exactly as an author's would. One image
carries both size forms on purpose: whole pixels serialize to the attribute and relative units to inline
style, so each half is asked its own question.

| | en | de | fr |
| --- | --- | --- | --- |
| image alt | A photograph of the harbour at dusk | Ein Foto vom Hafen bei Dämmerung | Une photo du port au crépuscule |
| image title | Harbour at dusk | Hafen bei Dämmerung | Le port au crépuscule |
| link text | the second page | zweite Seite | deuxième page |
| `height` attribute | 320 | *identical* | *identical* |
| `width` style | 60% | *identical* | *identical* |
| image src | /api/site/media/5/content?r=1 | *identical* | *identical* |

Prose moves, geometry does not. The dimensions are as much a target as the href is: a translator that
rewrote either would break the page rather than localize it.

What drove this by hand before was a test-automation limit, not a product gap: the
`phi-builder-widget-scaffold__interaction` overlay keeps focus, so typed text never reaches Lexical from
Playwright. Replaying the captured save body sidesteps the keyboard entirely and still exercises every
server-side boundary.

Markdown carries the title too, as of 2026-08-23. `![alt](url "title")` is ordinary syntax -- unlike
width and height, which Markdown genuinely cannot express -- and the renderer was simply dropping it.

The title is prose, so it gets translated, but as a unit of its own rather than as more content inside
the image's placeholder token. The first attempt put it there, and the translator returned alt text and
title merged and re-split at a different point: `"A photograph of the harbour" / "Harbour at dusk"` came
back as `"Ein Foto vom" / "Hafen - Der Hafen in der Abenddammerung"`. Two sentences in one string read as
one run of words. Carrying it beside the image in the unit's metadata and translating it separately also
leaves the token's shape untouched, so every already-translated image keeps its catalogue entry. The url
stays in metadata either way and never reaches a translation request at all. Measured across the fixture:

| | en | de | fr |
| --- | --- | --- | --- |
| Markdown image alt | A photograph of the harbour | Ein Foto vom Hafen | Une photo du port |
| Markdown image title | Harbour at dusk | Hafen in der Abenddämmerung | Le port au crépuscule |

Covering it surfaced a defect in `phi-server` that had nothing to do with Markdown and everything to do
with why this could not be measured at first: `computeSiteMessageHash` hashed only the first 50
characters of a message. `tr_site_msg` is unique on `(site_id, msg_hash, ctx)`, so two messages sharing
an opening were the same message -- the second was rejected, `ensureSiteMessageId` raised a collision,
and the entire batch it travelled in failed with it. One paragraph beginning like another dropped every
other string on the page back to its source language. Fifty characters is nothing: a Markdown image
serializes to `<x-image data-index="0">` before a word of its alt text, and 47 of the 221 messages in the
development catalogue were long enough to be at risk. The hash now covers the whole message, and the
schema script rehashes in place -- ids and translations are keyed by id, so nothing is lost, and a fuller
hash can only separate rows a prefix had already merged.
The Rich Text half itself is done. It was not before: the sanitizer has always admitted
  `title`, `width`, and `height` on `img`, but the Lexical image node knew only `src` and `alt`, so it
  discarded them on import and never wrote them on export -- no surface could set them. The node now
  carries them through import, export, and serialization, a click on an image opens an attribute
  Popover next to it, and the editor shows the Asset through the delivery endpoint while the persisted
  `src` stays the `phis:asset/<id>` reference. `scripts/validate-reference-contracts.ts` pins both
  halves: the attributes survive sanitizer and projection, and `exportDOM` must write `this.__src`
  rather than the resolved URL. A relative width is authorable too: `img` -- and only `img` -- may
  size itself through bounded inline style, in both this sanitizer and the authoritative one in
  `phi-server` (`src/lib/html.ts`, covered by `src/lib/html.test.ts`). Whole pixels persist as the
  attribute, every other unit as style, and both forms are read back.

## Verification record

Migration batches were routinely checked with:

- `pnpm exec tsc --noEmit`
- `pnpm lint`
- targeted runtime checks only when explicitly authorized

No compatibility aliases, v1 fallback readers, or parallel old/new signal contracts are intentionally
retained.
