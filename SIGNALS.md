# Signal Contract

Widgets, Layouts, Regions, Overlays and Controllers coordinate in the browser through one signal
contract. This document owns it: the signal shape, scopes, addresses, actions, value types and schemas,
capabilities and persisted routes, delivery and correlation, the standard renderable-block channels, the
Site Core Runtime Controller, and semantic drag and drop. Domain contracts (Tables, Trees, Collections,
Forms, Overlays) define their own channels on top of it and link here for everything generic.

The closed vocabularies and the address grammar live in `@phis/contracts/signals`
(`phis-contracts/src/signals.ts`), because `phis` validates stored wiring against the same lists. The
UI-side types, value-schema catalogue, and route readers live in `types/signals.ts`; the bus lives in
`components/runtime/runtime-signal-bus.tsx` and `components/runtime/runtime-signal-registry.tsx`.

## Shape

`PhiSignal` is the only signal shape. Feature-local message contracts are not allowed.

```ts
type PhiSignal = {
  originId: string;
  scope: PhiSignalScope;
  channel: string;
  action: PhiSignalAction;
  value: PhiSignalValue;
  valueType: PhiSignalValueType;
  valueSchema?: PhiSignalValueSchema | null;
  meta?: { label?: string | null; checked?: boolean | null; sourceLabel?: string | null } | null;
  sender?: PhiSignalAddress | null;
  receiver: PhiSignalAddress | "broadcast" | null;
  correlationId: string;
  timestamp: number;
};
```

- Routing belongs in `scope`, `channel`, `action`, `sender`, and `receiver`; data belongs in `value`
  with the matching `valueType`. Alternate value fields (`selectKey`, `payload`, `valueKey`, ...) are not
  part of the contract.
- `meta` is limited to `label`, `checked`, and `sourceLabel`.
- `originId`, `correlationId`, and `timestamp` are filled by the bus when the emitter omits them
  (`PhiSignalInput`).
- `channel` is a configured string that connects an emitter to a receiver capability. Name channels by
  what the receiver does (`themeMode`, `activeSlotIndex`, `assetKind`), not by the sending control.

## Scopes

The scopes are exactly `widget`, `layout`, `region`, `page`, `area`, and `site` (`PHI_SIGNAL_SCOPES`).

- `runtime` is an execution environment and a registry partition, not a scope. `slot` and `block` are
  not scopes.
- `scope` is not `scopeKey`. A `scopeKey` names a transient store, provider, collection, or data-source
  namespace and never selects a signal route.
- `site` admits exactly one receiver: the Core Runtime Controller (see
  [Site Core Runtime Controller](#site-core-runtime-controller)). A Site-scope signal to a CMS instance,
  a Region, another Controller, or `broadcast` is refused -- by `phis` when the route is written and by
  the bus at delivery (`readPhiSignalReceiverScopeProblem`).

A receiver is registered in exactly one scope, and that registration decides:

- A block registers in the scope of the tree it is drawn from: a Page tree gives `page`, an Area preset
  gives `area`, a Region gives `region`. A Controller registers in its `mountScope` (`site`, `area`, or
  `page`).
- Delivery to a concrete address takes the scope from the receiver's registration; the scope a route or
  a dispatch declared is not consulted.
- `broadcast` has no receiver to ask, so its scope is part of the address and must be named.

## Addresses

`PhiSignalAddress` has exactly three families:

| Family | Grammar | Names |
| --- | --- | --- |
| CMS | `cms:<instanceId>` or `cms:<instanceId>:<subcontrolKey>` | a Widget or Layout instance, or one control inside it |
| Region | `region:<regionKey>` | a Region of the active route context |
| Controller | `controller:<pluginKey>/<controllerKey>:<instanceKey>` | one Controller instance |

- `<instanceId>` is a `PhiCmsInstanceId` (16 Base64URL characters, see [CMS.md](./CMS.md#instance-identity)).
  Widget or Layout kind is registry metadata and never part of the address. Overlays use the same
  family.
- A subcontrol key is a local, stable key of a control inside the instance, for example a toolbar button
  (`cms:<instanceId>:save`). It never replaces the instance id; `cms:save` is invalid. The address says
  which control is targeted; `channel` and `action` say what happens there.
- A Controller's `<pluginKey>` is either a bare npm package name or
  `<npm-package>/modules/<module>/<namespace>` (`isPhiControllerPluginKey`). First-party Controllers use
  `@phis/ui/modules/<module>/controller`:
  - `controller:@phis/ui/modules/core/controller/default:default` -- the Core Runtime Controller
  - `controller:@phis/ui/modules/core/controller/form:<instanceKey>` -- a runtime Form controller
  - `controller:@phis/ui/modules/builder/controller/default:default` -- the Builder Controller
- A Controller with a single instance uses `default` as its instance key.
- Addresses are built with `createPhiSignalAddress`, `createPhiSignalSubcontrolAddress`, and
  `createPhiControllerSignalAddress`, and read with `readPhiSignalAddress` and
  `readPhiControllerSignalAddressParts`. Code does not concatenate address strings.
- `widget:`, `layout:`, `object:`, `runtime:`, `site:`, `area:`, `page:`, `slot:`, and `block:` are not
  address families.

`sender` is a concrete address or `null` and is never `broadcast`; it is derived from the mounted
instance. `receiver` is:

- `null` -- not wired; nothing is emitted.
- `"broadcast"` -- delivered to every matching listener in the named scope and the current runtime
  context. It is never implied by a missing receiver.
- a concrete address -- targeted delivery.

## Actions

The actions are exactly `activate`, `change`, `toggle`, `start`, `stop`, `clear`, `open`, `close`,
`reload`, `flush`, `filter`, and `drop` (`PHI_SIGNAL_ACTIONS`).

- `change` is the only setter; what changes is the channel.
- `toggle` inverts current state and carries `valueType: "none"`.
- Commands are channels with `action: "activate"`: `save`, `publish`, `undo`, `createPage`, and a form
  submit are channels, not actions.
- Lifecycle actions keep their domain in the channel: data reload is `<domain>/reload`, focus is
  `focused/change` (boolean), effects are `effects/start|stop|clear`, drag is `drag/start|change|stop`,
  and a committed drop is `drop/drop`.

## Value types and schemas

The value types are exactly `none`, `boolean`, `string`, `number`, `date`, `time`, `enum`, `color`,
`path`, `length`, `size`, `image`, `icon`, `string[]`, `number[]`, `enum[]`, and `json`
(`PHI_SIGNAL_VALUE_TYPES`).

- A receiver capability has one `valueType` per channel and action. A concept that needs two value
  families uses two channels.
- `color` carries CSS paint strings, including gradient strings. `length` is a scalar CSS length;
  `size` is a `{ width, height }` pair.
- Widgets emit their native control value: a switch emits a boolean, a select its selected value, an
  activation control `none` or a command string.

Every `json` capability and route names a value schema; non-JSON signals carry none.

- The schema grammar is `<owner>/signals/<schemaKey>`, where `<owner>` is an npm package or
  `<npm-package>/modules/<module>` (`isPhiSignalValueSchema`). `phis` checks only the shape.
- First-party schemas come from `PHI_SIGNAL_VALUE_SCHEMAS`, built with
  `createPhiSharedSignalValueSchema(key)`, which resolves the owning module:
  `PHI_SIGNAL_VALUE_SCHEMAS.backgroundConfig` is `@phis/ui/modules/core/signals/background-config`.
  Code never spells the prefix by hand.
- **A new first-party schema is registered before it resolves.** `createPhiSharedSignalValueSchema`
  reads the owner out of `constants/runtime-module-ownership.ts` (`"signals/<key>": [module, leaf]`,
  where the leaf drops the module's own name), and a key with no entry throws
  `Unowned first-party identifier` when the module is imported -- which reads as a broken import rather
  than as a missing line, because it is raised at module scope. This is
  [MODULES.md](./MODULES.md)'s registration rule reaching a case that is not about creating a Module:
  an existing Module gaining one schema registers it the same way. A third-party package composes its
  key from its own name and never passes through this table.
- A third-party package builds its schemas with `createPhiSignalValueSchema(packageName, schemaKey)` or
  its own module-scoped key.
- **A generic sender defers its schema to whatever is bound to it.** A Widget backed by a data provider
  cannot know what its selection means, because the bound resource decides that. Such an output declares
  `valueSchemaFrom: "data-source"` in place of `valueSchema`, and the resource descriptor declares
  `selectionValueSchema`. The Builder resolves the two when it writes the route, so matching and the
  runtime only ever see an ordinary concrete schema, and a capability whose source declares nothing is
  not offered at all. Only a sender may defer -- a receiver has to know what it listens for before
  anything arrives, and has no source to ask. This is what keeps Core from spelling out a Module's name:
  `collection-view` used to announce every selection as `mediaAssetSelection` whichever provider was
  bound, so a collection from another package could be shown but could not mean anything of its own.
- JSON routes match only when scope, channel, action, value type, and value schema are all compatible.

### Naming a value, and translating one

Two gaps look alike from a distance, and answering both in the same place makes one of them wrong.

**A value that domain code produced is named at its source.** A Collection's items are drawn by a
renderer the owning Module registers, so a selection's payload is that Module's to build: it knows a
row is a conversation and writes `{ threadId }`. The generic Widget around it must not spell the name
out, so the resource declares `selectionValueSchema` and the capability defers with
`valueSchemaFrom: "data-source"`. Nothing is converted -- the Builder resolves the name when it writes
the route, and matching and the runtime see an ordinary concrete schema.

**A value that generic Core code produced is translated, not renamed.** A Table builds its own
selection: `tableSelection` is `{ selectedRowIdentities }`, and that is already the truthful name for
what a Table knows. What is missing is not a name but the meaning, and the meaning is a different
value -- one row identity becomes one `threadId`, and a multi-selection has to collapse or be refused.
That is a Module Controller's work: it listens for the generic signal and emits its own. Labelling
`{ selectedRowIdentities }` as `threadSelection` would satisfy every check on the route and hand the
receiver a payload it cannot read, which is worse than no route at all.

The test is one question: **did domain code build this payload?** If it did, name it there. If Core
built it, translate it in the Controller. The conversations Module does both -- its Collection renderer
names its own selection, and its Controller turns a Table's selection and a Form's result into the same
`threadSelection`.

## Capabilities and routes

A plugin declares what it can do; a concrete instance stores how it is wired. The two never mix.

- `fields` declares Inspector-editable config. Renderable-block `capabilities` declares binary interaction
  participation (`selectable`, `draggable`, `hoverable`, `activatable`, `focusable`, `droppable`).
  `runtimeSignals` declares signal capabilities. None of these is inferred from another.
- `runtimeSignals.emits` lists sender outputs: `{ id, action, valueType, valueSchema?, valueSchemaFrom?,
  enumValues?, required?, target? }`. Outputs declare no channel and no scope, and name either a schema
  or where to read one, never both.
- `runtimeSignals.listens` lists receiver inputs: the same fields plus `channel`. Inputs are unique per
  receiver by `channel + action + valueType + valueSchema` (`assertPhiSignalPluginMetaContract`).
  Receiver channels are fixed capabilities; free-text listener channels are not accepted.
- `target` is `self`, `subcontrol`, or `both` and filters capabilities for the wiring UI only.
- `runtimeSignals.dragDrop` declares drag sources and drop targets (see [Drag and drop](#drag-and-drop)).
- Dynamic subcontrol collections are declared by `signalSubcontrols` on the Widget definition, so
  endpoint resolution and route cleanup never branch on a type key.
- Standard controls reuse the capability sets in `components/widgets/signals/control-signal-capabilities.ts`
  and `renderable-block-signal-capabilities.ts` instead of repeating them.

Concrete wiring is persisted as `signalRoutes: { emits?, listens? }` in the instance config
(`PhiSignalRoute`, read by `readPhiSignalRouteSet`):

```ts
type PhiSignalRoute = {
  routeKey: string;
  capabilityId: string;
  scope: PhiSignalScope;
  channel: string;
  action: PhiSignalAction;
  valueType: PhiSignalValueType;
  valueSchema?: PhiSignalValueSchema | null;
  receiver: PhiSignalAddress | "broadcast" | null;
};
```

- `routeKey` is the route's identity, unique across the instance's emit and listen routes. Route CRUD
  uses it. Presets write explicit stable keys; the Builder creates keys with `createPhiSignalRouteKey()`.
  A key survives edits, publish, and receiver remapping, and is never derived from an index, the
  route's contents, a receiver, or a timestamp.
- `capabilityId` references a declared output (in `emits`) or input (in `listens`). Emitting a
  capability delivers once through every route with that `capabilityId`
  (`findPhiSignalRoutesByCapabilityId`); a first-match lookup is wrong.
- The `channel` on an emit route is the receiver's channel chosen during wiring, so a generic `change`
  output can drive `enabled/change` on one receiver and `themeMode/change` on another. The runtime never
  translates channels.
- Deleting or replacing a receiver removes the routes that target it or its subcontrols in the same
  Builder mutation.
- A Controller carries the same `signalRoutes` in its own config, and its Page writes them:
  `controllerSettings` on a resolved Page tree, beside the routes that Page already writes for every
  Widget on it. An Area does the same through `areaControllerSettings`. Before that a Page-scope
  Controller could be told nothing, so the two that needed receivers held Widget ids from a preset id
  map -- which is the coupling routes exist to remove, and which held only while one piece of code
  owned both ends.

```ts
const runtimeSignals = {
  emits: [{ id: "change", action: "change", valueType: "boolean" }],
  listens: [{ id: "change", channel: "value", action: "change", valueType: "boolean" }],
};

const signalRoutes = {
  emits: [{
    routeKey: "theme-mode-output",
    capabilityId: "change",
    scope: "site",
    channel: "themeMode",
    action: "change",
    valueType: "boolean",
    receiver: "controller:@phis/ui/modules/core/controller/default:default",
  }],
};
```

## Delivery and correlation

Delivery state belongs to providers, never to module globals. The Root owns the Site partition, each
mounted Area owns an Area partition, and each Builder Canvas owns an isolated Canvas partition.
Subscriptions and registrations are destroyed with their provider. Browser tabs do not exchange signals.

- Receivers register while mounted and unregister on unmount. A registered receiver is active only
  inside the current runtime context (Area, Page, Region); a cached or hidden instance outside it does
  not receive.
- No signal travels from one Area to another. The only boundary crossing is an explicit Site-scope route
  to the Core Runtime Controller and its outputs into the active Area and Page. A Canvas partition never
  reaches the live Site endpoint.
- A signal to an address that is not registered yet, or registered without a listener, is `pending`: it
  is held and delivered when the receiver and a listener for it are both present. A signal that cannot be
  delivered at all -- a scope violation, an inactive receiver, a receiver outside the current context --
  is `undeliverable`: it is dropped and reported once on the console as `[phi-signals] Dropped ...`
  (`resolvePhiSignalDeliverability`).
- A signal that arrives and is sent again by something it reaches is neither of those: nothing is
  dropped, nothing is held, and the main thread stops. In development the bus counts deliveries per
  route in a one-second window and reports once past 200 -- an order of magnitude above anything a
  person or a frame rate produces. It reports and does not intervene: a circle is a fault in the
  wiring, and dropping the signal that was one too many would decide which wirings are real. The count
  is guarded so a production build does not carry it.
- A listener that reads signals addressed to an address names that address: the third argument of
  `usePhiSignalListener`, or `receiver` in its filter. Delivery counts listeners per address, so a
  listener that only compares `signal.receiver` in its body leaves those signals held. Listening in on an
  address another listener owns is allowed. `scripts/validate-signal-address-contracts.ts` enforces this.
- Listen routes update local state only; they never emit another signal implicitly. Controllers suppress
  no-op state changes instead of emitting redundant feedback.
- `renderPreview()` and `renderEditor()` output does not emit live signals.

`correlationId` is present on every delivered signal. The bus creates one when the emitter supplies none.

- A reply, feedback, or state change caused by a signal passes `signal.correlationId` explicitly --
  through any helper it calls and across an `await`. An omitted id is replaced by a fresh one, which makes
  the reply look like a new exchange.
- A new exchange is started with `createPhiSignalCorrelationId()`. A correlation id is never a literal.
- `scripts/validate-signal-correlation-contracts.ts` enforces both rules.
- `condition/reload` is answered with `usePhiRuntimeConditionStateResponder`, which replies
  `condition/change` (json, `runtimeConditionState`) to the asker under the asked correlation id and
  accepts a getter for state held outside React state.

## Renderable-block channels

Every Widget, Layout, and Region receives these channels through the shared runtime
(`PHI_RENDERABLE_BLOCK_RECEIVE_BINDINGS`); a Widget never implements its own hide/show/collapse
receiver.

| Channel/action | Value type | Value |
| --- | --- | --- |
| `visibility/change` | `enum` | `visible`, `collapsed`, or `hidden` |
| `visibility/toggle` | `none` | |
| `enabled/change` | `boolean` | `false` keeps the block but blocks interaction |
| `size/change`, `minSize/change`, `maxSize/change` | `size` | |
| `background/change` | `json` | `PHI_SIGNAL_VALUE_SCHEMAS.backgroundConfig` |
| `border/change` | `json` | `PHI_SIGNAL_VALUE_SCHEMAS.borderConfig` |
| `shadow/change` | `string` | `none`, `soft`, or `strong` |
| `zIndex/change` | `number` | |
| `opacity/change` | `number` | clamped to `0..1`, default `1` |
| `effects/start`, `effects/stop`, `effects/clear` | `none` | |

- Show, hide, expand, and collapse helpers emit `visibility/change` with the canonical value.
- `opacity: 0` keeps layout participation; use `visibility` to remove or collapse a block. Block
  `opacity` and `effects.opacity` are separate settings.
- A custom CSS shadow is persisted configuration and does not travel through `shadow/change`.
- Slot state is addressed to the owning Layout: a Stack Layout listens to `activeSlotIndex` and
  `activeSlotKey` (`components/layouts/stack-signals.ts`).
- `renderMode` is a transient render hint and never a signal channel.

### Content channels, and what actually answers them

The table above is the shared set: every block honours it, through the runtime, with nothing to declare.
The runtime accepts a second group on the same path -- `text`, `content`, `html`, `markdown`,
`markdownToc`, `descriptionConfig`, `icon`, `imageConfig`, `color`, `textColor`, `style`, `fontFamily`,
`fontSize`, `textStyle` -- and these are **not** shared. Each is answered by whichever Widget decided to,
in its own `client.tsx`, and by no other.

What answers them today:

| Widget | Channels it answers |
| --- | --- |
| `simple-text` | `text`, `icon`, `textColor`, `fontFamily`, `fontSize`, `textStyle` |
| `html` | `fontFamily`, `fontSize` |
| `icon` | `icon`, `textColor` |

Nothing else subscribes at all, and `content`, `markdown`, `markdownToc`, `descriptionConfig`,
`imageConfig`, `color` and `style` are names the runtime will deliver that no block acts on yet.

Three things follow, and each of them is a dead end somebody has walked into:

- **These are not `runtimeSignals`.** A Widget answering `text/change` declares nothing for it: the
  capability lives in the shared runtime, and the receiver is the ordinary `cms:<instanceId>` address. So
  a Widget definition with no `runtimeSignals` at all may still answer half this table -- `simple-text`
  does. Reading the definition and concluding "it cannot" is wrong, and declaring these channels as
  `runtimeSignals.listens` is wrong the other way: it states a second contract over the same channel, and
  the plugin-meta check rejects it at the first one needing a `valueSchema`.
- **Acceptance is not agreement.** `isPhiRenderableBlockSignalChannel`
  (`components/runtime/renderable-block-runtime.tsx`) is the list the runtime will route. Whether the
  block at the other end does anything is decided in that block's client and nowhere else.
- **So check the client, not the config.** `grep 'signal.channel ===' <widget>/client.tsx` answers in one
  line what no definition, no type and no table can promise on the client's behalf -- including this one,
  which is a reading of those clients and goes stale the moment one of them changes.

## Site Core Runtime Controller

The Core module mounts exactly one Core Runtime Controller in the Root Layout, above every Area, at
`controller:@phis/ui/modules/core/controller/default:default` (`PHI_CORE_RUNTIME_CONTROLLER_ADDRESS`).
Its `mountScope` is `site`; it is not selectable and stays mounted during client navigation between
Areas under the same Root Layout. It applies already-resolved Site and Page state to the browser and
performs the acts that belong to the browser rather than to a Page; it is not the source of Theme, Page
metadata, Locale, or any persisted state -- those are decided elsewhere and arrive here resolved. Acts
are its own: forwarding, asking for the Page again, and ending the session. Its definition is
`components/runtime/core-runtime-controller-definition.ts`.

It listens to exactly these inputs, all in Site scope:

| Channel/action | Value type | Effect |
| --- | --- | --- |
| `pageTitle/change` | `string` | sets `document.title` |
| `pageDescription/change`, `pageDescription/clear` | `string`, `none` | sets or removes the description meta |
| `openGraphImage/change`, `openGraphImage/clear` | `image`, `none` | sets or removes `og:image` |
| `canonicalUrl/change`, `canonicalUrl/clear` | `string`, `none` | sets or removes the canonical link |
| `theme/change` | `json` (`runtimeTheme`) | applies a resolved Theme live |
| `themeMode/change` | `boolean` | `true` shows dark, `false` light. The Controller persists it: the `phis_theme_mode` cookie always, and the account (`PATCH profile/theme`) for a viewer who has one. The channel stays `boolean` because it names the half to show, not the preference -- "follow the browser" is not a thing a receiver can display, and it is chosen in Settings ([THEME.md](./THEME.md)) |
| `locale/change` | `string` | applies a locale from the Site's available locales |
| `path/activate` | `json` (`runtimeNavigation`) | forwards the browser |
| `reload/activate` | `none` | asks the Server for the current Page again |
| `session/clear` | `none` | ends the session this browser holds |
| `notification/activate` | `json` (`notification`) | shows an application notification |
| `message/activate` | `json` (`message`) | shows an application message |

- `path/activate` carries `{ path: string; replace?: boolean }`. The path must start with `/` and not
  with `//`; anything else is refused. `replace: true` replaces the history entry. A Widget that needs to
  send the visitor somewhere asks here instead of calling `location` itself.
- `session/clear` carries no value and is the only input here that reaches the Server: it posts to the
  Site's own `/api/auth/logout`, which every Site mounts whether or not an Auth Module is installed, and
  then asks for the Page again so the Area answers what somebody with no session may see. Site scope,
  because a session belongs to the account on this Site and not to the Area it was ended from -- an Area
  that models its own sign-out would be one of six copies of one act. A failed call changes nothing and
  forwards nobody.
- `reload/activate` carries no value and is the answer to "what this Page renders has changed
  underneath it": a Form wrote something only the Server applies, such as the language the account reads
  in, and what follows is the same Page rendered again. It is `router.refresh()`, so the route's Server
  components are re-rendered with the cookies the browser now holds and the visitor keeps their place.
  A Page whose address itself would change is a `path/activate` instead -- Public is localized in its
  path, while a staff Area is routed by its own segment and carries no locale to change.
- Notification values are `{ level, title, description?, durationSeconds?, placement?,
  showTimeoutProgress? }`; message values are `{ level, content, durationSeconds? }`
  (`types/core-runtime-controller.ts`). `level` is `success`, `info`, `warning`, or `error`; `title`,
  `content`, and a supplied `description` are non-empty trimmed text; `durationSeconds` is finite and
  `>= 0`; `placement` is `top`, `topLeft`, `topRight`, `bottom`, `bottomLeft`, or `bottomRight`. Unknown
  fields invalidate the value.
- Feature code sends notifications and messages with `usePhiApplicationFeedback`; it never calls the Ant
  Design message or notification API. Inline status uses `PhiAlertControl`; local confirmation uses
  `PhiConfirmControl`.
- Inputs are idempotent and are not echoed.

Its outputs are snapshots for receivers in the active context:

- `pageMeta/change` (json, `pageMeta`) with `{ area, pageKey, pageTitle, pageDescription, pagePath,
  pageType }`, each a value or `null`, emitted as a Page-scope broadcast when the Site or the active
  Page context mounts. A Page Title Widget initializes from it.
- `themeMode/change` (boolean), emitted as a Page-scope broadcast whenever the mode on screen changes, so
  a mode switch shows the actual mode.
- Mount snapshots start a new correlation; a deliberately correlated apply flow keeps its id.

Server-rendered metadata stays authoritative for the initial HTML and for crawlers. Theme persistence
stays with the Theme controller, Page metadata with the Builder, and locale configuration with its server
flow.

## Drag and drop

Drag and drop is semantic and engine-agnostic. The pointer engine (`dnd-kit` in the Builder, native
events elsewhere) is an implementation detail and never part of the contract.

- `capabilities.draggable` and `capabilities.droppable` say whether a block participates.
- `runtimeSignals.dragDrop` declares `sources: [{ key, types, title?, description? }]` and
  `targets: [{ key, accepts, modes?, title?, description? }]`. Payload types are namespaced strings.
- Drop modes are exactly `before`, `after`, `child`, `replace`, `append`, and `swap`
  (`PhiSignalDropMode`).
- The lifecycle is `drag/start`, `drag/change`, `drag/stop`, and `drop/drop`. Values are `json` with
  `PHI_SIGNAL_VALUE_SCHEMAS.dragDrop` and carry semantic data such as payload type, source key, target
  key, drop mode, and acceptance.
- Signals carry committed semantic state, not pointer movement. Pointer coordinates and collision state
  are never persisted or signaled.
- Moving a Widget between slots in the Builder is a Draft mutation governed by the parent slot contract
  ([BUILDER.md](./BUILDER.md)); widget-local drop contracts (`onWidgetDrop`, `dragPayload`, `dropKind`)
  are not allowed.
