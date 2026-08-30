# Widgets

This document describes the widget layer inside `@phis/ui`.

Third-party Widget authors should begin with the Widget walkthrough in
[THIRD_PARTY_MODULES.md](../../THIRD_PARTY_MODULES.md#4-add-a-widget), then use this document as the
normative detailed behavior and signaling reference.

All Table Widgets and Table Providers additionally follow the normative
[TABLES.md](../../TABLES.md) target v1 contract.

## General rules

- Widgets are intended to be self-contained integration surfaces.
- Core owns the adapter-backed `Date Picker` Widget, Gregorian calendar adapter, and generic date/time
  Controls exported from `@phis/ui/controls/date-time`. Event calendars, booking, and additional
  calendar systems remain optional Module contributions.
- Presentation-only configuration editors are `Phi*Control` components. A `Phi*Widget` name is reserved
  for a complete CMS Widget with identity, config, signals, and registered Runtime/Preview/Authoring
  projections; naming a controlled React editor `*ConfigWidget` does not turn it into a Widget.
- Widgets share the renderable block contract with layouts.
  - They inherit `renderMode`, `visibility`, `enabled`, and size semantics from the common block base.
  - `renderMode` is transient render-path context, not a persisted setting and not a runtime signal channel.
  - The shared block plugin field group is reused across families for common block chrome such as `maxSize` and `shadow`; widget plugins should only add fields that are truly specialized.
  - Simple debug or test widgets may reuse the shared widget dimension field group (`PHI_WIDGET_DIMENSION_PLUGIN_FIELDS`) for editor-facing `width` and `height` inputs, but the canonical runtime geometry remains `size`.
- Editor commands should target concrete renderable receivers, not widget ids only.
  - `debugMode` is the shared debug chrome switch; when enabled, the fixed palette below is used for region, layout, slot, content, and scaffold layers.
- Widgets are never responsible for slot scaffolding; layout renderers own the empty-slot, occupied-slot, and `+` affordance contract in edit mode.
- Widgets participate in the shared slot-size contract just like layouts.
- Persisted widget config reserves `size` for renderable geometry (`{ width, height }`). Controls that support AntD-style visual density opt into the shared `controlSize` presentation capability (`small | medium | large`); omission inherits the active Phi/AntD provider size. Only low-level `Phi*Control` React props may call that value `size`.
  - Module-owned widget definitions reuse `PHI_CONTROL_PRESENTATION_FIELDS` and `parsePhiControlConfig(...)` from `@phis/ui/types`; controls with a restricted size set pass their allowed values to the parser and expose a matching field.
  - widget definitions should declare a `PhiSlotSizePolicy` when they need something other than the default intrinsic child behavior
  - the default widget slot policy is `intrinsic/intrinsic`
  - layouts use the same shared type, but their own default is `fill/fill`
  - renderers must read that policy instead of hardcoding widget-type-specific fill behavior
- Every interactive `Phi*Control` consumes the centrally resolved `theme.shape.controls` contract. Controls and
  Modules must not persist raw CSS radii, inspect Ant Design radius tokens, or implement private
  `square | subtle | rounded | pill` mappings.
  - the mapping is resolved for the active `controlSize`; `pill` means a capsule, not literal CSS `50%`
  - square icon-only Controls become circular in `pill`; compact groups round only their exterior corners
  - Switch, Checkbox, and Radio retain their intrinsic semantic geometry
  - Input, Search, InputNumber, Select/MultiSelect, Cascader, date/time Controls, Segmented, Buttons,
    Table/Tree cell editors, and Picker triggers participate through their canonical Phi adapters
  - dropdowns, popup panels, Cards, Tables, Trees, Modal, Drawer, Layouts, and other container surfaces keep
    using the separate Theme surface-radius scale
  - a third-party package receives this behavior by using canonical Phi Controls; direct UI-library components
    are outside the Phi Control contract and must not be used as an alternative styling path
- Data-driven collections are widget-owned.
  - A collection view is a registered widget that may be inserted into any normal slot.
  - It is not a layout kind and does not participate in the slot-layout registry.
  - Collection widgets may expose view modes such as `grid`, `masonry`, or `stack`, but those are item-presentation modes, not new slot-layout topologies.
  - Collection widgets derive their items from a collection scope, typically via `scopeKey`, instead of from persisted `slots[]`.
  - Collection widgets should render items through an explicit item-renderer contract instead of open-coded per-feature listing geometry.
- The shared rendering language should stay consistent across families:
  - `render()` means live output
  - `renderPreview()` means the safe, live-nah preview output
  - `renderEditor()` means the builder/editor scaffold
- The three paths are intentionally different:
  - `render()` renders the real production widget
  - `renderPreview()` renders a preview that stays close to live but must avoid dangerous actions such as logout, destructive mutations, unsolicited signal emission, or other live side effects
  - `renderEditor()` renders the single builder authoring/scaffold path, including editor-specific controls such as text editing, picker affordances, and other authoring UI
- `renderPreview()` and `renderEditor()` must stay render-only.
  - they must not import widget registries
  - they must not look up `WIDGETS_BY_TYPE`
  - they must not re-resolve plugin metadata or SSR label sets
  - they should render from the config that was already passed in
- `renderPreview()` may be server-rendered.
  - it may use server helpers such as `tr()`
  - it is the intended path for snapshot/server preview
  - it should stay safe and inert, but it does not have to be client-only
- `renderEditor()` is client-side editor chrome.
  - it may use client-only state and interactions
  - it must still render from the already passed config and labels
  - it is used by structure-authoring workspaces when `/builder/shells` or `/builder/pages` edits the actual shell/page composition tree
  - it is not the render path for normal live-rendered builder pages such as `/builder/navigation`, `/builder/theme`, `/builder/revisions`, or `/builder/media`
- Full builder preview is a server-rendered snapshot path and should use the normal CMS layout/widget preview flow.
- Editor chrome is a client island; it may select, inspect, drag, and open pickers, but it must not import server-only widget live renderers.
- Internal builder widgets used on live-rendered builder pages must have a server/live widget plugin with `render()` and `renderPreview()` as needed. A builder-only `renderEditor()` plugin is useful only when that widget appears inside an editable composition tree.
- The builder/client registry owns `renderEditor()` only.
  - it must only include editor entry points that are safe to import in the client tree
  - do not pull async server wrappers or SSR-only widget implementations into that registry
- The server/live registry owns `render()` and `renderPreview()`.

## Editor scaffold contract

The structure editor renders every widget leaf through one shared editor scaffold. The scaffold is the
single owner of generic editor interaction and chrome; widgets remain responsible for their visual and
domain content.

- The editor scaffold has five ordered layers:
  1. the shared renderable-block/slot child frame
  2. the visually live-like widget content
  3. the generic selection and interaction surface
  4. optional widget-owned authoring chrome
  5. shared editor tools
- Normal widget content is inert in `renderMode: "editor"`.
  - it must not receive pointer, keyboard, focus, native form, link, or drag interaction
  - it must remain visually enabled; editor inertness must not be represented by the persisted/runtime
    `enabled` or `readOnly` states and must not gray the widget through local `disabled` props
  - live signal emissions through the mounted widget context are suppressed centrally; listeners may
    still update the visual editor body from explicit authoring tools
  - mutations, navigation, and other runtime side effects remain forbidden in normal editor bodies
  - editor-only scaffold commands, including selection, inspector, authoring, effects preview, wiring,
    and semantic DnD, remain available through the builder layer
- The generic interaction surface owns selection, hover, and the future widget drag handle.
  - it covers the widget leaf without changing the widget's measured geometry
  - it is the only default pointer target for selecting or beginning a widget drag
  - it must expose an accessible keyboard selection target while the inert widget content stays outside
    the editor tab order
  - selection, hover, dragging, and authoring state are transient builder/runtime state and are never
    persisted in widget config
- Visual scaffold state must be theme-aware.
  - hover and selection use distinct translucent fills and borders from the shared Phi/AntD semantic
    token bridge
  - `debugMode` may add a widget boundary using the same centralized token path
  - debug, hover, and selection chrome must use overlays, outlines, or inset shadows that do not alter
    layout geometry
  - widget renderers must not hardcode RGB/RGBA scaffold colors
- Shared editor tools include inspector, delete, wiring, and effect/animation controls. A future DnD
  handle belongs here when `capabilities.draggable` is enabled.
- Widget-specific authoring remains supported without generic type checks.
  - builder plugins default to `editorInteraction: "inert"`; only a plugin that owns real canvas
    authoring declares `editorInteraction: "authoring"`
  - `authoring` declares support, not a permanently interactive canvas body: a click over an editable
    text target activates and focuses that editor, while a click elsewhere opens the Inspector
  - blur, outside click, leaving the complete widget-and-overlay scaffold, or Escape commits/exits authoring and must consume that same pointer action so
    it cannot also reopen the Inspector
  - active authoring keeps the scaffold outline, title, and tool chrome but removes hover/selection
    surface tint so editable content remains visually unobstructed
  - scaffold tool chrome has interaction priority over both authoring activation and Inspector
    selection; its event boundary must not propagate into either path
  - multiline editors keep Enter as content input; single-line editors use their shared inline-editor
    commit contract
  - `renderEditor()` may provide a specialized interactive authoring body, for example inline text,
    HTML, image, or icon editing
  - `renderEditorTools()` may add widget-owned controls above the interaction surface, for example
    command-toolbar add/remove controls
  - config fields edited by `renderEditorTools()` declare `editorPlacement: "toolbar"` and must not
    be rendered a second time in the Inspector
  - direct icon and media selection belongs in scaffold toolbuttons; background media remains part
    of the structured Inspector background editor
  - both render functions receive `authoring: null` for non-mutating preview output and a Builder-owned
    authoring context in the editable Canvas; `authoring.updateConfig()` is the only widget-plugin path
    for requesting a draft config patch
  - authoring plugins must not import the Builder store, construct controller addresses, or use normal
    runtime signals to persist configuration
  - inline authoring must publish every persisted change through `authoring.updateConfig()`; it must
    not rely on a buffered Runtime-signal flush before Preview, Save, Publish, blur, or unmount
  - dynamic subcontrol collections declare their config/key/label fields through the definition's
    `signalSubcontrols`; generic endpoint resolution and route pruning must not branch on `typeKey`
  - widget-owned authoring controls form an explicit editor event boundary: using them must not select
    another node, reopen the inspector, begin a widget drag, or depend on AntD class-name allowlists
  - picker and dropdown overlays opened from scaffold tools register with the shared scaffold popup
    lifecycle; while any registered overlay is open, the owning scaffold remains visually active
  - the first pointer action outside the owning scaffold and all of its registered portal overlays
    closes the overlay and is consumed; it must not also select a node or open the Inspector
  - scaffold tools reuse canonical public Phi widgets when one exists, such as `PhiColorWidget`; they
    must not introduce a parallel plain AntD control path for the same control contract
  - the scaffold owns placement and stacking of these extensions; it must not branch on `typeKey`
- A normal builder plugin supplies its client-safe editor body either directly or through a shared
  `createPhiCmsBuilderWidgetPlugin(...)` adapter. Passive widgets must use the adapter so their builder
  modules register only the client-safe visual body instead of rebuilding the plugin object shape.
  The client builder must not call or import the server-owned `renderPreview()` as a fallback because
  preview rendering may be async, translated, and SSR-only.
- Lazy authoring and visual fallback skeletons inherit the widget definition's `slotSizePolicy`.
  `fill-inline`, `fill-block`, `fill`, `fixed`, and `intrinsic` must occupy the same axes as the real
  widget. The lazy boundary exposes that policy on the immediate parent-layout slot child so layout
  sizing is resolved before either the fallback or loaded editor body renders; a fallback must not
  impose an unconditional full width or register a temporary signal receiver while the implementation
  loads.
- The full interaction layer applies to Widget leaves. Layouts retain their structural
  scaffold, slot affordances, and common toolbar, but must not place an inert cover over descendant
  slots or child scaffolds.

- The builder inspector must stay widget-agnostic.
  - it may read declarative widget properties such as `fields`, `runtimeSignals`, `contentBinding`, and `slotSizePolicy`
  - it must not branch on widget type, widget key, or plugin identity to decide which settings UI to render
- Plugin infrastructure should stay outside widget implementation folders.
  - use root-level `plugins/registries/*` for builder/server plugin registries
  - use root-level `plugins/factories/*` for shared plugin adapter helpers
  - keep `components/widgets/*` focused on widget implementation modules such as `config`, `server`, `client`, and `builder`
- `components/widgets/config/*` is the server-safe metadata source for widget definitions.
  - widget title, description, category, fields, defaults, and parseConfig belong there
  - `category` is required presentation metadata from the closed semantic set `content`, `navigation`,
    `form`, `data`, `media`, `commerce`, `account`, `configuration`, `structure`, `workspace`,
    `developer`, and `other`; it is never an access,
    Area-eligibility, activation, or authoring-visibility switch
  - Widget availability comes only from ownership: Platform Core, the target Area base module, and
    optional modules active in that target Area
  - do not introduce reserved `internal`/`admin` category behavior, Widget-local Area lists, or a
    parallel authoring registry; a technical implementation detail that is not insertable is not a CMS Widget
  - widget-owned content persistence metadata also belongs there
  - widget settings must be declared through `fields`
  - `fields` are the only source for inspector-editable config and persistence shape
  - `fields` must not be used as a substitute for runtime signal capability metadata
  - specialized settings controls must be selected by generic field type or declarative capability, not by widget type key
  - cross-widget selectors should use generic field types such as `widget-reference` with declarative filters, not inspector-side widget-name checks
  - if a widget persists canonical CMS content, declare that through `contentBinding`
  - write paths should forward `contentBinding` as declarative payload metadata; they must not branch on concrete widget `typeKey`s inside `phi-server`
  - server-side picker metadata must be built from `config/*`, not from the client builder registry
  - do not import `components/widgets/builder/*` into server preset or picker paths
- Cross-widget coordination must use the runtime signal system.
  - do not add preset-local, inspector-local, or widget-name-specific coordination logic when the same behavior can be modeled through runtime signals
  - signal routing uses `scope + channel + action + sender + receiver`
  - `PhiSignal` from `types/signals` is the only signal contract; do not reintroduce `PhiRuntimeSignal`, `PhiTransportSignal`, or feature-local signal families
  - the v1 ABI target is a flat signal shape: `{ scope, channel, action, valueType, value, valueSchema?, sender?, receiver, correlationId, timestamp, meta? }`
  - `scope`, `action`, and `valueType` are closed contracts; use the shared readers for config parsing
  - public `valueType: "json"` capabilities and routes require `valueSchema` in the namespaced form `<npm-package>/<schema-key>`; JSON receivers only match compatible routes with the same schema
  - core widget schemas must use `PHI_SIGNAL_VALUE_SCHEMAS` or `createPhiSharedSignalValueSchema(...)`; do not repeat the core package-name prefix in widget code
  - `channel` is a configured channel string; two objects communicate by using a concrete receiver address plus compatible `channel + action + valueType`
  - allowed public scopes are exactly:
    - `widget`: the emitting widget instance or directly paired widgets
    - `layout`: a layout instance
    - `region`: one CMS page or shell region
    - `page`: the current page composition
    - `area`: the current site area or builder workspace area
    - `site`: only the required globally mounted site-owned Core Runtime Controller instance at `controller:@phis/ui/core:default`; it is not a CMS/Region receiver scope, Area relay, or broadcast scope
    - `runtime` is an execution environment and Registry partition, not a public signal scope
  - public v1 wiring must not use naked `block:<id>` receiver addresses
    - standard renderable-block controls target `cms:<instanceId>` regardless of widget/layout kind
    - for targeted routes, `scope` is derived by the wiring service from the receiver endpoint runtime context and must not be user-editable
    - widget/layout receiver scope comes from where the receiver is mounted in the CMS/runtime tree, for example page-owned regions derive `scope: "page"` and area-owned shell regions derive `scope: "area"`
    - controller receiver scope comes from the controller setting `mountScope`
    - `receiver: null` or an omitted receiver means not wired and must not emit a runtime signal
    - `receiver: "broadcast"` remains a runtime capability but is reserved for explicitly approved runtime-internal, diagnostic, or global flows; the normal Builder wiring UI must not offer broadcast by default
    - any `scope: "block"` or `receiver: "block:<id>"` path is a v1 contract violation
  - `sender` and `receiver` have separate contracts
    - `PhiSignalSender = PhiSignalAddress | null`
    - `PhiSignalReceiver = PhiSignalAddress | "broadcast" | null`
    - `sender` must never be `broadcast`
    - `receiver: null` means not wired
    - `receiver: "broadcast"` means explicit broadcast
  - `sender` and `receiver` addresses must identify mounted CMS/runtime instances, not plugin type keys, labels, option values, or freely configured control keys
    - the only public v1 address families are `cms:`, `region:`, and `controller:`
    - Widget and Layout instances use `cms:<instanceId>`
    - region instances use `region:<region-key>`
    - runtime controller instances use `controller:<npm-package>/<controller-key>:<instance-key>`
    - singleton controllers use `default` as their instance key, for example `controller:@phis/ui/asset:default`
    - non-namespaced controller addresses such as `controller:asset:default` and short addresses such as `controller:<controller-key>` are not valid v1 addresses
    - `widget:`, `layout:`, `object:`, `runtime:`, `site:`, `area:`, `page:`, `slot:`, and `block:` are not public v1 address families
  - subcontrols append a stable subcontrol key to the owning instance address
    - examples: `cms:<instanceId>:save`, `cms:<instanceId>:filter`, `cms:<instanceId>:upload`
    - the `cms:<instanceId>` prefix identifies the mounted CMS instance
    - subcontrol keys must not replace the instance id; `cms:save` or a widget type key is not a valid persisted CMS instance address
    - use the address to identify which instance or subcontrol is targeted, and use `channel + action` to identify what operation is performed there
    - example: `receiver: "cms:<instanceId>:save"` with `channel: "icon"` and `action: "change"` changes the icon of the `save` subcontrol; the channel must not encode the button key
  - config `key` fields are local control keys only
    - they may select a subcontrol endpoint suffix
    - they must not be treated as a CMS instance id
    - they must not be used to synthesize a standalone `cms:<key>` address when a mounted CMS/runtime instance id is available
  - normal targeted wiring chooses a receiver, not a free scope; the persisted route scope is derived from that receiver context
  - no signal route travels laterally between Areas; an active Area/Page may explicitly target the globally mounted Core Runtime Controller, whose outputs resolve only to concrete receivers in the current active Area/Page Registry context
  - Builder Canvas uses an isolated Registry partition and must never target the live Site Core endpoint
  - Runtime subscription and instance state belongs to the nearest explicit Site, Area, or isolated Canvas
    provider. It is never stored in module globals and never mirrored through `BroadcastChannel`.
  - Page-owned receivers keep their Page/Region context in the Area partition and unregister on unmount;
    there is no mutable global current-context fallback.
  - if several receivers should react, persist several explicit targeted routes instead of using broadcast
  - `scopeKey` is separate from signal `scope`: `scope` chooses the routing level, while `scopeKey` names a concrete transient store, provider, collection, or data-source instance
  - do not use `scopeKey` as a second signal scope, signal-router key, or fallback receiver selector
  - receivers register while their widget, layout, block, or region instance is mounted and unregister on unmount
  - receivers are active only while they belong to the current runtime context, such as the current page, area, or region
  - `slot` is not a public v1 signal scope or address family; route slot state through the owning layout receiver
  - signal values use `value`; widgets must not introduce alternate value fields such as `selectKey`, `pathKey`, `tokenKey`, `signalKey`, `signalPayloadKey`, or `valueKey`
  - optional signal metadata belongs under `meta` and is intentionally limited to the shared whitelist, currently `label`, `checked`, and `sourceLabel`
  - widgets that emit or receive configurable signals should expose declarative `emits` or `listens` capabilities in `runtimeSignals`
  - `runtimeSignals.emits/listens` describes signal capability only; it does not create inspector fields and must not be used as a persistence schema
  - concrete instance wiring is persisted as `signalRoutes` in the CMS widget/layout/object config
    - `runtimeSignals` belongs to the plugin definition
    - `signalRoutes` belongs to the concrete serialized instance
    - each capability uses a required stable `id`; each route uses a required stable `routeKey` plus `capabilityId`
    - `runtimeSignals.emits` declares sender output ports only
      - sender outputs have stable `id`, `action`, `valueType`, optional `valueSchema`, optional `enumValues`, optional `required`, and optional `target`
      - sender outputs do not declare `scope` or `channel`
    - `runtimeSignals.listens` declares receiver input ports
      - receiver inputs have stable `id`, `channel`, `action`, `valueType`, optional `valueSchema`, optional `enumValues`, optional `required`, and optional `target`
      - `target` is `"self"`, `"subcontrol"`, or `"both"` and exists for capability filtering only; persisted routes still target concrete addresses such as `cms:<instanceId>` or `cms:<instanceId>:save`
      - receiver inputs are unique inside one receiver by `channel + action + valueType + valueSchema`
    - in `signalRoutes.emits`, `capabilityId` references one declared sender output from `runtimeSignals.emits`
    - in `signalRoutes.listens`, `capabilityId` references one declared receiver input from `runtimeSignals.listens`
    - `routeKey` is unique across the concrete instance's complete emit/listen route set and is the only route CRUD identity
    - presets use fixed route keys; Builder-created routes use `createPhiSignalRouteKey()`; route keys remain stable through edit, publish, and receiver remapping
    - emitting one capability delivers through every explicit route with the matching `capabilityId`
    - routes do not store `receiverCapabilityId`; the target input is identified by route `receiver + scope + channel + action + valueType + valueSchema`
    - the `channel` stored in a sender route is the target receiver channel selected during wiring
    - generic controls declare sender outputs such as `activate`, `change`, or `toggle` with an action and value contract but without a channel, while the saved route delivers to a receiver-owned operation such as `visibility/toggle`, `themeMode/change`, `assetKind/change`, or `activeSlotIndex/change`
    - receiver channels are hard capabilities; Widgets, Layouts, Regions, objects, and controllers must not accept arbitrary free-text listener channels
    - wiring compatibility is checked by the selected sender output and selected receiver input; `action` and `valueType` must match, JSON `valueSchema` must match, and enum values must be compatible
    - `channel` and `receiver` come from the selected receiver input; targeted route `scope` is derived from the selected receiver endpoint context, not from a free user setting
    - the runtime must not translate channels; the persisted route already contains the delivered receiver channel
    - targeted routes may intentionally cross ownership boundaries, for example an area-owned header button can target a page-owned receiver; the route exists on the sender but only delivers while the concrete receiver is registered in the current runtime context
    - if the App Router keeps old page trees mounted or cached, receiver registration context must still prevent stale page-owned receivers from reacting outside their active page context
    - deleting or replacing a receiver instance must remove routes targeting that receiver address or one of its subcontrol addresses in the same builder mutation
    - sender addresses are derived from the current mounted instance; persisted routes must not store legacy `sourceKey` fields or the full own sender address
  - standard controls must reuse shared capability sets from `components/widgets/signals/control-signal-capabilities.ts` instead of repeating action lists in each widget definition
  - sender output capability declares `action`, `valueType`, optional `valueSchema`, optional `enumValues`, optional `required`, and optional `target`; it does not declare `scope` or `channel`
  - receiver input capability declares `channel`, `action`, `valueType`, optional `valueSchema`, optional `enumValues`, optional `required`, and optional `target`; it does not declare `scope`
  - concrete `scope + channel + action + valueType + receiver` values live in instance `signalRoutes`, not in widget capabilities; for targeted wiring, `scope` is derived by the wiring service
  - `valueType` must be one of `none`, `boolean`, `string`, `number`, `enum`, `color`, `path`, `length`, `size`, `image`, `icon`, `string[]`, `number[]`, `enum[]`, or `json`
  - complex widget protocols may use `valueType: "json"`, but public CMS protocols must declare a stable `valueSchema`; the outer signal still uses a standard `action`, and domain-specific data belongs inside the JSON `value`
  - drag and drop uses the standard `drag` and `drop` channels with generic actions; concrete DnD metadata belongs in `value`
  - receivers match signals by `scope`, `channel`, `action`, and optional `receiver`, then read the canonical value from `value`
  - delivered runtime signals always carry `correlationId`; feedback/state-change signals caused by a command keep the initiating correlation id
  - listen routes may update local state but must not implicitly emit another runtime signal; no-op state changes must not emit feedback
  - `renderPreview()` and `renderEditor()` must suppress live signal emission unless the widget explicitly owns editor-only scaffold commands
- Renderable-block controls are inherited by every CMS Widget, Layout, and Region through the shared runtime controller.
  - renderable-block `capabilities` are binary participation flags, not inspector settings and not signal wiring
  - `selectable`, `draggable`, `hoverable`, `activatable`, `focusable`, and `droppable` only say whether the block can participate in that interaction family
  - widget implementations must not implement their own hide/show/collapse plumbing
  - block control signals target `receiver: "cms:<instanceId>"`, not a family-specific or naked block id
    - widget/layout kind is resolved from the mounted registry entry
    - regions use `receiver: "region:<region-key>"`
    - live CMS receivers use the containing Region's derived `page` or `area` scope; family-local
      `widget`/`layout` scopes remain internal defaults only when no CMS ownership context exists
    - broadcast commands use `receiver: "broadcast"` and are constrained by `scope`, `channel`, and runtime context
  - visibility uses `channel: "visibility"`, `action: "change"`, and canonical values `visible`, `collapsed`, or `hidden`
  - `hidden` removes the block from initial layout participation; runtime hidden state suppresses the rendered frame
  - `collapsed` keeps reduced layout participation and uses `collapsedSizeHint` when present
  - `visible` restores normal participation
  - UI verbs such as show, hide, expand, and collapse are helper methods that emit `change` on the canonical visibility channel; `toggle` remains the approved generic action for invert-current-state behavior
  - enabled state uses `channel: "enabled"`, `action: "change"` with a boolean value and disables interaction without removing layout participation
  - renderable blocks should also understand `change` on `size`, `minSize`, `maxSize`, `background`, `border`, `shadow`, `zIndex`, and `opacity`
  - `background` uses `valueType: "json"` with `valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.backgroundConfig`
  - `border` uses `valueType: "json"` with `valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.borderConfig`
  - `shadow` uses the semantic ids `none`, `soft`, or `strong`; only the explicit custom form `{ kind: "custom", value: "<box-shadow>" }` carries a CSS string
  - `zIndex` uses `valueType: "number"`
  - `opacity` uses `valueType: "number"` with CSS opacity values from `0` through `1`, defaulting to `1`
  - `opacity: 0` keeps layout participation; use `visibility` for hidden or collapsed block state
  - top-level block `opacity` is separate from `effects.opacity`; effects may animate opacity but must not be the storage target for `opacity/change`
  - `effects` is a standard renderable-block channel and uses `action: "start"`, `"stop"`, or `"clear"` where the renderer supports the corresponding block feature
- Interactive control widgets use the shared control signal contract.
  - each control owns configured wiring channels; simple one-control widgets do not need an additional instance key because the concrete renderable receiver identifies the instance
  - button, input, switch, select, and future controller widgets should use the shared control capability sets for their standard emit/listen contract
  - composite widgets use local capability ids only inside their config, for example toolbar button ids, and map those ids to signal wiring entries
  - value changes emit `action: "change"` on the configured channel with the native control value
  - user activation emits `action: "activate"` on the configured channel with `valueType: "none"` or a command value when the channel requires one
  - receivers declare `listens` capabilities with standard actions such as `change`, `clear`, or `toggle`; setter identity belongs in `channel`
  - focus state uses `channel: "focused"`, `action: "change"`, and `valueType: "boolean"`; `true` means focused and `false` means blurred
  - submit is not a signal action; submit-like controls should use a command channel such as `formSubmit` with `action: "activate"`
  - `toggle` means "invert the current state" and should use `valueType: "none"`
  - switch-like and toggle-button controls always emit boolean values; labels such as light/dark are presentation config or receiver interpretation, not switch values
  - select controls emit one selected value and listen to `change` on their selection channel; multiselect controls emit arrays and listen to `change` with array value types
  - text/search widgets may use the input wrapper, which delegates to the shared control helper with a configured channel
  - select, cascader, color, switch, and future generic controls should use the shared control helper instead of wiring runtime listeners directly
  - option-based controls use static `options` for fixed lists and `optionsProvider` for runtime-derived lists
  - Phi-exposed component sizes use only `small`, `medium`, and `large`; the legacy Ant Design `middle` alias is not part of the Phi contract
  - `optionsProvider` is a strict object with a namespaced `providerKey` plus optional `scopeKey`, `area`, `params`, load mode, and search config; plain strings and legacy `type` keys are not v1 inputs
  - option provider implementations must return canonical `{ value, label }` items and may optionally return the currently selected `value`
  - asynchronous option providers must declare a deterministic `resolveLoadKey()` covering every input that changes their remote result; equal in-flight keys are loaded once across all mounted controls and unrelated runtime snapshots must not restart the request
  - provider-backed controls still emit and receive the same canonical `value` signal contract as static option controls
  - domain widgets that need dynamic choices should configure a generic option control with `optionsProvider` instead of rebuilding select/cascader UI locally
  - `segmented` and `tab-bar` are alternate presentations of the same option-control model
  - `select-box` supports `select` and `autocomplete` presentation; `allowCustom` uses the same
    controlled choice contract rather than an Inspector-owned autocomplete path
  - `valueMode: "stack-slot-index"` is the explicit adapter mode for controlling stack layouts; without it, controls must emit normal state values
  - preview and editor rendering must suppress live control signal emission
- Command toolbars are reusable command emitters.
  - use `command-toolbar` for groups of icon/text command buttons instead of specialized toolbar widgets or many preset-local button nodes
  - each toolbar button must declare a stable `key`; the key becomes the subcontrol address suffix such as `cms:<instanceId>:save`
  - each toolbar button must declare a non-empty `emits` list whose entries reference `signalRoutes.emits[].capabilityId` through `capabilityId`
  - toolbar button config does not repeat signal `scope`, `channel`, `action`, `valueType`, or `receiver`; those belong only to `signalRoutes.emits[]`
  - toolbar button `value` is per-route payload only, not the subcontrol identity
  - toolbar button subcontrols may receive standard control signals through their subcontrol address, for example `receiver: "cms:<instanceId>:save"`, `channel: "enabled"`, `action: "change"`, `valueType: "boolean"`
  - Command Toolbar authoring uses `renderEditorTools()` to add, remove, and reorder button config;
    its Canvas body never emits or receives the toolbar's live runtime signals
  - command toolbars must not know builder workspaces, page keys, draft ids, or publish semantics
  - area controllers such as the builder controller listen to generic command signals, attach current context, validate allowed commands, and dispatch domain-specific command signals
  - toolbar buttons may configure `label`, `tooltip`, `icon`, `display`, `danger`, `disabled`, and `buttonType`; `display` uses the closed `icon | label | icon-label` presentation and overrides only that button while omitted input retains the Toolbar-level `showLabels` behavior. Compact rendering should use Ant Design `Space.Compact`. `PhiButtonControl` suppresses a tooltip whose text equals its visible label, while retaining that tooltip when the label is hidden for an icon-only presentation.
- Option providers are module-owned sources for generic option controls.
  - every provider has one globally unique namespaced `providerKey`, for example `@phis/ui/options/spacing-scale`
  - module definitions expose serializable descriptors; active live modules compose executable Provider Clients through the scoped option-provider context
  - global maps, registration calls, and import side effects are not provider extension points
  - `resolve(context)` must be pure with respect to its inputs and must not fetch directly
  - optional `load(context)` may fetch DB or API data and returns async data consumed by `resolve(context)`
  - failed async loads produce an empty result and an explicit provider warning; implementations must not borrow static options or another module provider as a fallback
  - providers may read `area`, `scopeKey`, and `params`, but must not invent widget-specific payload fields
  - provider output values are the values emitted as signal `value`; receivers must not rely on labels
  - Provider execution mode and Authoring mode are separate as defined in `MODULES.md` and `TABLES.md`;
    `authoringPolicy` is not part of the v1 descriptor ABI
  - built-in provider keys:
    - `@phis/ui/options/media-folders`
      - returns Media Folder paths for cascader/select controls inside the trusted active Media Space
      - reads the mounted Asset controller state; it must not use `scopeKey` as signal routing
    - `@phis/ui/options/builder-pages`
      - merges Phi preset pages, local builder-created pages, and persisted CMS pages
      - `area` may pin the area; otherwise it follows the current builder area
    - `@phis/ui/options/builder-navigation-sets`
      - merges navigation presets and persisted navigation sets
      - `area` may pin the CMS area
      - `params.value` may be `key` or `scopeKey`; default is `key`
    - `@phis/ui/options/runtime-modules`
      - returns installed optional module descriptors for Builder area configuration
    - `@phis/ui/options/runtime-table-controllers`
      - returns active controllers that declare compatible table metadata
    - `@phis/ui/options/runtime-controller-tables`
      - returns the declared table keys of the selected controller
    - `@phis/ui/options/theme-presets`
      - returns theme preset keys from the active theme descriptor catalog
    - `@phis/ui/options/theme-keys`
      - returns persisted theme scope keys; currently this is `default` until custom theme scopes are exposed by the API
    - `@phis/ui/options/spacing-scale`
      - returns the shared `none`, `xxs`, `xs`, `sm`, `base`, `md`, `lg`, `xl`, and `xxl` scale
      - `params.family` selects `padding` or `margin`; option values remain the corresponding CSS token values
- `components/widgets/built-in/*` is the explicit home for special runtime paths that are not normal plugin-owned widget implementations.
  - examples: shared form bridge widgets, confirm flows, structure workspace internals, preview fallback surfaces
  - do not use `built-in/*` as a temporary migration shelf for ordinary widgets
- Widgets that only need a very thin editor may use a minimal `renderEditor()` implementation.
  - the minimum useful default is the widget body plus the shared delete/trash affordance
  - this keeps every widget editable even when it has no richer authoring UI yet
- `simple-text` should keep `text` as its live widget property so editor preview, runtime signaling, and local overrides can still target that value directly.
- `simple-text` defaults to intrinsic block sizing.
  - width should hug icon + text content
  - height should stay auto
  - max width should still clamp to the available slot width
- Widgets that should grow with the parent slot must declare that explicitly through the shared slot-size policy.
  - for example, a content editor may be `fill-inline`
  - a full panel or slot-filling interactive widget may be `fill`
  - concrete growth limits such as `maxWidth` still belong to widget geometry/config, not to the slot-size policy itself
- For normal CMS-backed `simple-text` instances, the canonical persisted source text should live in `site_content(type=text)` and the widget should point at it through `content_id`.
- Shared preset trees are the explicit exception: they may use local `config.text` without a backing `content_id`.
- The persistence bridge is declarative:
  - widget definitions describe `contentBinding.storage` and `contentBinding.sourceField`
  - `contentBinding.storage` currently supports `text`, `html`, `markdown`, and `asset`
  - widgets with mutually exclusive source modes may declare `contentBinding.skipWhenConfigField` so the builder omits persistence when that config field has a value
  - widgets may alternatively declare `contentBinding.skipWhenConfigFieldValue` to omit persistence for a specific config field/value pair
  - the builder forwards that binding in the CMS write payload
  - `phi-server` persists against the declared binding and must not hardcode widget-specific branches such as `if typeKey === "simple-text"`
- `icon` is the standalone CMS block for the shared `PhiIcon` primitive.
  - it reuses the same icon-string contract (`antd:*`, `iconify:*`, `asset:*`)
  - the semantic size `inherit` resolves centrally to `1em`; AntD, Iconify, Builder, and Asset adapters
    must therefore match the surrounding text size without interpreting SVG width as container width
  - editor quick actions should stay on the shared overlay path for icon and color
- `simple-text` should use the shared widget `flags` field for `NoTranslate`.
  - `flags & PhiCmsFlags.NoTranslate` means render source text directly and skip translated lookup.
  - without that flag, runtime may resolve the translated database-backed text through `content_id`.
- `simple-text` is the lightweight inline text primitive.
  - its optional leading icon uses `1.25em` in Live and Authoring so AntD and Iconify glyphs retain a
    consistent readable optical size beside the configured text size
  - rich editorial body copy belongs in a dedicated rich-text widget instead of expanding `simple-text` into a document editor
- `html` is the first rich-text widget contract.
  - it stores canonical source markup in `site_content(type=html)`
  - it uses Lexical as the current edit-mode authoring scaffold
  - the authoritative trust boundary is the `phi-server` CMS write endpoint: an HTML content binding is
    sanitized before either its canonical content version or its source config field is persisted
  - authoring clients may sanitize draft changes for immediate editor feedback, but client validation is
    never the persistence security boundary
  - runtime and preview receive server-sanitized markup; the live HTML Widget must not import a sanitizer
    or accept arbitrary `html/change` runtime signals
  - server-rendered presets, external documents, and translation results cross separate trust boundaries
    and remain sanitized in the server render path before they reach `dangerouslySetInnerHTML`
- The editor foundation for future richer document widgets may still evolve.
  - the product dependency line must stay MIT-safe and resell-safe
  - only MIT-licensed editor core packages and MIT OSS extensions may become shared runtime dependencies
  - do not make shared widgets depend on plan-gated UI components, Pro extensions, Pro templates, or cloud-only editor features
  - Phi owns the editor chrome and widget contract:
    - toolbar buttons
    - dropdowns
    - link dialogs
    - image pickers
    - color and typography controls
  - the intended persisted source for v1 rich text should be `site_content(type=html)`
  - HTML is the canonical persistence and translation format for that widget
  - translation for that content should use the shared `format=html` path, not the plain-text path
  - the editor implementation is only the authoring tool for that HTML content
  - v1 rich-text support should stay focused on editorial text structure:
    - paragraph
    - headings
    - bold
    - italic
    - underline
    - strike
    - ordered and unordered lists
    - links
  - embedded images are an optional follow-up and should not be treated as a v1 requirement

## Terminology

- Shared structural chain:
  - `shell`
  - `region`
  - `layout`
  - `slot`
  - `widget`
- `slot` is the positioned child node rendered by the layout.
- `widget` is the actual content rendered directly in that position.

## Room Contract

- `widget` renders inside the positioned slot node, not against the region root.
- `slot` gives the widget its allocated room.
- `layout` decides the child placement contract for that position.
- The child node declares whether it stays intrinsic or fills on either axis; the parent layout interprets that declared policy.
- `PhiSlotChildFrame` is the concrete block wrapper in the shared runtime.
- A widget may influence its own inner alignment, but it should not need to know the full placement contract.
- In practice, the render order is:
  - `region` defines the outer area
  - `layout` defines slot distribution
  - `slot` is the rendered child node at that position
  - `widget` renders the actual content
- This lets a widget express its own inner alignment while the layout still owns the row/column split.

## Debug legend

- `red` = region shell
- `blue` = base layout container
- `orange` = empty slot or placeholder zone
- `green` = occupied content body
- `violet` = editor scaffold / root chrome
- The shared debug palette is fixed and semantically mapped so the same color always refers to the same layer.
- The Builder-only debug palette is centralized in `styles/layout-authoring-scaffold.css` via
  `--phi-debug-layer-*` CSS variables.
- A root wrapper may enable the whole debug scaffold by setting `.phi-debug-scaffold--on` or `data-phi-debug-scaffold="on"`.

- Widgets that participate in the common block contract should prefer `usePhiRenderableWidgetRuntime({ blockId, runtime, config })` so the shared base fields are normalized centrally.
- Inspector/config field contracts should prefer one generic `choice` family for option-based authoring instead of parallel `select`, `navigation-key`, or `widget-reference` field types.
  - `choice` owns the selection semantics (`single` / `multiple`, static options vs `optionsProvider`, optional custom values, and presentation such as `select` or `autocomplete`).
  - `optionsProvider` is the source contract only; it may resolve presets today and must stay open to future SQL- or API-backed sources through the same descriptor shape.
- Inspector field placement is declarative:
  - omitted or `editorPlacement: "inspector"` fields render in Settings
  - `editorPlacement: "geometry"` fields are owned by the shared Geometry section
  - `editorPlacement: "toolbar"` fields are owned by the widget scaffold toolbar
  - Builder code must not infer placement from field type or duplicate a toolbar-owned setting
  - SelectBox and MultiSelect static `options` are toolbar-owned and use the shared transactional Static Options Editor; the Inspector owns only the static/provider source selection
  - the Static Options Editor edits the canonical option array through a Builder-only collection table control, commits one config patch on Apply, and never mounts `PhiTableWidget` or runtime data-provider behavior
- Builder metadata keeps sparse `defaultConfig` for insertion, while Inspector defaults are resolved through
  the widget's `parseConfig`; controls therefore represent the same normalized initial config as authoring renderers.
- Numeric Inspector fields use Ant Design `InputNumber`; the generic `number` field may declare
  `min`, `max`, `step`, and `precision`. Scalar CSS lengths use `PhiLengthControl`, which combines a
  numeric input with a fixed `px`, `%`, `em`, `rem`, `vw`, or `vh` unit selector. Width/height pairs
  use `PhiDimensionControl`, composed from two Length Controls.
- Repeated structured Inspector values use the generic `collection` field family instead of widget-type
  branches in the Builder.
  - `itemKeyField` is required and identifies each persisted item inside the collection.
  - `itemFields` recursively reuse the same config-field contract, including nested collections,
    conditional visibility, choices, providers, and structured controls.
  - `defaultItem` supplies the declarative seed for Add; the shared Inspector creates a collision-free
    item key from its `itemKeyField` value and owns add/remove/reorder UI.
  - `minItems`, `maxItems`, and `reorderable` constrain generic authoring only; they do not create a
    runtime collection, CMS slots, or domain-specific data behavior.
- Shared Controls are presentation-only adapters and live under `components/controls/*`.
  - a Control owns the direct Ant Design primitive, controlled value props, and presentation behavior
  - a Control never owns CMS parsing, persisted config, Runtime signals, Runtime-module discovery, or
    options-provider registration
  - a CMS Widget composes a Control with config parsing, Widget state, signal routing, definition metadata,
    and Runtime/Preview/Authoring registration; when a contract defines a reusable provider-aware Binding
    such as `PhiTableBinding`, the Widget delegates provider resolution and request state to that Binding
  - Form field providers and Inspector editors consume Controls directly; they must not mount a complete
    Widget with signaling disabled as a substitute for a Control
  - `PhiFormWidget` delegates its controlled field tree to `PhiFormControl`; Form field providers compose
    only Phi Controls and never CMS Widgets, Layouts, or direct Ant Design interactive primitives
  - the canonical input family is `PhiTextControl`, `PhiNumberControl`, `PhiSliderControl`,
    `PhiSelectControl`, `PhiMultiSelectControl`, `PhiSegmentedControl`, `PhiSwitchControl`,
    `PhiCheckboxControl`, `PhiCheckboxGroupControl`, `PhiButtonControl`, `PhiToolbarControl`, and
    `PhiCascaderControl`; overlay/picker composition additionally uses `PhiPopoverControl`,
    `PhiPaginationControl`, `PhiTabsControl`, and `PhiMediaPickerControl`
  - `PhiAlertControl` is the canonical inline feedback presentation and `PhiConfirmControl` is the
    canonical local anchored confirmation presentation. They expose Phi semantic props only and own
    the direct Ant Design `Alert` and `Popconfirm` primitives. They are Controls, not CMS Widgets, and
    do not own persistence, providers, signals, or business actions
  - application-wide transient Message and Notification feedback is not a Control or Widget. Feature
    clients use `usePhiApplicationFeedback` to emit the closed Site-scoped Core signal; only the Core
    application adapter may call the Ant Design application service
  - `PhiDimensionControl` is the canonical compound width/height Control. It preserves the existing
    `PhiRenderableBlockSize` persistence shape: `px` values are numbers and other supported units are
    CSS strings
  - `PhiLengthControl` is the canonical scalar CSS-length Control. `PhiLengthWidget` adds the public
    CMS config and `length` signal contract; the former free-text `css-size` Inspector path does not
    remain in the ABI
  - `PhiDimensionWidget` adds CMS config, `size` signals, Runtime registration, and Authoring metadata;
    Forms and Inspector fields consume `PhiDimensionControl` directly
  - package consumers import reusable Controls from `@phis/ui/controls`; the
    `@phis/ui/widgets` entry exposes complete CMS Widgets only
  - the canonical configuration-editor family is `PhiBackgroundControl`, `PhiBorderControl`,
    `PhiShadowControl`, `PhiPaddingControl`, `PhiGeometryControl`,
    `PhiViewportVisibilityControl`, and `PhiPlacementMatrixControl`; each receives controlled values,
    resolved labels, disabled state, and callbacks only
  - Builder Inspector counterparts are Builder-Module Widgets, not public/Core configuration Widgets;
    they add CMS identity and declared Builder-Controller signal adaptation while delegating all
    editor presentation to the corresponding Control
  - those Builder Widgets may occupy, be removed from, or be reordered among normal Collapsible slots;
    the selected Region/Layout/Widget value remains Controller/workspace state and is never persisted as
    the Inspector Widget's own config
- Option-bearing consumers use one Control-options contract. Static options normalize to
  `PhiControlOption`; dynamic sources use `PhiControlOptionsProviderConfig` and
  `usePhiControlOptionsProvider`. Widgets, Forms, and Inspector own provider resolution and pass only
  resolved options to the presentation Control.
  - an option may declare the serializable `preview` kind `background`; `PhiSelectControl` renders the
    same swatch in its selected value and popup option while search and persistence continue to use the
    option label and value
  - feature code must not replace the shared Select with a domain-specific popup merely to show a
    visual option preview
- Semantically bound control wrappers should be named by meaning, not by Ant Design primitive, for example `PhiDimensionControl` for paired width/height editing and `PhiTextControl` for semantic text inputs.
- Geometry editing should prefer the shared size controls:
  - `PhiLengthControl` for scalar offsets and other single CSS lengths
  - `PhiDimensionControl` for paired size and constraint editing
  - `PhiNumberControl` for the unitless integer `zIndex`; persisted and signaled z-index values are
    numbers, not CSS strings
  - `PhiGeometryControl` should present `offsetTop`, `size`, `minSize`, `maxSize`, and `zIndex` as
    the user-facing geometry contract even when a region or shell still stores width/height internally
- `PhiPlacementMatrixControl` is the shared 3x3 choice-style placement matrix for layout alignment helpers.
- `PhiBorderControl` is the shared border editor for visible container chrome. It owns border width,
  style, color, and per-corner radius editing. Its semantic labels live under
  `components/widgets/label-types/border.ts` until the Control label-family migration moves that
  server-safe model to its final neutral owner.
- `PhiShadowControl` is the shared shadow editor for visible container chrome. It owns elevation presets
  plus optional custom `box-shadow` input.
- `PhiWidgetIconPickerButton` delegates widget-chrome icon selection to the shared
  `PhiIconPickerControl`. The compound Picker composes only Phi Controls, uses compact `paddingXS` around
  its selection surface, and treats an icon-tile click as its terminal immediate selection: the
  value is propagated and the Picker closes without a separate Select action. Its control labels live
  under `components/controls/phi-icon-picker-labels.ts`, while icon names and provider set names stay
  provider-owned.
- Generic text-input Widgets map semantic `inputType` values such as `text`, `url`, and `phone` to
  `PhiTextControl` and dispatch text signals for their own block target. Numeric values use the
  independently typed Number Input Widget and `PhiNumberControl`; they must not travel through the
  browser's text/number input path.
- `PhiSliderControl` is the canonical scalar numeric slider presentation. The Core Slider Form provider
  and `PhiSliderWidget` both delegate to it. The Widget persists scalar `number` bounds and presentation
  config and uses the standard number signal capabilities; range values are not part of the v1 Slider
  contract.
- `PhiRateControl` is the canonical discrete rating presentation. It remains controlled, keeps keyboard
  interaction enabled, accepts only a canonical Phi icon key instead of an Ant Design `character`
  callback or arbitrary React node, and exposes no raw Tooltip/style/class API. `PhiRateWidget` owns the
  persisted initial value, positive integer count, whole/half-step policy, clear policy, label,
  description, icon, normal Control presentation/state, and standard number signal routes. Values are
  clamped to `0..count` and normalized to whole or half steps. No dedicated Runtime Controller or
  provider is created for this presentation-only lifecycle; a future Form field provider must reuse the
  same Control.
- `PhiInputWidget` is the generic text input implementation for the text-compatible `inputType`
  variants.
- Text Input, Select Box, and Multi Select share the canonical label/description presentation through
  `PhiLabeledControl`: label plus description renders the label followed by an `(i)` Tooltip; label alone
  renders only the label; description alone attaches the Tooltip to the Control surface. Label and
  description text must never be forwarded to a native HTML `title` attribute. Select option labels stay
  non-primitive at the Ant Design adapter boundary so the underlying Select cannot synthesize native
  `title` attributes from them. All canonical description affordances render the shared
  `PHI_DESCRIPTION_TOOLTIP_ICON`; consumers must not select another icon locally.
- `PhiSearchWidget` is a thin search facade over the shared text-control layer; it keeps search-specific UX such as the search icon, debounce, and enter-to-search behavior while reusing the shared text input mechanics.
- Control badge chrome is a shared optional control capability, not a button-only contract. The persisted config keys are flat control fields: `badgeEnabled`, `badgeText`, `badgeCount`, `badgeShowZero`, `badgeOverflowCount`, and `badgeColor`.
  - Runtime badge updates use one fixed channel, `badge`, with receiver capabilities `badge/change:string` and `badge/change:number`.
  - Runtime matching uses `channel/action/valueType` and optional `valueSchema`; badge visibility is derived from badge value, not from `badge/change:boolean`.
  - `PhiButtonWidget` is the first public CMS widget that renders badge chrome. Other control widgets may opt in by reusing the shared badge config and badge controller when there is a concrete UI need.
- `PhiBackgroundControl` is the canonical reusable background editor surface. It owns the structured
  presentation, uses the shared HEX input plus color-picker pattern for solid colors, and reports
  controlled value changes only. Its Builder Widget counterpart owns runtime signals; the Control itself
  never emits through the runtime signal bus.
  - Pattern overlays persist a namespaced `patternKey`, for example `@phis/core/stripes`, plus the
    provider-owned `values` record. Core Authoring descriptors declare their stable key, translated label
    key, supported field descriptors, and defaults; the separate Live resolver owns the rendered layer,
    and Authoring derives its preview from that same resolver. Adding another provider does not widen the
    persisted Background ABI or add Pattern branches to `PhiBackgroundControl`.
  - Pattern code is physically split into the server/client-safe value contract, the Live resolver, and
    the Authoring catalog. Public Runtime imports must not reach labels, field descriptors, option
    previews, or the complete Authoring catalog. Builder may combine the Authoring descriptor with the
    same Live resolver when it renders the Pattern Select preview.
  - The Core Pattern set is `stripes`, `grid`, `dots`, `checker`, and `crosshatch`. The Pattern chooser is
    the normal `PhiSelectControl` using serializable option previews. An unavailable namespaced key stays
    persisted, renders no unsafe fallback, and remains visible as unavailable in Authoring.
  - Image Backgrounds use the shared `motion` contract from `LAYOUTING.md`. `PhiBackgroundControl` exposes
    `static | fixed | parallax`, strength, and direction only for an owned image base; it does not derive an
    image from a Theme Root, Region, Layout ancestor, or another Widget.
  - Parallax is a Background capability, not a Widget family. The v1 target has no `PhiParallaxWidget` and no
    `ParallaxLayout`; content is composed from an ordinary Region/Layout Background plus normal child Widgets.
    A future multi-plane content-motion feature would require separate operator-approved topology and must not
    reuse this image-Background setting as an implicit child transform.
  - Noise is not a Pattern provider. It persists the independent semantic grain preset `fine`, `medium`,
    or `coarse`; opacity remains shared, while Pattern-only fields never render for Noise.
  - Base and overlay are separate CSS background layers. The shared resolver must emit size, position,
    and repeat values for every individual image layer so an Image base using `cover` never stretches
    Pattern or Noise. Multi-image Patterns such as Grid and Crosshatch must keep each image, size,
    position, and repeat entry index-aligned before the base layer is appended.
- The outer block chrome lives in the shared slot child frame, while the widget and its client implementation remain responsible for the actual domain UI.
  - widget renderers should pass their full `config` object through the CMS slot frame path
  - the frame reads only the renderable block slice it needs and ignores the rest
  - this keeps config updates visible to the block receiver without per-widget prop forwarding
  - `enabled: false` means the block is present but should not accept interaction.
- Widget config should be persisted sparsely: unset values and canonical defaults should be omitted from JSON, and readers should restore the full runtime shape on load.
- Layout widgets live under `components/layouts/*`; content and flow widgets live under `components/widgets/*`.
- Interactive client inners live only in sibling `clients/*` directories.
- Registered non-internal widgets are available in every area and region. Area-specific and region-specific placement fields are not part of the widget contract.
- Before introducing a new widget interface, config family, or plugin shape, first check whether an existing shared contract can be reused, extended, or composed.
- Prefer extending the existing widget/layout contract over adding a parallel family for a single feature.
- Do not build parallel contracts, shadow contracts, or v1 shims in the widget layer.
- If the reuse path is not obvious, stop and ask before adding a new contract surface.
- Widget-local label models and defaults live under `components/widgets/label-types/*`.
- Widget-local server label-set loaders live under `components/widgets/label-sets/*`.
- Server loaders should import their shared label models from `label-types/*` and only own the translation lookup plus runtime loading logic.
- Do not place shared label type definitions or default text directly in widget root files when a dedicated `label-types/*` model exists.
- Renderable block copy is split into three sources:
  - `labels`: Phi-owned UI/control copy such as buttons, placeholders, empty states, tooltips, and errors.
  - `defaultLabels`: localized default content such as `Contents`, `Quick links`, or `Untitled`, used only when CMS/config content is absent.
  - `config`/CMS/runtime content: explicit user or preset content, which always wins over `defaultLabels` and common control labels.
- Copy-free widgets and layouts use the explicit `PhiNoLabels` contract and must not pass dummy `labels={{}}`.
- Common semantic actions such as save, publish, review, restore, reset, reload, upload, apply, and clear are provided by the shared Common Controls label/icon contract; do not duplicate them in widget-local label sets unless the widget gives the action a domain-specific meaning.
- Ant Design locale stays enabled for AntD-internal copy. Widgets should not re-label AntD built-ins unless the visible text represents a Phi semantic action.
- The shared inspector drawer header uses its own label contract under `components/widgets/label-types/inspector.ts` and `components/widgets/label-sets/inspector.ts`, so `Region` / `Layout` / `Widget` can be translated without coupling them to the concrete plugin title shown below the header.
- Widget-owned inspector sections may use their own label contracts as well, for example `components/widgets/label-types/signals.ts` and `components/widgets/label-sets/signals.ts` for the `Signals` collapse in the widget inspector.
- CMS-visible widgets must be declared through widget plugins under `components/widgets/plugins/*`.
- Public widget components use the `Phi*` prefix.
- Internal widget helpers must use non-`Phi` names.
- A CMS widget should usually have two public pieces:
  - a `Phi*Widget` implementation component
  - a `PhiCmsWidgetPlugin` definition that adapts that implementation into the CMS registry
- For third-party widget authoring, model one widget through three explicit artifacts plus one shared definition:
  - `components/widgets/config/<widget>.ts`
    - server-safe widget definition
    - owns `pluginKey`, `typeKey`, `title`, `description`, `fields`, `defaultConfig`, and `parseConfig`
    - must not import builder/client modules
  - `components/widgets/plugins/<widget>-widget-plugin.tsx`
    - server/live plugin
    - imports the shared definition and provides both `render()` and `renderPreview()`
    - `renderPreview()` is mandatory; the renderer never falls back to `render()`
  - `components/widgets/builder/<widget>.tsx`
    - client-safe builder plugin
    - imports the shared definition and provides `renderEditor()` plus optional widget-owned `renderEditorTools()`
  - optional `components/widgets/client/<widget>.tsx`
    - reusable client body used by server or builder paths
- Treat the shared definition in `config/*` as the single source of truth.
  - do not duplicate title, field, or parse metadata in server and builder plugins
  - server and builder plugins should spread the same definition and only add their runtime-specific render functions
- Editor overlay tools belong to the builder widget plugin through `renderEditorTools()`.
  - the generic scaffold must not branch on `typeKey` to select widget-specific tool components
  - editor implementations are loaded through the owner-scoped, top-level `React.lazy()` authoring catalog; do not create lazy declarations during render
- A new normal widget belongs to exactly one runtime module through `ownerModuleId`:
  - its lightweight definition is listed in that module's widget manifest
  - its Runtime and Preview implementations use distinct mandatory, statically analyzable `import()` loaders
  - its authoring implementation uses the owner module's client authoring catalog
  - explicit runtime/preview/authoring policies describe reuse, skeleton, or placeholder behavior
  - dependencies on other controllers remain `requiredRuntimeControllers`; they never change ownership or auto-enable modules
  - Canvas evaluates `requiredRuntimeControllers` through the active owner module's authoring plugin and
    registers only the resulting concrete serializable controller settings for Wiring
  - cached or mounted widgets outside the current page/area context must not contribute demand-controller
    endpoints, and receiver strings must never be parsed to reconstruct missing demand instances
- Public host composition uses `@phis/ui/cms/plugins` for the site bridge, first-party module catalog, and runtime-module contracts.
- Module ownership is strict:
  - `config/*` is server-safe metadata only
  - owner-scoped runtime module manifests contain loader descriptors only
  - live and authoring implementations load only after owner-module activation and tree demand
  - do not import implementation modules into server preset or picker code
- Minimal third-party widget recipe:
  1. define `PHI_FOO_WIDGET_DEFINITION` in `config/foo.ts`
  2. implement `PHI_FOO_WIDGET_PLUGIN` in `plugins/foo-widget-plugin.tsx`
  3. implement `PHI_FOO_WIDGET_BUILDER_PLUGIN` in `builder/foo.tsx`
  4. add those loaders and explicit render policies to one runtime module
  5. register that module's statically analyzable loader in the site module catalog
- Forms are not domain-specific CMS Widget types. Contact, Login, Registration, Confirmation, Password
  Reset, and third-party Preset Forms are module-owned Form definitions referenced by `formId` and
  rendered through the one generic `PhiFormWidget` CMS Widget.
- The public `Phi*Widget` implementation may itself be the portable plugin implementation and should therefore remain self-contained and idempotent.
- The widget plugin definition is the canonical contract for:
  - builder/editor metadata
  - defaults
  - config parsing
  - runtime behavior
  - editor fields
- Fallback and seed widget trees should use small factory helpers that take `pluginKey + typeKey` instead of hardcoding built-in widget enums in every preset file:
  - `buildPhiCmsWidgetTypeKey(...)` is the pure namespaced type-key helper
  - the factory should emit the namespaced CMS widget type used by the registry
  - `PhiCmsWidgetType.*` stays a built-in shortcut for shared widgets, not the only valid contract
  - v1 CMS draft revisions persist widget trees as JSON snapshots; `PhiCmsInstanceId` values inside those snapshots are canonical payload identities, not normalized node-table primary keys
  - preset widgets receive deterministic 96-bit ids from `(contractVersion, ownerModuleId, presetKey, nodeKey)`
  - Builder-created widgets receive ids from the owning Draft revision plus its one persisted sequence shared by widgets and layouts
  - Builder-created widgets must not use timestamp-derived ids, random ids, array length, numeric ranges, or widget-local allocators
  - signal and wiring addresses use `cms:<instanceId>` and `cms:<instanceId>:<subcontrolKey>`; widget kind is registry metadata
  - publish validates and preserves every `instanceId`; it never maps payload-local ids to another identity
- Builder/editor metadata should come directly from the widget plugin definition, for example:
  - `title`
  - `description`
  - `category`
  - `tags`
  - `icon`
  - `iconName`
  - `iconFamily`
  - `iconKey`
  - `defaultConfig`
  - `fields`
- Icon resolution is resolver-owned:
  - the plugin provides local `iconName` and optional `iconFamily`
  - the resolver may compose a fully qualified `iconKey` as `pluginKey:iconName`
  - the `pluginKey` namespace is expected to be package-scoped, for example `@phis/ui/layouts` or `@phis/ui/widgets`
  - Layout plugins use their inner motif while the renderer draws the outer frame
  - plugin code should not hardcode the frame geometry for that family
  - widgets without an explicit icon fall back to their resolved icon family, for example `navigation`, `basic`, `form`, `admin`, or `internal`
- Widget plugins may also declare runtime signal capabilities through `runtimeSignals`.
  - the signal contract is shared with widgets and layouts
  - routing must resolve from `receiver`; `sender` is for trace/debug only
  - `fields`, renderable-block `capabilities`, and `runtimeSignals` are separate declaration surfaces and must not be inferred from each other
  - plugins declare capabilities through `emits`, `listens`, and optional `dragDrop`
  - capability declarations describe what the widget can do; instance `signalRoutes` describes how a concrete widget instance is connected
  - drag and drop must reuse this same shared contract
  - semantic drag/drop metadata belongs in `runtimeSignals.dragDrop`, not in ad hoc widget-local props
  - local drag engines such as `dnd-kit` are allowed, but they are implementation detail, not the public widget contract
  - drag/drop lifecycle uses `drag/start`, `drag/change`, `drag/stop`, and `drop/drop`; concrete DnD metadata belongs in `value`
  - do not route raw pointer movement through the signal bus
  - do not invent a parallel `onWidgetDrop` or custom payload registry when `runtimeSignals.dragDrop` can express the same contract
- Stable core signal kinds are exactly `cmd`, `state`, and `event`.
- Stable public signal scopes are exactly `widget`, `layout`, `region`, `page`, `area`, and `site`.
  - `runtime` is an execution environment and Registry partition, not a signal scope.
  - `site` is valid only for an explicit concrete route to the globally mounted Core Runtime Controller instance at `controller:@phis/ui/core:default`; `receiver: "broadcast"`, `cms:`, and `region:` receivers are invalid at Site scope.
  - `slot` and `block` are not public v1 wiring scopes. Route slot state through its owning layout.
- Stable core signal actions are exactly:
  - `activate`
  - `change`
  - `toggle`
  - `start`
  - `stop`
  - `clear`
  - `open`
  - `close`
  - `reload`
  - `flush`
  - `filter`
  - `drop`
- `change` is the only setter action; the changed state or field belongs in `channel`.
- A channel has one canonical `valueType` per receiver capability. If one concept needs multiple value families, use distinct channels.
- Naming convention:
  - `id` means numeric persisted/runtime id.
  - `key` means stable string key.
  - `index` means positional number.
- `toggle` is the generic command for inverting current state when the sender does not know the next value.
- `start`, `stop`, and `clear` are generic lifecycle actions for channels such as `effects`.
- `reload`, `open`, `close`, `flush`, and `filter` remain approved generic actions because they are common lifecycle operations across domains.
- Drag/drop uses standard channels:
  - `drag/start`: drag begins
  - `drag/change`: semantic drag state changes, including target hover or acceptance metadata when needed
  - `drag/stop`: drag ends or is cancelled
  - `drop/drop`: a drop is committed
- Focus uses `focused/change` with boolean values instead of `focus` or `blur` actions.
- Submit-like commands use a channel such as `formSubmit` or `searchSubmit` with `action: "activate"` instead of a `submit` action.
- Effects use `effects/start`, `effects/stop`, and `effects/clear` instead of `runEffect` or `clearEffects`.
- Stable core signal value types are the primitive and serializable value families declared in `types/signals.ts`.
  - `color` represents CSS color-like paint values and may include CSS gradient strings such as `linear-gradient(...)`.
  - Gradients stay persisted and transported as CSS strings under `valueType: "color"` unless a future approved contract introduces structured gradient editing.
  - `image`, `icon`, `length`, and `size` are valid semantic value types for image references, icon references, scalar CSS lengths, and paired size values.
- Signal channels are configured channel strings. Prefer stable, descriptive receiver-owned names such as `themeMode`, `builderSave`, `page`, `assetKind`, or `layout`.
  - Generic controls may emit through route-configured target channels.
  - Example: a switch output can be `id: "change"`, `action: "change"`, and `valueType: "boolean"`, while one saved route targets `enabled/change` and another targets `themeMode/change` if the receiver inputs are compatible.
  - Example: a button output can be `id: "activate"`, `action: "activate"`, and `valueType: "none"`, while one saved route targets `builderSave/activate`.
- Commands such as `save`, `publish`, `preview`, `undo`, `redo`, `reset`, `createPage`, or `deleteSelected` should be modeled as command channels with `action: "activate"` unless an approved stable action such as `reload`, `open`, `close`, `flush`, or `filter` matches the operation directly.
- Domain selectors such as pages, navigation, theme preset, markdown TOC, draft status, media asset, or header controls should use explicit channels, endpoints, and native control values. Do not encode the domain name by inventing a new top-level action.
- Example plugin declaration:

```ts
const signalMeta = {
  emits: [
    { id: "change", action: "change", valueType: "boolean" },
    { id: "activate", action: "activate", valueType: "none" },
  ],
  listens: [
    { id: "change", channel: "value", action: "change", valueType: "boolean" },
    { id: "toggle", channel: "value", action: "toggle", valueType: "none" },
  ],
};
```

Example instance wiring:

```ts
const signalRoutes = {
  emits: [
    { routeKey: "theme-mode-output", capabilityId: "change", scope: "area", channel: "themeMode", action: "change", valueType: "boolean", receiver: "cms:<targetInstanceId>" },
  ],
  listens: [
    { routeKey: "theme-mode-input", capabilityId: "change", scope: "area", channel: "themeMode", action: "change", valueType: "boolean", receiver: "cms:<instanceId>" },
    { routeKey: "theme-mode-toggle", capabilityId: "toggle", scope: "area", channel: "themeMode", action: "toggle", valueType: "none", receiver: "cms:<instanceId>" },
  ],
};
```

- Example behavior:
  - a switch may emit `channel=themeMode, action=change, value=true|false`
  - another object may set that switch with `channel=themeMode, action=change, value=true|false`
  - a toolbar button may emit `channel=builderSave, action=activate, valueType=none`
- Widgets may fetch their own domain data when that data is part of the widget's business purpose.
- Widgets that load remote data should do so through the shared data-source contract instead of inventing a widget-specific fetch stack.
- Widgets must not perform their own fallback fetches for site/theme/runtime config.
- Scoped in-memory UI state is a public widget API:
  - `scopeKey` is a stable namespace that widgets may use to share or isolate local state within the same JS runtime.
  - the scope store is backed by the shared `components/state/scoped-state-store.ts` helper and is generic, not media-specific
  - multiple widget instances may intentionally share one `scopeKey`
  - different `scopeKey` values must remain isolated
  - the scope store is transient and must not be treated as persistent app state
  - the intended public store contract is intentionally small:
    - `useStore(scopeKey)`
    - `getSnapshot(scopeKey)`
    - `patch(scopeKey, updater)`
    - `replace(scopeKey, nextState)`
    - `reset(scopeKey)`
    - `deleteScope(scopeKey)`
- A collection widget may treat `scopeKey` as its collection source identity.
  - The scope may be backed by server data, inline data, or local memory/runtime state.
  - The shared collection scope should expose at least:
    - `items`
    - `loading`
    - `error`
  - and may additionally expose:
    - `pagination`
    - `selection`
    - collection-specific actions
- Layouts and widgets that need both runtime config and browser interaction should usually be split into a server wrapper plus a client implementation.
- Server wrappers should load site/theme/runtime config and pass only a small config slice to the client implementation.
- If a widget parses server-side content into rendered UI, the server wrapper should pass a serializable block/config model into a client implementation and let that client implementation render Ant Design component trees such as `Typography.*`.
- Server wrappers should also load their own widget-local label sets when translated UI text is needed.
- `translation` is a separate contract from `read` and `submit`.
  - label-set loading and `tr`/`trBulk` usage belong here
  - do not fold label translation into the shared data-source contract
- Shared remote data loading should use a normalized data-source descriptor with:
  - `kind: api | serverAction | inline`
  - `cache.mode: no-store | force-cache | revalidate`
  - `cache.revalidateSeconds`
  - `cache.tags`
  - request/query mapping fields when the source is API-backed
- Shared writes should use a normalized mutation descriptor with:
  - `kind: api | serverAction`
  - `method: POST | PUT | PATCH | DELETE`
  - `upstreamPath` and optional query mapping
  - no cache or tag settings
- `cache.tags` are part of the contract and are intended to pair with Next.js tag invalidation.
- The same data-source contract should be reused by tables, list views, and form bootstrap reads instead of introducing per-widget fetch abstractions.
- Mutations are a separate write contract and should not reuse GET cache settings.
- `PhiTableWidget` is the canonical Ant Design table wrapper for server-fed or inline collections and should use the shared data-source contract for loading, filtering, search, sorting, and pagination.
- Widget boundary rule:
  - Ant Design is fully acceptable inside widgets.
  - The requirement is not "no Ant Design", but "a clear server/client boundary".
  - If a widget uses browser interaction, client hooks, Ant Design context-dependent subtrees, or hydration-sensitive behavior, that part belongs in a client implementation.
  - Purely server-rendered wrappers should prepare data and view-models, not construct fragile client-only UI trees in the RSC path.
- If a plain server-rendered widget needs generic visual defaults, it may read a minimal server-safe resolved theme slice. That slice must stay small and must not attempt to recreate full Ant Design component-token behavior on the server.
- When a widget needs request/runtime context, prefer a normalized server-side runtime shape such as:
  - `site`
  - `locale`
  - `area`
  - `viewer`
- Only pass the runtime slice the concrete client widget actually needs.
- Raw site/theme JSON should not be passed into client components unless there is a clear, documented reason.
- Ant Design visual defaults come from `PhiConfigProvider` and any site-level `site.theme.antd` overrides.
- In client widgets, avoid hydrating browser-normalized visual end values as raw inline styles.
- In particular, avoid passing token-derived `color`, `background`, `border*`, or `boxShadow` values directly as the final inline value when a CSS variable or class can carry the same meaning.
- Browsers normalize those values during SSR/DOM parsing, which can produce React hydration mismatches even when the visual result is equivalent.
- Client widgets use `usePhiConfig().token` for colors, typography, sizing, spacing, radius, and shadows represented by Ant Design.
  - When CSS selectors or pseudo-elements need a live token, bridge it into a component-scoped custom property instead of reading a global `--phi-color-*` variable.
  - Custom colors come from `usePhiConfig().customColors`; they are not projected into global `--phi-color-custom-*` variables.
  - `--phi-*` remains valid only for Phi-specific structural or technical CSS contracts without an Ant Design token.
  - Use fixed numeric or literal values only when the widget contract is explicitly geometric or when neither contract provides a suitable semantic value.
- Prefer:
  - component-scoped CSS variables for dynamic Client token values
  - classes for stable visual treatment
  - inline styles only for structural geometry such as width, height, gap, padding, transforms, or explicit per-instance positioning
- Shared sites, presets, editors, and future third-party packages should target widget plugins, not raw component implementations.

## PhiAccountWidget

Purpose:
- Account trigger and menu for guest or authenticated user state.
- Delegates guest login modal presentation to the single resolved Auth UI provider.

Key props:
- `locale`
- `siteKey`

## Contract governance

Changing, extending, replacing, reinterpreting, or widening the Widget contracts in this document
requires explicit prior operator approval after the exact gap and affected ABI have been presented. They
must not be bypassed through a parallel, shadow, local, Module-specific, Provider-specific, fallback, or
compatibility contract. If they cannot express a requirement, implementation stops and asks the operator
first.
- `state`
- `avatarSrc`
- `avatarAlt`
- `successAction`

Domain data behavior:
- Server wrapper loads the generic viewer/session snapshot, account menu labels, and the account widget
  config slice.
- Client implementation receives only the filtered account widget config.
- The widget does not import a concrete login implementation. If no Auth UI provider is active, it exposes
  no hidden first-party guest-login fallback.
- Authenticated logout uses the Core CSRF-protected session action and remains available independently of
  Auth Module activation.

Site/theme config consumed:
- none directly from `site.theme.widgets.*`
- widget-instance config should come from CMS widget rows

Effect of site/theme config:
- `variant = "full"` renders avatar, label, and chevron.
- `variant = "compact"` renders a reduced trigger.
- `variant = "icon-only"` suppresses the label and keeps an icon/avatar-first trigger.
- `showLabel` can explicitly force label visibility.
- `showChevron` can explicitly force chevron visibility.

Theme contract consumed indirectly:
- `Avatar`
- `Dropdown`
- spacing and typography inherited from the surrounding header/menu context

## PhiFormWidget

Purpose:
- Generic CMS placement surface for any active module-owned Preset Form.
- Keeps Form identity and behavior in the Form registry instead of creating one CMS Widget type per Form.

Key props:
- `runtime.site.key`
- `runtime.locale.current`
- `formId`
- optional per-instance `formConfig`
- `execution.mode = handler | signal`
- optional standard `signalRoutes`

Domain data behavior:
- Resolves only Form definitions contributed by the active Runtime module set.
- Loads and mounts the UI provider of the selected Form's owner module on demand, even though the
  generic Form Widget itself belongs to a different module.
- Delegates labels, guards, handlers, descriptors, and specialized Client rendering to that Form definition.
- In `signal` mode, emits submitted/reset `formValues` and declared string commands without calling the
  Form gateway.
- Delegates grid, field state, descriptive validation, and keyboard behavior to `PhiFormControl`; field
  providers render only Phi Controls.
- Never renders visible submit/reset/cancel actions. Those are ordinary Phi Button Widgets in a sibling
  Layout or Overlay Footer and reach the concrete Form through the owning Controller's declared routes.
- May host `PhiTableControl` or `PhiTreeControl` only through the bounded controlled compound-value Form
  field contract. It never embeds `PhiTableWidget` or `PhiTreeWidget`.
- The Builder Form selector is populated from the active target-Area Form catalog.

Site/theme config consumed:
- None directly from site config.

Theme contract consumed indirectly:
- `Form`
- the Phi Controls referenced by the selected Form descriptor

## PhiBrandWidget

Purpose:
- Renders the brand block for header or other brand slots.
- Supports logo plus segmented wordmark styling.

Key props:
- `fallbackTitle`
- `fallbackEyebrow`

Domain data behavior:
- Server wrapper resolves the brand widget config slice.
- Client implementation receives only the filtered brand config it needs.

Site/theme config consumed:
- none directly from `site.theme.widgets.*`
- brand/widget configuration should come from CMS widget rows or a dedicated shared site-config contract
- `site.theme.brand.logoAssetId` may be projected into `logoUrl` by the backend/runtime layer

Effect of site/theme config:
- `homeHref` controls the brand link target.
- `logoUrl` and `logoAlt` control the rendered logo asset.
- `wordmark.parts[]` controls segmented text rendering.
- `wordmark.fontFamily`
- `wordmark.fontWeight`
- `wordmark.letterSpacing`
- per-part `color`
- per-part `fontWeight`

Theme contract consumed indirectly:
- Uses `Flex` layout only.
- No direct AntD token reads.

## PhiProfileEmailWidget

Purpose:
- Authenticated profile email change flow with password confirmation and email verification.
- Updates the site-local account email only after the new address has been confirmed.

Key props:
- `runtime.site`
- `runtime.locale`
- `runtime.viewer`

Domain data behavior:
- The current password is checked before a verification intent is created.
- The submit flow stores a `registration_intents` row with `user_id != null`.
- The confirmation link is sent to the new email address.
- The confirm route updates the existing `user_accounts` record instead of creating a new account.

Site/theme config consumed:
- None directly from `site.theme.widgets.*`
- widget-instance config should remain minimal and may only carry explicit spacing overrides

Theme contract consumed indirectly:
- `Form`
- `Input`
- `Input.Password`
- `Button`
- `Alert`
- `Typography`

## PhiProfilePasswordWidget

Purpose:
- Authenticated profile password change flow with current-password verification.
- Updates the local account password immediately after the current password is validated.
- Revokes the current site sessions after a successful password change.

Key props:
- `runtime.site`
- `runtime.locale`
- `runtime.viewer`

Domain data behavior:
- The current password is checked before the new password is persisted.
- The new password and repetition must match.
- The current account password hash is updated locally in `phis`.
- Existing sessions are revoked after a successful change so the user must sign in again.

Site/theme config consumed:
- None directly from `site.theme.widgets.*`
- widget-instance config should remain minimal and may only carry explicit spacing overrides

Theme contract consumed indirectly:
- `Form`
- `Input.Password`
- `Button`
- `Alert`
- `Typography`

## PhiTableWidget

Purpose:
- Generic public CMS table widget for structured provider-owned data.
- Keeps declarative presentation separate from loading, persistence, and business logic.
- Uses the one `PhiTableWidget -> PhiTableBinding -> PhiTableControl -> Ant Design Table/shared Phi
  Controls` rendering path defined in `TABLES.md`; domain wrappers are not an alternative Table path.

Key props:
- `config.presentation`
- `config.features`
- `config.initialQuery`
- `config.source`
- `config.signalRoutes`
- translated shared `labels`

Domain data behavior:
- The source binding is exactly `{ providerKey, resourceKey, params? }` or `null`; `tableKey` is rejected.
- The descriptor selected by `providerKey` must declare `kind: "table"`.
- The Provider resource owns row identity, typed field schema, validation, filtering, search, sorting,
  pagination, mutations, and domain data. `PhiTableBinding` owns Provider resolution and
  query/loading/error/mutation reconciliation. The Widget owns CMS config and signal routing and never
  sends its complete config to the Provider.
- Provider metadata must not become a Form-bootstrap or domain-state side channel. Use an Options
  Provider, Form read source, or Controller signal.
- Toolbar, row, and bulk actions explicitly select `provider`, `signal`, or `link` execution. Dialog
  state is coordinated by signals and Forms, not a domain Table wrapper.
- Editable boolean columns use the Provider field-mutation lifecycle and render `PhiSwitchControl`;
  they do not invent a cell action. Row actions may declare row-value disabled conditions and an
  optional confirmation without adding a domain branch to the shared table renderer.
- Table actions and selection may also use the shared fail-closed Controller-state `disabledWhen`
  conditions. State travels through explicit generic condition request/change routes; the Table never
  hardcodes a role or treats presentation disablement as mutation authorization.
- Row selection may reuse the same value-condition contract to disable protected rows. Row actions may
  resolve a link from a declared row value path and open it in a new tab without a domain renderer.
- Thin domain Clients may observe the shared table state only for surrounding presentation or signal
  coordination; provider query/action ownership remains unchanged.
- Columns may declare a static `valueMap` for localized display labels and a closed semantic
  `tagColorMap` for Tag-based renderers while preserving the raw controller value used by query and
  action contracts. Standard Tag colors use Ant Design's status and preset color names; an intentional
  explicit color uses the structured custom-color shape. `tagVariant` selects `outlined`, `filled`, or
  `solid` for the complete column and defaults to `outlined`.
- Modal-backed record editors use a generic Form lifecycle and signals; Provider actions remain the
  mutation path for declared Table operations and never call a domain API from the Widget.
- Shared labels cover generic search, reset, action, selection, empty-state, and binding diagnostics.
- Provider field types own stored value semantics; column renderers centrally cover text, email, date,
  date-time, badge, tags, link, code, switch, and JSON presentation.
- Direct API URLs, controller addresses, server-action names, and widget-specific fetch branches are
  not part of the v1 table contract.
- Rows that omit the Provider resource's declared `rowIdentityPath` are rejected as a visible contract error.
- Domain-named wrappers that only construct a binding or add missing generic behavior are forbidden.
- Inspector choices list active provider descriptors filtered by `kind: "table"`.
- Fixed and reusable rows use versioned static Provider resources. `contentRows` and Provider-key-specific
  Inspector behavior are rejected; the generic Draft/Published resource editor remains migration work.
- `columns` is an ordered collection with stable keys and generic Authoring reordering. Runtime row
  sorting and optional visitor column reordering remain separate state contracts.
- Column sizing uses `content`, `fixed`, or `fill`; fixed widths and content/fill constraints use shared
  CSS lengths. Table-level `auto | fixed` layout and `auto | visible` horizontal overflow remain
  presentation config, never Provider data or raw Ant Design props.
- Hierarchical rows use the shared tree-table structure contract. A pure hierarchy without tabular
  columns uses the generic Tree Widget contract in `TREES.md`.

## PhiTreeWidget

Purpose:
- Generic provider-backed hierarchy using the single
  `PhiTreeWidget -> PhiTreeBinding -> PhiTreeControl -> Ant Design Tree/shared Phi Controls` path.
- Keeps node presentation, tools, selection, checking, expansion, editing, actions, and DnD declarative
  while the selected `kind: "tree"` Provider owns domain data and mutations.

Domain Tree wrappers, direct domain fetches, and Provider-key branches are forbidden. Complete behavior
and ownership follow `TREES.md`.

Theme contract consumed indirectly:
- `Table`
- `Input`
- `Select`
- `Button`
- `Alert`
- `Typography`

## PhiCollectionViewWidget

Purpose:
- Generic CMS view for non-tabular provider-owned item collections.
- Keeps grid, masonry, or stack presentation separate from loading, persistence, and domain transport.

Domain data behavior:
- The normative Widget, Binding, Control, Provider/resource, self-contained tools, integrated-panel, and
  missing-Provider behavior is defined only by `COLLECTIONS.md`.
- `config.source` is exactly `{ providerKey, resourceKey, params? }` or `null`; the selected descriptor
  declares `kind: "collection"`, item identity, renderer, query capabilities, actions, and panels.
- Missing Providers and resources render a `PhiAlertControl` contract diagnostic without rebinding or a
  direct-fetch fallback.
- The Asset module supplies the `assets` collection, its item renderer, filter Binding, and integrated
  upload panel. Media Picker, Collection View, Inspector updates, and Upload deletion use that Provider;
  binary upload remains a specialized Asset transport.
- `PhiMediaPickerControl` is the controlled compound selection surface. The placeable
  `PhiMediaPickerWidget` adds CMS identity, config, Provider binding, and signals around it. Forms,
  Inspector sections, masks, and Widget toolbars consume the Control and must never nest the Widget.
- `PhiCollectionLayoutControl` owns the provider-free grid, masonry, and stack presentation used by
  collections. `PhiMediaAssetTileControl` and its matching Skeleton Control own one canonical media-card
  presentation; Collection View, Media Picker, and other asset surfaces must compose these Controls rather
  than create another image-button or tile renderer. Media Picker stores only its default
  `minColumnWidth`; the Binding owns transient slider changes, while asset query and mutation semantics
  remain with the Provider.
- `/builder/media` owns one Page Overlay Drawer contributed by the Asset Module. Its explicit
  Collapsible Body tree composes Asset preview, the generic Asset Metadata Form, and technical details;
  its Footer Layout contains the external transaction Buttons. The former `drawer_right` Region and
  self-opening Asset Inspector Widget are forbidden.
- Focal rectangle is one hidden controlled field of the Asset Metadata Form. A normal
  `PhiButtonControl` in the Preview requests the Page-owned Modal. The Asset-owned spatial-editor Widget
  in its Body changes only the Form value; persistence happens only with the outer correlated Form
  submit.

## Transitional PhiAdminUsersTableWidget

`PhiAdminUsersTableWidget` predates the complete `TABLES.md` contract and is migration input, not a
supported domain-Table pattern. Its main and session tables, create/edit Forms, dialog intents, Provider
mutations, and User Management Controller coordination must move to generic Table/Form/Provider/signal
composition. New presets and Modules must not copy or extend this wrapper.

Theme contract consumed indirectly:
- `Table`
- `Switch`
- `Button`
- `Tag`
- `Typography`

## PhiFooterWidget

Purpose:
- Shared footer composition with navigation links and contact block.

Key props:
- `locale`
- `siteKey`
- `brandTitle`
- `brandText`
- `contactEmailValue`
- `contactEmailHref`
- `locationValue`
- `note`

Domain data behavior:
- Fetches footer navigation data.
- Fetches shared footer label set.

Site/theme config consumed:
- None directly from site config at the moment.

Theme contract consumed indirectly:
- Footer client uses shared typography/layout defaults from `ConfigProvider`

## PhiHeaderNavigationWidget

Purpose:
- Header navigation menu based on shared site navigation data.

Key props:
- `currentLocale`
- `siteKey`
- `navKey`
- `menuTheme`
- `renderPreview()` and `renderEditor()` show the menu without live link behavior.

Domain data behavior:
- Fetches header navigation data from site navigation.
- Live rendering stays fully interactive.

Site/theme config consumed:
- None directly from site config.
- Menu appearance is derived from `site.theme.mode` and shared AntD component tokens.

Theme contract consumed indirectly:
- `Menu`
- shared menu component tokens from `site.theme.antd.components.Menu`

## PhiImageWidget

Original Assets and generated variants are distinct presentation inputs. An original may consume the configured
`fit` and `objectPosition`; its focal rectangle is only the automatic position fallback when no explicit position
exists. A generated `cover` variant is already the server-owned focal crop. Every runtime renders that completed
variant proportionally with centered cover overflow and must not stretch it or apply the focal rectangle again.
Generated `contain` and other non-cropping variants likewise render the completed rendition without focal
repositioning. Authoring may simulate the exact pending server crop from the original only while a focal edit is
unsaved; after persistence it consumes the invalidated variant URL and delivery revision.

## PhiCardWidget

Purpose:
- Flexible content card for promos, product teasers, feature tiles, and small editorial blocks.

Key props:
- `title`
- `description`
- `eyebrow`
- `meta`
- `sourceKind`
- `assetId` and optional `variantKey` for Site Assets
- `sourceUrl` only for external `url` sources; Asset sources never persist or fall back to a copied URL
- `alt`
- `href`
- `actionLabel`
- `actionHref`
- `variant`
- `highlight`

Domain data behavior:
- Server wrapper translates the text fields when translation is enabled.
- Client implementation renders the card via Ant Design `Card`.

Widget contract:
- `default` variant is the neutral general-purpose card.
- `compact` variant reduces density for tighter lists and sidebars.
- `featured` variant increases emphasis and cover presence.
- `highlight = true` adds a primary-colored border accent.
- `href` is treated as the primary content link.
- `actionLabel` and `actionHref` provide an explicit CTA.

Theme contract consumed indirectly:
- `Card`
- `Button`
- `Typography`
- Ant Design tokens supplied by `PhiConfigProvider`

## PhiLocaleWidget

Purpose:
- Locale switcher for the current site.

Key props:
- `currentLocale`
- `siteKey`

Domain data behavior:
- Server wrapper loads the site config and extracts locale options plus the locale widget config slice.
- Client implementation receives only the filtered locale data it needs.

Site/theme config consumed:
- `site.availableLocales`
- none directly from `site.theme.widgets.*`
- widget-instance config should come from CMS widget rows

Effect of site/theme config:
- `mode = "label-list"` renders the regular label-based locale switch.
- `mode = "compact-pill"` renders the compact oval trigger.
- `showText = false` prefers the locale code instead of the long label.

Theme contract consumed indirectly:
- `Dropdown`
- `Typography.Link`
- inherited typography and color from the surrounding shell/header

## PhiSidebarNavigationWidget

Purpose:
- Sidebar navigation menu based on shared site navigation data.

Domain data behavior:
- Fetches site navigation through the shared `navKey`.
- Falls back to the widget config `items` only when no navigation data exists for that key.
- First-party shell presets may seed stable fallback items in code, but the runtime lookup stays on the shared navigation contract.
- Translation scope follows the `navKey` namespace:
  - `builder:*` is reserved for Phi-owned builder chrome navigation and uses global shared UI translations from the preset fallback path.
  - every other `navKey` is site-owned navigation content and uses site-scoped navigation lookup and translations.
  - this keeps Builder chrome labels consistent with Builder page titles without globalizing user navigation labels.

Key props:
- `currentLocale`
- `siteKey`
