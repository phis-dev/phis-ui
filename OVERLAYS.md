# Overlay contract

This document defines the v1 contract for CMS Modal and Drawer overlays.

## Core model

An Overlay is a persisted Area- or Page-owned container outside normal Region and Layout-slot flow.
Core owns the generic `modal` and `drawer` container implementations. A Module may contribute concrete
Overlay instances through its Area or Page presets, but Module ownership is not a third mount scope:
the containing Area or Page revision owns the instance lifecycle, signal scope, and persistence.
Optional Module contributions to an Area use the single server-safe `areaOverlays` descriptor family.
Core composes only descriptors owned by active, Area-eligible Modules; a disabled or replaced Module
therefore contributes no hidden Overlay subtree. `areaShells`, route presets, imperative hosts, and
Region occupancy are not alternative optional-Overlay contribution paths.

Every resolved CMS tree contains an `overlays` collection. Several Overlays may exist in one tree. Each
Overlay has one canonical CMS instance id and owns three named structural zones:

- an optional Header Layout through `headerLayoutNodeId`;
- one required Body Layout through `bodyLayoutNodeId`; and
- one discriminated Footer presentation `none | actions | custom`.

`none` requires `footerLayoutNodeId: null`. Both `actions` and `custom` require one explicit
`footerLayoutNodeId`. An `actions` Footer uses the canonical `overlay-actions` Flex creation preset;
a `custom` Footer may use any compatible explicit Layout topology. There is no Footer Widget root id,
Widget-parent exception, hidden action container, or synthesized Layout.

Every declared zone references exactly one top-level Layout. The complete Overlay subtree uses the normal
Layout, slot, Widget, Provider, access, and signal contracts. Every referenced Layout must be declared
explicitly by its preset or persisted Draft; runtime must not synthesize a Layout, create a private slot,
or assume a topology. A root Layout is claimed by exactly one Overlay zone or Region branch and must not
be shared between zones, between Overlays, or between normal document flow and an Overlay.

An Overlay is not:

- a Widget that occupies a normal Layout slot;
- a Layout family or a hidden Layout child;
- a shell or page Region type;
- a Controller or a Module activation boundary.

## Identity and ownership

- Overlay, Layout, and Widget instance ids share the canonical `PhiCmsInstanceId` namespace.
- Overlay signal addresses use `cms:<instanceId>`; no new signal address family is introduced.
- An Overlay in an Area tree is Area-owned and uses Area signal scope.
- An Overlay in a Page tree is Page-owned and uses Page signal scope.
- Code-owned ids retain their Module and preset origin through the canonical preset-id factory.
- Removing or disabling a Module removes only the Overlay instances contributed by that Module's
  active preset or revision source; it does not change Core Overlay availability.

## Structure

The canonical tree shape is:

```text
Area or Page tree
├── regions[]
├── overlays[]
│   ├── headerLayoutNodeId? -> one top-level Layout
│   ├── bodyLayoutNodeId -> one top-level Layout
│   ├── footerPresentation -> none | actions | custom
│   └── footerLayoutNodeId -> null for none, one top-level Layout otherwise
├── layoutNodes[]
└── contentWidgets[]
```

Each zone Layout may be `flex-vertical`, `flex-horizontal`, `stack`, `content`, `collapsible`, or any other
active compatible Layout. A preset chooses every topology explicitly; the Overlay runtime does not
synthesize a default vertical Flex or any other Layout. Closed Overlays do not reserve a Region or Layout
slot in the normal document flow.

When a Collapsible Layout is a zone root, its slot order, slot titles, open state, and panel presentation
remain Layout config. A child Widget label is not a fallback source for a slot title. Moving, replacing,
or deleting a child does not move, rewrite, or delete the title stored for either source or target slot.
An empty slot is omitted from live Collapsible rendering while its title config remains available for a
later child. Authoring must expose title editing explicitly instead of coupling it to child DnD.

`title` remains available as static Overlay chrome. An optional Header Layout supplies authored title
content in the same fixed header zone, for example a dynamic node Tag/name, `PhiTabBarWidget`,
`PhiSegmentedWidget`, status, or command toolbar. A Modal Header Layout owns the complete semantic Header
plane. Static title and close button are chrome layers above that plane and consume no Layout track or
inline space. A one-slot Flex Header Layout may therefore center its child against the complete Modal
width. Core defines only the Header minimum block size and does not add collision handling between the
authored Header content, title, and close button; the owning preset is responsible for a valid
composition. The static `title` may be null when the Header Layout itself supplies the complete visible
heading.
At least one of static title or Header title content must provide an accessible name. The required Body
Layout is the only viewport-constrained scrolling zone. A declared Footer Layout owns all authored
footer content, including action Buttons or Command Toolbars. Ant Design default action buttons and
Drawer-only `extra` content are renderer details and must not form separate persisted paths.

The canonical `actions` Footer is an ordinary explicit Flex Layout with end alignment, vertical centering,
responsive wrapping, `xs` gap, `xs` block padding, `base` inline padding, full width, transparent
background, and no border. These values come from one Core creation preset so later Theme resolution can
replace the standard presentation without changing Overlay topology. The Theme never creates business
buttons, routes, commands, or Controller behavior. A preset normally places one labeled, non-compact,
medium `PhiCommandToolbarWidget` in the first slot, but may use further normal slots for Buttons or
additional Toolbars. A non-compact `PhiToolbarControl` uses `xs` gap between its controls.

The former generic `footerActions` list is not part of the v1 Overlay contract. Actions are normal Phi
Widgets in the Footer Layout and use their declared signal routes. A Form rendered anywhere in an Overlay
remains an ordinary inline `PhiFormWidget`; Forms must not open a private Modal or Drawer, inject their
actions into Overlay chrome, render a private submit/reset row, or discover Overlay ancestry. A footer
Button may signal a Controller, which forwards the standard submit or reset input to a concrete Form and
closes the Overlay only after the correlated successful result. Escape is discard after any inner popup or
cell editor has declined to consume it; Form validation never turns Escape into submit.

Several related footer actions should use one `PhiCommandToolbarWidget` inside the authored Footer
Layout. The canonical action Footer does not require a Toolbar and does not interpret its children.
Stable button keys provide stable signal subcontrol addresses; generic subcontrol state includes
enabled, visibility, loading, badge, icon, and label. The Overlay must not synthesize a hidden action row
or domain-specific loading state.

One Overlay workflow may place one Form Widget in each slot of a `mountPolicy: "keep"` Stack. A single
footer command may then ask the owning Controller to submit all concrete Forms with one correlation id.
The Controller commits only after every Form has validated successfully, merges their form payloads into
the workflow payload, and closes the Overlay once. The Overlay and Stack never interpret or merge Form
values themselves.

## Presentation config

Common serializable config may express:

- `title`;
- `closable`, `keyboard`, and semantic `mountPolicy`;
- one shared declarative mask config with `appearance: "transparent" | "normal" | "blurred"`,
  `allowOutsideInteraction`, and `closable`; visual presentation, outside interaction, and dismissal are
  independent semantic axes shared by Modal and Drawer;
- shared size bounds, background, border, shadow, and semantic effect;
- Modal-specific centering and canonical `controlSize`;
- Drawer-specific placement, size, maximum size, resizing, and nested push behavior;
- persisted signal routes.

The two `closable` fields have separate, non-overlapping meanings:

- top-level Overlay `closable` controls only whether the Header chrome renders its close button;
- `mask.closable` controls only whether an outside pointer action requests dismissal; and
- `keyboard` independently controls whether Escape requests dismissal.

Setting top-level `closable: false` does not disable mask or Escape dismissal. An Overlay that may close
only through an authoritative Controller/signal uses top-level `closable: false`, `keyboard: false`, and
`mask.closable: false`. Its `allowOutsideInteraction` value still independently determines whether an
outside pointer action is captured or reaches the background.

`closeMode` is `immediate` by default and is suitable only when closing cannot abandon or commit pending
transactional state. With `request`, user dismissal keeps the Overlay open and emits one typed,
business-neutral `closeRequest` value containing only its source:

```ts
type PhiOverlayCloseRequest = {
  source: "close-button" | "mask" | "escape";
};
```

The `closeRequest` output capability uses `valueType: "json"` and the shared
`PHI_SIGNAL_VALUE_SCHEMAS.overlayCloseRequest` schema. Its persisted route chooses scope, channel, and
receiver through the normal signal contract.

Close-button, closable-mask, and Escape requests carry source `close-button`, `mask`, or `escape` and never
imply submit or acceptance. The owning Controller resets or rolls back transactional state before sending
the authoritative Overlay `close` input. Save/Apply is an explicit Footer Widget command: the Controller
forwards it to one or more concrete Forms, waits for their correlated successful results, commits its
domain Draft, and then sends `close`. A validation or commit failure keeps the Overlay open. Programmatic
`close` is authoritative and does not generate another request. All signals caused by the interaction
retain its correlation id through the complete workflow.

### Padding ownership

Every Modal and Drawer zone has exactly one padding owner: its selected root Layout. Header, Body, and a
declared Footer receive their complete semantic zone rectangles, and both Controls normalize the UI
adapter's container and zone padding to zero. Static title and close-button offsets are overlaid chrome
placement and do not inset or shrink the Header Layout. Renderer wrappers, domain components, and the
Overlay runtime must not add another implicit content padding.

Header, Body, and custom Footer Layouts retain the neutral Layout default of no padding and presets opt
into Layout padding independently. An actions Footer receives its canonical padding only from the
explicit `overlay-actions` root Layout. A missing Header or `none` Footer does not cause fallback padding.
Changing Overlay type, placement, mount policy, or ownership must not change this behavior. The earlier
Drawer container-padding fields and adapter-owned Header padding are migration input and are not a second
v1 padding path.

### Shared container chrome

Overlay presentation does not define a separate visual contract. Modal and Drawer use the shared Region
chrome fields `background`, `backgroundConfig`, `border`, `shadow`, and `effect`. Overlay container config
does not own content padding; zone Layouts are the sole padding owners. Shared fields use the same closed
values, structured configs, token resolution, and Core style resolvers; UI-library-specific visual config
must not be persisted.

Core applies the resolved chrome to the complete visible Overlay container (`container` for Modal and
`section` for Drawer), while its header, body, and footer semantic layers remain transparent so they do
not cover the container background. Every zone Layout may still declare independent background, border,
shadow, effect, and padding through ordinary Layout config.

An omitted container background keeps the active Ant Design theme default. An explicit shared
`backgroundConfig` with `base.kind: "none"`, or the shared CSS background value `transparent`, makes the
Overlay container transparent; this is distinct from omission and must not fall back to the theme surface
color. Solid colors including alpha, gradients, images, borders, standard/custom shadows, and semantic
effects follow the existing shared Region-compatible resolvers. The mask remains independently configured
and does not become transparent merely because the Overlay container is transparent.

`mountPolicy` is one of:

- `on-open` (default): mount all declared zone subtrees when opening and unmount them after closing;
- `keep-alive`: mount all declared zone subtrees on first open and retain them while subsequently closed;
- `eager`: mount all declared zone subtrees after hydration, before the first open; this is reserved for
  workflows that explicitly require closed signal consumers.

Transient `open`, `hasOpened`, loading, pending, focus, and resize-interaction state is never persisted. Callback
functions, portals, raw Ant Design render callbacks, raw semantic-DOM styles/class names, `forceRender`,
and arbitrary z-index values are renderer concerns and are not CMS config. Standard visual values resolve
through Ant Design tokens and the global Phi effect/shadow contracts.

Modal uses the shared `PhiControlSize` vocabulary through `controlSize`: `small`, `medium`, or `large`.
Core maps those values to globally defined Modal widths and always clamps the result to the available
viewport with one `base` spacing token on both inline sides, including below Ant Design's small-screen
breakpoint. Presets do not persist Ant Design breakpoint names or reproduce responsive Modal sizing
through Body Layout widths. Existing scalar or responsive `width` values are migration input for Modal
presets that have not yet received their explicit contract pass, not a second v1 sizing path.

Every Modal exposes the generic `controlSize` listen capability. A connected listen route uses `action: "change"`,
`valueType: "string"`, and accepts only the existing `PhiControlSize` values `small`, `medium`, or
`large`. A valid signal changes only the mounted Modal's transient presentation; it does not mutate the
persisted Overlay config or admit arbitrary pixel widths. The route chooses its normal signal channel,
scope, and concrete Overlay receiver. Drawer sizing remains on the separate Drawer size contract.

Every Modal also exposes the existing generic `size` listen capability. A connected listen route uses
`action: "change"` and `valueType: "size"`. Its canonical value is the shared `PhiRenderableBlockSize` shape
`{ width?, height? }`; normal Phi length parsing and non-negative-value validation apply. The runtime
`width` overrides the current config or `controlSize` width, while `height` sizes the viewport-capped
Modal container and leaves overflow with the Body scroll area. A later valid `controlSize` input clears
only an active runtime width override and preserves an independent runtime height. Neither receiver
persists its transient value.

Every Modal and Drawer exposes the generic `title` listen capability. A connected listen route uses
`action: "change"` and `valueType: "string"`. A valid signal replaces only the mounted Overlay's transient
title; it does not mutate the persisted Overlay config. An empty string hides the visible title, while the
authored title remains the fallback after the Overlay config changes or the instance remounts. Controllers
may use this capability when one Overlay and one Body workflow serve several presentation modes, but the
signal must not select a different Form, Layout tree, submit path, or business operation implicitly.

Intrinsic Modal block-size changes animate in the Core Control with the active Ant Design motion tokens,
including changes caused by authored Header, Body, Footer, Stack, or Form content. The animation never
becomes persisted state, never replaces intrinsic measurement, respects reduced-motion preference, and
retains the viewport cap plus the Body-owned scroll area.

Modal and Drawer containers are intrinsically sized until they reach the available browser block size.
They must never grow the document beyond that viewport bound. Header and Footer remain fixed Overlay
zones; Body is a flex item with `min-block-size: 0` and owns the internal block-axis scroll area. A zone
Layout does not become a second scroll owner merely because it is mounted in an Overlay. Modal and Drawer
use the same logical behavior even when Ant Design exposes different semantic DOM nodes for them.

### Mask behavior

Modal and Drawer use exactly one mask contract. `appearance` controls presentation only:

- `transparent` renders no visible backdrop while retaining the configured outside-interaction barrier;
- `normal` renders the globally themed normal backdrop; and
- `blurred` renders that backdrop with the globally themed blur treatment.

Presets never persist backdrop colors, blur radii, Ant Design mask props, or representation-specific mask
config. Theme/Core owns those values and both Overlay Controls use one shared adapter resolver.

`allowOutsideInteraction` controls whether pointer input may reach content behind the Overlay.
`closable` controls whether an outside pointer action requests dismissal. Their required behavior is:

| Outside interaction | Closable | Result |
| --- | --- | --- |
| `false` | `false` | capture the event and keep the Overlay open |
| `false` | `true` | capture the event and request close |
| `true` | `false` | allow the event to reach the background |
| `true` | `true` | capture this closing event, request close, and allow later events after close |

A closable outside action is always intercepted so the Overlay can close; the same pointer action must
not also activate Canvas, navigation, or another control underneath it. The effective capture rule is
`!allowOutsideInteraction || closable`. This derived runtime rule is not another persisted field.

Close behavior continues through `closeMode`: an immediate Overlay closes directly, while a request-mode
Overlay emits its normal correlated `closeRequest`. Mask configuration never bypasses that transaction.

Core derives Ant Design's current `destroyOnHidden` and `forceRender` behavior from `mountPolicy`; neither
Ant Design field is persisted directly. Modal and Drawer use the structured `mask` API. Deprecated
`destroyOnClose`, `destroyInactivePanel`, and `maskClosable` compatibility fields are not part of v1.
Focus trapping, focus restoration, scroll locking, and portal ownership default to accessible Core
behavior and are not disabled by ordinary presets.

## Runtime and signaling

Overlay open state is transient Client state. Generic Overlay inputs use the existing signal action
vocabulary for `open`, `close`, and `toggle`; open-state feedback uses an explicitly configured route.
The Overlay matches only its persisted listen routes and concrete `cms:<instanceId>` receiver.

Business payloads remain owned by a Widget, Provider, or Controller. A generic Overlay must not parse a
Table row identity, Form payload, User id, or domain command. With the default `on-open` policy, an active
Widget, Provider, or Controller outside the closed Overlay addresses the zone Widget directly and sends a
separate generic open command to the Overlay. A Widget inside an initially unmounted Overlay must not be
required to open its own Overlay, and must not read the selection out of a Module store -- see the Widget
contract in `MODULES.md`.

Signal delivery into a zone that has not mounted yet is guaranteed for every mount policy. An addressed
signal whose receiver is absent is held by the bus and delivered once that address becomes usable, which
is registration plus a listener. The write and publish paths refuse a route whose receiver is not in the
revision, so an absent receiver is a promise not yet kept rather than a wrong address. What is still
waiting when the partition goes away is discarded without complaint: a never-opened Overlay is ordinary
operation, and only a development build traces it.

Mount policy therefore remains a rendering decision -- what exists in the DOM and what survives a close --
and is no longer a delivery decision.

Runtime, preview, and future authoring must resolve the same Overlay config and all declared zone trees.
Provider demand, Widget/Controller materialization, access filtering, signal-route validation, and
media/reference scans must include every reachable Overlay subtree exactly like reachable Region subtrees.

## Core React containers

`PhiModalControl` and `PhiDrawerControl` are the provider-free Core presentation adapters over Ant Design.
They own portal behavior, focus, viewport bounds, the fixed Header/Footer and scrolling Body semantics,
semantic DOM styles, and user-dismiss reason reporting. They receive already rendered title, Header, Body,
and Footer content and do not own CMS identity, revisions, Layout ids, Providers, Controllers, or signal
routes.

`PhiModal` and `PhiDrawer` are the Core CMS renderers for resolved Overlay nodes. They adapt serializable
Phi config to the Controls, resolve the optional Header and Footer Layouts plus required Body Layout, and
map Control interaction reasons into the Overlay signal contract. Modal and Drawer share this logical
composition; Ant Design `title`, Drawer `extra`, and their differing semantic DOM nodes are private adapter
details. Domain components render ordinary Widget or Control content only and must not wrap themselves in
Ant Design Modal or Drawer components.

Imperative confirmation dialogs used for one application transaction are not CMS Overlays. Builder-only
workspace prompts may use shared Core React wrappers but do not become persisted Overlay instances unless
their content is intentionally represented in an Area or Page preset.

## Builder Inspector Overlay baseline

The Builder Region, Layout, and Widget Inspectors are persistent workspace composition, not transient
prompts. They use three separate Area-owned Drawer Overlay instances contributed by the Builder Module:

- the Region Inspector Drawer;
- the Layout Inspector Drawer; and
- the Widget Inspector Drawer.

Area ownership is required because the same Inspector set serves both `/builder/shells` and
`/builder/pages` and follows the Builder Area Controller lifecycle. Page presets must not duplicate the
instances. The Inspector content must consume current Area Controller/workspace state and must not retain
a Page-render snapshot that becomes stale when navigation changes the active Builder workspace.

Every Inspector Drawer has exactly one direct Body root, an explicitly declared n-slot
`PhiCollapsibleLayout` specialized by its preset content. A shared Stack root, a dynamically substituted
root Layout, three nested Collapsible Layouts, an imperative Collapsible host, and a normal hidden Drawer
Region are all forbidden alternative paths. The Builder Controller opens exactly the Drawer matching the
selected `region`, `layout`, or `widget` kind and closes the other two through ordinary Area-scoped Overlay
routes.

The Builder Area runtime mounts the normal resolved `overlays[]` collection independently of Region
occupancy. It must not require a `drawer_right` Region, a host Layout, a `builder-workspace-host` Widget,
or a private `PhiDrawerControl` to keep Overlay receivers alive. Overlay receiver registration and the
selected mount policy determine when the declared zone subtree exists. The Builder Controller owns
workspace selection, opens and closes the three Inspector Overlay addresses, and coordinates Effects and
other Builder workflows; that orchestration is not a CMS Widget responsibility.

The Region/Layout/Widget section nodes remain ordinary Builder-Module Widgets in their declared
Collapsible slots. They may share internal server label/provider preparation and Client hooks, but they
must not render through a workspace-host Widget, mount another Drawer, or receive a host-owned render
callback. Removing the transitional host removes its CMS definition, runtime/preview/authoring loader,
synthetic Region/Layout/Widget ids, preset nodes, and private workspace Drawer/Pages/Signal-Wiring render
branch together. It does not remove the three Inspector Overlay nodes, their Header/Body Layouts, their
section Widgets, or the Builder Controller state that those Widgets consume.

Each Collapsible slot contains a normal Builder-Module Widget. Presentation-only editors such as
background, border, shadow, padding, geometry, viewport, and placement are Phi Controls composed by their
Builder Widget counterparts; a Control is never inserted directly as a CMS node. The Builder Widgets own
only CMS identity, presentation config, and declared Controller signal adaptation. The selected node and
its editable Draft remain Controller/workspace state.

Inspector section Widgets use the existing `fill-inline` slot-size policy so every section occupies the
complete Collapsible panel width. Inner Controls may use their own semantic label/control composition but
must not determine the width of the CMS Widget frame through intrinsic sizing. On the first mount only
`slot_0` is open: this is Settings for Layout and Widget Inspectors and Geometry for the Region Inspector.
Subsequent open/close state remains transient Collapsible state for the keep-alive Drawer lifecycle.

The code-owned Builder preset uses the shared `glass` effect for these Drawers. Mask behavior remains
explicit ordinary Overlay config and is not derived from Inspector ownership or effect. Header, Body, and
Footer Layout chrome remains transparent unless a preset explicitly chooses another visible surface.
The selected zone root Layout is the sole content-padding owner, and the Overlay Body remains the only
block-axis scroll owner.

The three Builder Inspector Drawers use a transparent, outside-blocking, closable mask. A pointer action
on the visible Canvas is therefore consumed by the mask and closes the Inspector without selecting or
activating the Canvas underneath it. Their Collapsible Body roots use `sm` outer Layout padding and `sm`
inner panel padding; neither value comes from Drawer adapter padding. Their Header Flex roots use `lg`
inline-start padding and retain the complete Header zone width. The absolute close-button offset remains
independent Drawer chrome.

## Picker boundary

`Picker` describes an immediate selection workflow anchored to one visible trigger. It is neither an
Overlay nor a structural CMS node type merely because its selection surface is displayed above the
current page. The Builder Widget/Layout Picker, for example, is anchored to the invoking empty Slot or
Region affordance.

A Picker is rendered exclusively by its canonical `Phi*Control`. A simple Picker Control may privately
adapt the current UI library's native picker primitive; a compound Picker Control may compose
`PhiPopoverControl` and other Phi Controls. Consumers, Bindings, Widgets, Forms, Controllers, and persisted
config must not depend on the underlying UI library's component, props, placement enum, events, or value
types. Picker placement is the Phi-semantic choice of an explicit supported popup position or automatic;
the canonical Phi Control privately maps it to the active UI adapter. A Picker must not switch to Modal or
Drawer presentation, create an entry in `overlays[]`, declare named Layout roots, acquire Overlay
ownership, or privately mount an Overlay instance. Large Picker content remains an anchored popup with
viewport-constrained dimensions and internal scrolling.

`PhiPopoverControl` is the sole outer-padding owner for compound anchored popup surfaces. Its declarative
`padding` accepts the existing Phi spacing keys from `xxs` through `xl` and defaults to `sm`; it maps that
value to the active UI adapter's popup container. The adapter must suppress native title/content padding,
including padding introduced by wireframe presentation, so it cannot accumulate with the Phi value.
Picker content must not add another outer-padding layer or compensate for adapter padding with width
calculations. Internal gaps remain presentation owned by the Picker content and are not popup padding.

A Picker has no close button, header-close action, mask contract, Footer, Save, Apply, or Cancel action.
Opening captures the original value as the rollback snapshot. Every value change is propagated
immediately to the owning Binding, Widget, or Controller and may update live presentation. A normal popup
dismissal commits the last propagated value and closes one Undo/Redo transaction. This includes outside
click, trigger toggle, and an automatically closing terminal single selection. Escape is the sole discard
path: it restores the opening snapshot, closes without persistence, and creates no Undo/Redo entry. When
the empty, inherited, or original value is a valid selection, the Picker exposes an explicit Clear action;
Clear is an immediate value change and not a dismissal or cancellation action.

Picker presentation follows the normal Control/Binding/Widget split. A domain Control such as
`PhiMediaPickerControl` composes only Phi Controls and owns the immediate popup lifecycle. Its Binding owns
Provider resolution and transient query, loading, filtering, pagination, and selection state. A placeable
CMS `PhiMediaPickerWidget` adds CMS identity, persisted config, labels, and signal adaptation around the
Binding and Control. Another Widget, Form, Inspector Widget, or toolbar consumes the Control and, where
Provider access is required, its Binding; it must not nest the placeable CMS Widget or inject the Picker
through a host-owned render callback.

The Picker result is communicated through the normal Control, Binding, Provider, Controller, and signal
contracts. A spatial or multi-action editor rendered in a Modal, such as Focal Rectangle editing, is a
Modal Editor and not a Picker. Likewise, any selection workflow that requires explicit Footer actions is
a Modal or Drawer workflow rather than a Picker.

A domain trigger for a Modal Editor is a normal canonical Phi Control, usually `PhiButtonControl`; it
must not privately mount or own the Modal. The owning Area or Page declares the Overlay and its named
roots. Domain content is a Module-owned Widget placed in the Body root, while declarative commands are a
normal Command Toolbar in the Footer root. For the Asset Focal Rectangle Editor, the Page-owned Modal is
mounted `on-open`, its Body is a Content Layout providing zero padding and the secondary background,
and its Asset-owned spatial-editor Widget is projected only into the Builder runtime Client manifest.
Apply emits the controlled Form-field value and then closes with the originating correlation; Cancel or
Escape discards the local draft. The opening Preview action is therefore a `PhiButtonControl`, not a
specialized focal-rectangle Control.

## Authoring boundary

Full Builder authoring is deferred. Its target behavior is:

- list Area- and Page-owned Overlays separately from Regions;
- force the selected Overlay open in editor mode without persisting `open`;
- edit Overlay config through a generic Overlay Inspector;
- expose Header, Body, and Footer as named zones and edit every declared root and descendant through the
  normal Layout/Widget canvas;
- include Overlay create/delete, named-root assignment, DnD, history, preview, and publish validation;
- permit Region/Overlay subtree moves only inside the same Area or Page ownership scope.

Until that work lands, code-owned and persisted presets may declare complete Overlay instances and explicit
named zone Layouts, and runtime/preview render them through the canonical path. No preset-local Modal/Drawer
renderer is allowed.

## Contract governance

Any change, extension, replacement, reinterpretation, or widening of this contract requires explicit
prior operator approval after the exact contract gap and affected ABI have been presented. Analysis,
implementation work in an adjacent domain, or approval of another contract does not grant that approval.
The contract must not be bypassed through a parallel, shadow, local, Module-specific, Provider-specific,
or compatibility contract. When this contract cannot express a requirement, implementation stops and
asks the operator before types, fields, values, render paths, or fallbacks are introduced.
