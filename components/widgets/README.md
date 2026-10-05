# Widgets

The Widget layer: rules every CMS Widget follows, the editor scaffold a Widget renders inside, and the
Controls a Widget composes. How a Module package adds a Widget is
[THIRD_PARTY_MODULES.md](../../THIRD_PARTY_MODULES.md#4-add-a-widget); Widget ownership, render policies,
and loading are [MODULES.md](../../MODULES.md); signal capabilities, routes, and addresses are
[SIGNALS.md](../../SIGNALS.md).

## Where Widgets live

- Every Widget belongs to one Runtime Module and lives in
  `plugins/runtime-modules/<owner>/widgets/<name>/`, with `config.ts` (server-safe definition and
  parser), `plugin.tsx` (Runtime and Preview), `authoring.tsx` (the Builder editor), and `client.tsx` or
  `server.tsx` where the Widget needs them. The owner's `widgets.ts` and `authoring-widgets.ts` register
  them.
- This folder holds what several Widgets share: `config/` (shared config models such as background,
  geometry, and parser primitives), `client/` and `server/` (shared bodies), `builder/` (shared authoring
  editors), `signals/` (reusable capability sets), `label-sets/` and `label-types/` (see
  [TRANSLATIONS.md](../../TRANSLATIONS.md)), and `built-in/` (runtime paths that are not placeable
  Widgets). Nothing here is registered as a Widget by itself.

## General rules

- **A Public Widget's server half renders once for every anonymous visitor**
  ([STATIC_RENDERING.md](../../STATIC_RENDERING.md)). It must not read `cookies()`, `headers()`, or the
  viewer, nor render a per-visitor value such as a token, nonce, timestamp, or random value; those load
  in the browser.
- A `Phi*Widget` is a complete CMS Widget with identity, config, signals, and registered Runtime,
  Preview, and Authoring projections. Presentation-only editors are `Phi*Control` components.
- **A Widget that collects input places the Form Widget** ([FORMS.md](../../FORMS.md)). Fields,
  validation, the submit, the failure text, and the waiting state are the Form's declared job, and a
  Widget that writes them again by hand has none of those contracts and none of their translations. What
  a Widget legitimately owns is the rest: which record it looks at, the signals it sends and listens to,
  and the surface around the Form. If the field kind it needs does not exist, a field Provider is added in
  `components/forms/` -- or in the owning Module's Provider set -- after the operator has agreed to it,
  and never as a bespoke input inside the Widget ([AGENTS.md](../../AGENTS.md), "Design rules").
- A Widget must not contain another Widget. Composition of several Widgets belongs to Layouts and their
  slots ([LAYOUTING.md](../../LAYOUTING.md)). Inside one Widget, Ant Design primitives the validator does
  not yet name may still be imported directly, and interactive primitives come from the canonical Phi
  Controls. "Free" is what this said before and it was already too generous: the set of uncontrolled
  primitives is a leftover rather than a grant, and it is being closed --
  [TODOS.md](../../TODOS.md), "Wrap the uncontrolled Ant Design primitives in Phi Controls". Reach for a
  Control where one fits, and for a Layout slot rather than a layout primitive.
- Widgets are leaves. They share the renderable-block contract with Layouts (`visibility`, `enabled`,
  `size`, `minSize`, `maxSize`, `zIndex`, `opacity`, `effects`) and never implement their own
  hide/show/collapse receivers; the shared slot child frame (`plugins/runtime/phi-slot-child-frame.tsx`)
  handles those channels. A renderer passes the Widget's full `config` to the frame, which reads only the
  block slice.
- Persisted `size` is renderable geometry (`{ width, height }`). Visual density is the separate
  `controlSize` (`small | medium | large`); Widgets reuse `PHI_CONTROL_PRESENTATION_FIELDS` and
  `parsePhiControlConfig(...)`.
- A Widget declares a `slotSizePolicy` when it needs more than the default `intrinsic`. Renderers read the
  policy; they never branch on a Widget type to decide fill behavior.
- A Widget's look -- ground, edge, depth -- is the block's `surface` ([LAYOUTING.md](../../LAYOUTING.md#surface)),
  drawn by the slot frame. A Widget that has to draw it inside its own box declares `surface: "own"` and
  reads `config.surface` through `resolvePhiSurfaceStyle`; one that has no look of its own declares
  `surface: "none"`. A Widget never adds background, border or shadow fields of its own for the box it
  sits in.
- Interactive Controls consume the resolved `theme.shape.controls` shape ([THEME.md](../../THEME.md#control-shape));
  Widgets never persist raw radii or map shape names themselves.
- Config is persisted sparsely: absent, empty, or default values are omitted, and `parseConfig` restores
  the full shape.
- A Widget loads only the data its purpose needs. It never fetches Site, Theme, or runtime config on its
  own; the server half passes the client only the config and runtime slice it uses, never raw Site or
  Theme JSON.
- In client components, token-derived colors, backgrounds, borders, and shadows go through classes or
  component-scoped CSS variables rather than inline end values, which browsers normalize and which then
  mismatch on hydration. Inline styles are for geometry.

## Definition metadata

- `fields` is the only source of Inspector-editable config. The Builder never branches on a Widget type,
  key, or plugin to render settings; specialized settings use generic field types (`choice` with static
  `options` or an `optionsProvider`, `collection` with `itemKeyField` and `itemFields`, `number` with
  `min`/`max`/`step`/`precision`).
- `editorPlacement` places a field: omitted or `inspector` in Settings, `geometry` in the shared
  Geometry section, `toolbar` in the scaffold toolbar. A toolbar field is not rendered again in the
  Inspector.
- `category` is one of `PHI_CMS_PLUGIN_CATEGORIES` and only groups Widgets in the Picker. Availability
  comes from ownership: the Widget appears where its owner Module is active.
- `runtimeSignals` declares signal capabilities and `signalSubcontrols` declares dynamic subcontrol
  collections ([SIGNALS.md](../../SIGNALS.md#capabilities-and-routes)). Renderable-block `capabilities`
  declare binary interaction participation only. None of the three is inferred from another.
- `contentBinding` declares that a Widget persists canonical content through `content_id`: `storage` is
  `text`, `html`, `markdown`, or `asset`, with `sourceField` and optional `skipWhenConfigField` or
  `skipWhenConfigFieldValue`. The Builder forwards it in the write payload; `phis` persists against it
  and never branches on a Widget type.
- `requiredRuntimeControllers` and `requiredDataProviders` declare dependencies; they never change
  ownership or enable a Module.

## Render paths

- `render()` is live output. `renderPreview()` is a safe live-like preview without side effects
  (no logout, mutation, navigation, or signal emission); it may be server-rendered and use `tr()`.
  `renderEditor()` is the client-safe authoring body in the Builder Canvas. Which path an occurrence uses
  follows the Widget's render policies ([MODULES.md](../../MODULES.md#render-modes-and-diagnostics)).
- `renderPreview()` and `renderEditor()` render from the config and labels they receive. They do not
  import registries or re-resolve plugin metadata or label sets.
- The authoring path never falls back to the server-owned `renderPreview()`. A passive Widget supplies its
  editor body through `createPhiCmsBuilderWidgetPlugin(...)`.
- `renderEditor()` serves the structure-authoring workspaces (`/builder/phis/ui/pages`,
  `/builder/phis/ui/shells`). Builder pages that render live (navigation, theme, revisions, media) use
  the normal Runtime path.

## Editor scaffold contract

The Builder renders every Widget leaf through one shared editor scaffold. The scaffold owns generic
editor interaction and chrome; a Widget owns its visual and domain content.

- The scaffold has five ordered layers: the renderable-block slot child frame, the live-like Widget
  content, the selection and interaction surface, optional Widget-owned authoring chrome, and shared
  editor tools (Inspector, delete, wiring, effects).
- Widget content is inert in the editor: it receives no pointer, keyboard, focus, form, link, or drag
  interaction, yet stays visually enabled. Inertness is never expressed through `enabled`, `readOnly`, or
  local `disabled` props. Signal emission from the mounted Widget is suppressed centrally.
- The interaction surface owns selection, hover, and the drag handle. It covers the leaf without changing
  its geometry and offers a keyboard selection target. Selection, hover, dragging, and authoring state
  are transient and never persisted.
- Hover, selection, and debug chrome use theme tokens and overlays, outlines, or inset shadows that do not
  change layout. Widget renderers hardcode no scaffold colors. The debug palette is the
  `--phi-debug-layer-*` variables in `styles/layout-authoring-scaffold.css`, enabled by
  `data-phi-debug-scaffold="on"`.
- A builder plugin defaults to `editorInteraction: "inert"`. A plugin with real Canvas authoring declares
  `"authoring"`: a click on an editable target activates that editor, a click elsewhere opens the
  Inspector, and blur, outside click, leaving the scaffold, or Escape commits and exits without also
  reopening the Inspector.
- `renderEditorTools()` adds Widget-owned controls above the interaction surface (for example the Command
  Toolbar's add and remove controls). Its event boundary does not select nodes, open the Inspector, or
  start a drag. Popups opened from scaffold tools register with the scaffold popup lifecycle; the first
  outside click closes them and is consumed.
- `renderEditor()` and `renderEditorTools()` receive `authoring: null` for non-mutating output and a
  Builder-owned authoring context in the editable Canvas. `authoring.updateConfig()` is the only way to
  request a Draft config patch; authoring code never imports the Builder store, builds Controller
  addresses, or persists through runtime signals.
- Lazy authoring bodies and their loading skeletons inherit the definition's `slotSizePolicy` and register
  no signal receiver while loading.
- The full interaction cover applies to Widget leaves only. Layout scaffolds keep nested slots and child
  scaffolds reachable.

## Controls

Controls live in `components/controls/` and are exported from `@phis/ui/controls`; `@phis/ui/widgets`
exports complete Widgets only.

- A Control owns the direct Ant Design primitive, controlled value props, and presentation. It never owns
  CMS parsing, persisted config, runtime signals, Module discovery, or provider registration.
- A Widget composes a Control with config parsing, state, signal routing, and registration. Where a
  reusable Binding exists (`PhiTableBinding`, `PhiTreeBinding`, the Collection View Binding), the Widget
  delegates provider resolution and request state to it.
- Form field providers and Inspector editors use Controls directly and never mount a Widget with
  signaling disabled.
- Canonical input Controls include `PhiTextControl`, `PhiNumberControl`, `PhiSliderControl`,
  `PhiRateControl`, `PhiSelectControl`, `PhiMultiSelectControl`, `PhiSegmentedControl`,
  `PhiSwitchControl`, `PhiCheckboxControl`, `PhiCheckboxGroupControl`, `PhiCascaderControl`,
  `PhiButtonControl`, `PhiToolbarControl`, `PhiLengthControl`, and `PhiDimensionControl`. Overlay and
  picker composition uses `PhiPopoverControl`, `PhiPaginationControl`, `PhiTabsControl`,
  `PhiIconPickerControl`, and `PhiMediaPickerControl`.
- Configuration editors are `PhiBackgroundControl`, `PhiBorderControl`, `PhiShadowControl`,
  `PhiPaddingControl`, `PhiGeometryControl`, `PhiViewportVisibilityControl`, and
  `PhiPlacementMatrixControl`. They take controlled values, resolved labels, disabled state, and
  callbacks. Their Builder Inspector counterparts are Builder Module Widgets.
- `PhiAlertControl` is inline feedback and `PhiConfirmControl` local anchored confirmation. Application
  messages and notifications are not Controls: feature code sends them with `usePhiApplicationFeedback`
  ([SIGNALS.md](../../SIGNALS.md#site-core-runtime-controller)).
- Label and description use `PhiLabeledControl`: label plus description renders the label with an info
  tooltip using `PHI_DESCRIPTION_TOOLTIP_ICON`. Label and description text never becomes a native `title`
  attribute. A Control that renders a label takes its id from `usePhiControlLabel` and points its
  focusable element at it with `aria-labelledby`, so the visible label is also the accessible name; an
  explicit `ariaLabel` takes precedence.
- Option-bearing consumers normalize static options to `PhiControlOption` and resolve dynamic options
  with `PhiControlOptionsProviderConfig` and `usePhiControlOptionsProvider`; the Control receives only
  resolved options.
- `PhiCollectionLayoutControl` and `PhiMediaAssetTileControl` are the one grid/masonry/stack
  presentation and the one media tile; asset surfaces compose them instead of new tile renderers.

### What the primitive sweep taught

- Every Ant Design primitive sits behind a Phi Control; `scripts/validate-control-boundaries.mjs` names
  them all and allows nothing it does not name. A primitive that joins its children through a React
  context (`Space.Compact`) has to stay a wrapper -- `PhiCompactGroupControl` -- because the
  border-collapsing classes come from that context, not from CSS.
- `Space` and `Flex` differ in two ways no typechecker sees: a horizontal `Space` centres its children
  where `Flex` stretches, and `Space` is `inline-flex` where `Flex` is `flex`, which inside a table cell
  follows the cell's `text-align`. Sites that moved from one to the other state `align` and `display`
  themselves.
- A list is `PhiEntryListControl` -- a name, a line, a state and one action -- never antd `List` or a
  virtualised list: a list of ten thousand rows publishes a Data Provider and gets search, sorting,
  paging and authorization with it. Virtualisation earns its place only where thousands of rows stay
  mounted, and no surface here has made that case yet.

## Control Widgets and signals

Generic control Widgets reuse the capability sets in `signals/control-signal-capabilities.ts`.

- A value change emits `change` with the native value; activation emits `activate` with `none` or a
  command string; `toggle` carries `none`. A switch always emits booleans; labels such as light and dark
  are presentation.
- Focus is `focused/change` (boolean). Submit-like commands are channels with `activate`.
- A select emits one value and a multi-select an array; both listen to `change` on their value channel.
  `valueMode: "stack-slot-index"` adapts a control to drive a Stack Layout.
- `select-box` supports `select` and `autocomplete` presentation; `allowCustom` uses the same controlled
  choice contract. `segmented` is another presentation of the same option model.
- Badge chrome is an optional control capability: config `badgeEnabled`, `badgeText`, `badgeCount`,
  `badgeShowZero`, `badgeOverflowCount`, `badgeColor`; runtime updates arrive on `badge/change` as
  `string` or `number`.
- The Command Toolbar (`command-toolbar`) groups command buttons. Each button has a stable `key` that
  becomes its subcontrol address (`cms:<instanceId>:<key>`) and an `emits` list referencing route
  `capabilityId`s; scope, channel, action, and receiver live only in the routes. Buttons may set `label`,
  `tooltip`, `icon`, `display` (`icon | label | icon-label`), `danger`, `disabled`, and `variant`
  (`normal | primary | dashed | subtle | link`). The
  toolbar knows no workspace, page, or publish semantics; Controllers attach context.

### Options Providers

- An Options Provider has one namespaced key, for example
  `@phis/ui/modules/core/options/spacing-scale` or `@phis/ui/modules/asset/options/media-folders`. Its
  descriptor lives in the owner Module definition; its executable Client is composed in the active
  Module's scoped provider context. There is no global registration.
- `optionsProvider` config is a strict object with `providerKey` and optional `scopeKey`, `area`,
  `params`, load mode, and search config.
- A provider returns `{ value, label }` items. An asynchronous provider declares `resolveLoadKey()`
  covering every input that changes its result; equal keys load once across mounted controls. A failed
  load yields an empty result and a warning, never borrowed static options.
- The emitted signal `value` is the option value; receivers never rely on labels.

## Content Widgets

A Widget that translates the text written into its own config says `translatesOwnText: true` in its
definition: `simple-text`, `description`, `markdown`, `html`, `button`, `card`, `result`. Turning that off is
the node's `PhiCmsFlags.NoTranslate` flag and nothing else -- there is no `translate` config field. The
Builder's Inspector offers the switch for exactly these Widgets, and a Preset whose text arrives translated
from a label set sets the flag on the node. For a Widget bound to a Content record the flag also shows the
record's source text instead of its localized version.

- `simple-text` keeps `text` as its live property. A CMS instance persists source text in
  `site_content(type=text)` through `content_id`; code-owned presets may use inline `config.text`.
  `flags & PhiCmsFlags.NoTranslate` renders source text without translation.
- `html` persists canonical markup in `site_content(type=html)` and uses Lexical for authoring. The
  `phis` CMS write endpoint sanitizes HTML before it is stored; client sanitizing is feedback only. Runtime
  and preview receive sanitized markup, and the live HTML Widget accepts no `html/change` signal.
  Translation uses the `html` format. Editor dependencies are MIT-licensed OSS only.
- `icon` renders `PhiIcon` with the `antd:*`, `iconify:*`, and `asset:*` icon strings; size `inherit`
  resolves to `1em`.
- The Image Widget distinguishes original Assets from generated variants. An original uses the
  configured `fit` and `objectPosition`, with the focal rectangle as the position fallback. A generated
  `cover` variant is already the server-owned focal crop and renders proportionally with centered cover;
  it is never stretched or cropped again.
- A Widget that shows a picture draws it with `PhiImageControl`, handing it the answer of
  `resolvePhiImagePresentation` -- never `next/image` or an `<img>` of its own. The Control decides how the
  picture arrives: `next/image` for an Asset (and for a URL a Preset marked `trusted`), the Asset's blur
  while an Asset loads, a plain placeholder for every foreign address. The blur is read from the resolved
  Asset, never stored in a node's config. `preview` opens it in `PhiLightboxImageControl`, the one place
  the lightbox lives.
- The Card Widget draws its own Surface (`surface: "own"`, default `PHI_SURFACE_CARD`) rather than
  a `PhiCardControl` box. It carries a picture at the top (`PhiImageControl`, any variant; the box takes
  the variant's proportion, and the canvas says when the variant is narrower than the card) and an `icon`
  by name (`iconPlacement` `inline` before the heading or `top`, over the picture on a ground of its own).
  The heading's tag is `headingLevel` (`h2`, `h3` default, `h4`), its size the `variant` (`default`,
  `compact`, `featured`, which is size and nothing else); a `stat` body draws the label as that heading and
  the figure beneath it. `textAlign` is `start`, `center` or `end`. `linkTarget` makes the whole card the
  link -- one anchor, the heading's, reaching over the box -- and `actionLinkTarget` with `actionLabel` adds
  a button that stands above it, never a link inside a link. `hoverEffect` (`none`, `lift`, `zoom`) answers
  only on a card that is a link, only under a hovering pointer or keyboard focus, and not for a reader who
  asked for less motion; a further effect is an entry in `PHI_CARD_HOVER_EFFECTS` and a rule in
  `styles/layout.css`. Asset sources persist `assetId` and `variantKey`; only `url` sources persist
  `sourceUrl`, shown plainly with a placeholder.
- The Video Widget (`video-embed`, owned by the Video Module) stores `providerKey` and `videoId`, chosen
  from the video providers the Area carries -- the way the Image Widget stores an `assetId` rather than a
  URL. Never a pasted address: a share link carries a playlist, a timestamp, a `si=` and sometimes a
  comment id belonging to whoever copied it, and all of it would be published with the page. A whole link
  typed into the id field is still read; only the id is kept. `params` adds the provider's own playback
  parameters (`start=90`, `h=<hash>`) and cannot touch the ones the provider always sends, so `dnt=1` is
  not configurable away. Until a visitor presses the button, nothing leaves this origin -- not the player
  and not a thumbnail, which is why the poster is an Asset from this Site's Media library and never the
  provider's still. The placeholder names the company that will receive the request and links to their
  privacy notice. Two controls stand there, labelled apart: **Load video** presses once and stores nothing, so
  that answer lasts the view; **Load videos for this visit** stores a plain yes per provider in
  `sessionStorage` ([phi-video-consent-store.ts](../runtime/phi-video-consent-store.ts)) and every
  placeholder for that provider on the page opens with it. Nothing is preselected, neither does more than
  its label says, and the visit-long answer carries its own way back beside the player it opened -- the
  withdrawal it owes. Because the Server cannot read session storage, an already-unlocked player appears one
  render after the placeholder rather than instead of it. A provider whose
  Module is switched off stays in the configuration and renders nothing, and the Builder says which of
  those cases it is. The reasoning is in [design/CONSENT.md](../../design/CONSENT.md), and contributing a
  provider is [THIRD_PARTY_MODULES.md](../../THIRD_PARTY_MODULES.md) §12.
- The Button Widget is a command, a way somewhere, or both. `href` renders a real anchor, which works
  before hydration and on middle click. A wired `navigate` capability sends `{ path }` to the Core Runtime
  Controller instead, for a Button that cannot be an anchor. A Button with `href` and no wiring is a plain
  link.
- Backgrounds use the structured background config edited by `PhiBackgroundControl`. A pattern overlay
  persists a namespaced `patternKey` (`@phis/ui/modules/core/background-patterns/stripes`, `grid`,
  `dots`, `checker`, `crosshatch`) plus provider-owned `values`, and an `overlay.ink` color or gradient.
  Noise is a separate grain preset (`fine`, `medium`, `coarse`). An unavailable pattern key stays
  persisted and renders nothing. Image motion (`static`, `fixed`, `parallax`) is described in
  [LAYOUTING.md](../../LAYOUTING.md#background-motion), the Background `filter` (`glass`, `haze`, `blur`)
  in [LAYOUTING.md](../../LAYOUTING.md#background-filter). Darkening or tinting is a `color` Overlay at an
  opacity, never a filter.

## Data Widgets

- Tables: [TABLES.md](../../TABLES.md). Trees: [TREES.md](../../TREES.md). Collections:
  [COLLECTIONS.md](../../COLLECTIONS.md). Forms: [FORMS.md](../../FORMS.md). Each has one generic Widget;
  domain wrappers that only fix a Provider, Form id, labels, or routes are forbidden.
- `PhiMediaPickerControl` is the controlled media selection surface; `PhiMediaPickerWidget` adds CMS
  identity, config, Provider binding, and signals. Forms, Inspector sections, and toolbars use the
  Control.
- Remote reads and caching follow [gateway/CACHES.md](../../gateway/CACHES.md).
