# Overlay contract

This document defines the contract for CMS Modal and Drawer overlays. The generic signal contract
(addresses, scopes, routes, correlation, delivery to unmounted receivers) is in
[SIGNALS.md](./SIGNALS.md). The Builder's own Inspector, Effects, and Signal wiring Overlays are described
in [BUILDER.md](./BUILDER.md#11-inspector-contract).

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
buttons, routes, commands, or Controller behavior. A preset normally places one labeled, medium
`PhiCommandToolbarWidget` in the first slot, but may use further normal slots for Buttons or additional
Toolbars. A non-compact `PhiToolbarControl` uses `xs` gap between its controls.

A footer's own commands are a compact group. Cancel and Save are the two ends of a single decision, and a
gap between them reads as two unrelated offers; wrapping follows from that and is not stated, because a
compact group does not wrap. A Toolbar that carries unrelated actions is the case for a non-compact one.

There is no generic Overlay actions list. Actions are normal Phi
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

One Overlay workflow may place one Form Widget in each slot of a `mountPolicy: "eager"` Stack, so every
Form is mounted before the first submit. A single
footer command may then ask the owning Controller to submit all concrete Forms with one correlation id.
The Controller commits only after every Form has validated successfully, merges their form payloads into
the workflow payload, and closes the Overlay once. The Overlay and Stack never interpret or merge Form
values themselves.

## Presentation config

Common serializable config may express:

- `title`;
- semantic `mountPolicy`;
- `flags`: the Overlay's yes-or-no answers as `PhiCmsFlags` bits. A stored config states such an answer
  as a bit, never as a boolean field, and each bit names the departure from the plain Overlay, so an
  unset flag set is every default at once: `NoCloseButton`, `NoEscapeClose`, `Centered`, `Resizable`,
  `Push`, `MaskPassesPointer`, `MaskKeepsOpen`;
- one shared declarative mask config with `appearance: "transparent" | "normal" | "blurred"`; whether the
  mask stops the pointer and whether a click on it dismisses are the two mask flags, so visual
  presentation, outside interaction, and dismissal stay independent semantic axes shared by Modal and
  Drawer;
- shared size bounds and a Surface (background with its filter, border, shadow);
- Modal-specific centering (`Centered`) and canonical `controlSize`;
- Drawer-specific placement, size, maximum size, resizing (`Resizable`), and nested push behavior
  (`Push`, with `pushDistance` stating how far);
- persisted signal routes.

`resolvePhiCmsOverlayBehaviour` (types/cms-overlay.ts) reads the flags into the words the Controls take:
`closable`, `keyboard`, `centered`, `resizable`, `push`, and a `PhiOverlayMaskBehaviour`. The Controls
are the only place those booleans exist; nothing stores them.

The three dismissal flags have separate, non-overlapping meanings:

- `NoCloseButton` controls only whether the Header chrome renders its close button;
- `MaskKeepsOpen` controls only whether an outside pointer action requests dismissal; and
- `NoEscapeClose` independently controls whether Escape requests dismissal.

Setting `NoCloseButton` does not disable mask or Escape dismissal. An Overlay that may close only through
an authoritative Controller/signal sets all three. `MaskPassesPointer` still independently determines
whether an outside pointer action is captured or reaches the background.

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
Changing Overlay type, placement, mount policy, or ownership must not change this behavior.

### Shared container chrome

Overlay presentation does not define a separate visual contract. Modal and Drawer carry a `surface`, the
shape every Region, Layout and Widget carries (LAYOUTING.md, "Surface"). Overlay container config does not
own content padding; zone Layouts are the sole padding owners. Shared fields use the same closed
values, structured configs, token resolution, and Core style resolvers; UI-library-specific visual config
must not be persisted.

Core applies the resolved chrome to the complete visible Overlay container (`container` for Modal and
`section` for Drawer), while its header, body, and footer semantic layers remain transparent so they do
not cover the container background. Every zone Layout may still declare an independent Surface and padding
through ordinary Layout config.

An omitted Surface Background keeps the active theme default. A Surface Background whose `base.kind` is
`none`, or a colour Base of `transparent`, makes the Overlay container transparent; this is distinct from
omission and must not fall back to the theme surface color. A glass `filter` over a `none` Base frosts with
the elevated surface as its tint. The container is the Drawer or Modal primitive's own box and has no ground
layer, so a `blur` filter or a moving picture paints unsoftened and still (`resolvePhiCmsContainerSurface`). The mask remains independently configured
and does not become transparent merely because the Overlay container is transparent.

`mountPolicy` uses the shared CMS mount-policy vocabulary (`types/cms-mount-policy.ts`), which Stack
Layouts and the Gallery Widget use as well. For an Overlay the window is "open":

- `remount` (default, `types/cms-overlay.ts`): mount all declared zone subtrees when opening and unmount
  them after closing;
- `lazy-keep`: mount all declared zone subtrees on first open and retain them while subsequently closed;
- `eager`: mount all declared zone subtrees from the start, before the first open.

A stored value outside these three is a read error, not a fallback.

The policy also decides what the page carries. An Area Overlay that is not `eager` ships without its
zones: the page holds only its configuration, and the container asks the Site's Server Action for the
zones the first time it opens (`types/cms-overlay-zones.ts`, `next/overlay-zones.tsx`). The action renders
the same Area again for the viewer the request carries, runs the Area's access guard, and answers only
for an Overlay that viewer's tree contains. The shell opens at once and shows a placeholder until the
zones arrive; zones are kept for the address they were rendered at, so a client navigation asks again on
the next open. A failed request, or an answer that this viewer has no such Overlay here, leaves the shell
open with the failure in its body and logs it; closing the shell forgets the failure, so the next open
asks again. Closing it by itself was the earlier answer, and it left a click that did nothing.

The Controllers go with the zones. The Area leaves out what the Widgets of a deferred Overlay ask for
(`excludedOverlayIds` in `materializePhiRuntimeControllerSettings`, decided by the same
`isPhiCmsOverlayDeferredWhenClosed` the renderer uses), and the action mounts them with the zones
(`materializePhiOverlayRuntimeControllerSettings`), at `area` scope and at the addresses the page would
have used. The container renders them beside the shell, not inside it, and keeps them once they have
arrived, so a `remount` policy does not take a Controller's state with the body. What was sent to one of
them before it arrived waits on the bus and reaches it when it mounts: the Account Widget's `command open`
reaches the Auth Controller that way, and the Auth Controller's `values` the login Form's Controller.

The reason is the first load. Rendered with the page, a closed Overlay's zones put every Client
implementation inside them -- a sign-in Form, its Controls, the validation library -- into every page of
the Area for the few visitors who open it. An `eager` Overlay keeps rendering with the page, because its
policy is that the content exists before the first open. Overlays a Page tree declares still render with
the page for now; only the Area Boundary hands the renderer the origin a request needs.

Transient `open`, `hasOpened`, loading, pending, focus, and resize-interaction state is never persisted. Callback
functions, portals, raw Ant Design render callbacks, raw semantic-DOM styles/class names, `forceRender`,
and arbitrary z-index values are renderer concerns and are not CMS config. Standard visual values resolve
through Ant Design tokens and the global Phi effect/shadow contracts.

Modal uses the shared `PhiControlSize` vocabulary through `controlSize`: `small`, `medium`, or `large`.
Core maps those values to globally defined Modal widths and always clamps the result to the available
viewport with one `base` spacing token on both inline sides, including below Ant Design's small-screen
breakpoint. Presets do not persist Ant Design breakpoint names or reproduce responsive Modal sizing
through Body Layout widths.

A Modal `width` is one length or a responsive value `{ compact?, medium?, wide? }`. The modes come off
the container scale, not Ant Design's device breakpoints: `medium` from 377px and `wide` from 610px of
available viewport width (`PHI_MODAL_RESPONSIVE_MIN_WIDTH`, the same pair the Form switches at). Any
subset may be stated; an unset mode cascades from the nearest smaller one that is set, and a mode below
every stated one takes the `controlSize` width (or the Modal default when there is none). A runtime
`size.width` overrides it at every mode.

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

`MaskPassesPointer` controls whether pointer input may reach content behind the Overlay (the Control's
`allowOutsideInteraction`). `MaskKeepsOpen` controls whether an outside pointer action requests dismissal
(the Control's mask `closable`, inverted). Their required behavior is:

| Outside interaction | Closable | Result |
| --- | --- | --- |
| `false` | `false` | capture the event and keep the Overlay open |
| `false` | `true` | capture the event and request close |
| `true` | `false` | allow the event to reach the background |
| `true` | `true` | capture this closing event, request close, and allow later events after close |

A closable outside action is always intercepted so the Overlay can close; the same pointer action must
not also activate Canvas, navigation, or another control underneath it. The effective capture rule is
`!allowOutsideInteraction || closable`. This derived runtime rule is not another persisted field. Where
the rule lets the pointer through, it passes every layer the Overlay puts over the page: a Modal's
viewport-covering wrapper is opened along with its mask, and only the Modal surface itself takes input.

Close behavior continues through `closeMode`: an immediate Overlay closes directly, while a request-mode
Overlay emits its normal correlated `closeRequest`. Mask configuration never bypasses that transaction.

Core derives Ant Design's current `destroyOnHidden` and `forceRender` behavior from `mountPolicy`; neither
Ant Design field is persisted directly. Modal and Drawer use the structured `mask` API.
Focus trapping, focus restoration, scroll locking, and portal ownership default to accessible Core
behavior and are not disabled by ordinary presets.

## Runtime and signaling

Overlay open state is transient Client state. Generic Overlay inputs use the existing signal action
vocabulary for `open`, `close`, and `toggle`; open-state feedback uses an explicitly configured route.
The Overlay matches only its persisted listen routes and concrete `cms:<instanceId>` receiver.

Business payloads remain owned by a Widget, Provider, or Controller. A generic Overlay must not parse a
Table row identity, Form payload, User id, or domain command. With the default `remount` policy, an active
Widget, Provider, or Controller outside the closed Overlay addresses the zone Widget directly and sends a
separate generic open command to the Overlay.

"Addresses the zone Widget directly" means the ordinary `cms:<instanceId>` receiver, on whatever channel
that Widget answers. A sentence naming what the Overlay is about goes to a `simple-text` in the Body as
`text/change`; it needs no route declared on either end, because content channels belong to the shared
renderable-block runtime rather than to `runtimeSignals`
([SIGNALS.md](./SIGNALS.md#content-channels-and-what-actually-answers-them) -- which also lists what each
Widget answers, and warns that the list is a reading of their clients). This is the supported way to put a
runtime value into an Overlay Body, and not knowing it is a common reason a Body gets hand-assembled. A Widget inside an initially unmounted Overlay must not be
required to open its own Overlay, and must not read the selection out of a Module store -- see the Widget
contract in `MODULES.md`.

Signal delivery into a zone that has not mounted yet is guaranteed for every mount policy: the bus holds
a signal addressed to an absent receiver until the address is registered and has a listener (see
[SIGNALS.md](./SIGNALS.md#delivery-and-correlation)). The write and publish paths refuse a route whose
receiver is not in the revision, so an absent receiver is a promise not yet kept rather than a wrong
address. What is still waiting when the partition goes away is discarded without complaint: a
never-opened Overlay is ordinary operation, and only a development build traces it.

Mount policy therefore remains a rendering decision -- what exists in the DOM and what survives a close --
and is no longer a delivery decision.

What is not a delivery decision either, and looks exactly like one when it goes wrong: whether the
Controller a dialog is wired to exists at all. A Module Controller whose mount policy is `demand` is
mounted by the tree that needs it, through `controllerSettings`
([SIGNALS.md](./SIGNALS.md#capabilities-and-routes)). An Area Overlay preset writes the settings of the
Controllers it is wired to into its own tree, and they compose into the Area with it; a Controller only
the deferred Overlay asks for -- the Auth Controller of the sign-in Overlay -- arrives with its zones and
its config together. Unmounted, it is an address with no listener, so the
bus holds every signal the Overlay and its Table send it -- no exception, nothing traced, and a dialog
that never opens. This is the same silence as a forgotten `openActionKey`, reached from the other end,
and `scripts/validate-controller-mount-contracts.ts` refuses a preset that wires to a Controller it does
not mount.

A dialog needs no Controller unless it keeps state. The Table announces which action happened on which
row, each Overlay and each record-bound Form decides by its own `openActionKey` whether it was meant, the
footer presses its Form through the Form's `submit` input, and a Form that went through closes its Overlay
and tells the Table to read again -- five routes, no coordinator, and every one of them in the Page where
a Site can rearrange them. What a Controller buys on top of that is worth naming, because it is little: a
loading state on the Save button, and refusing to close while a save is in flight (`closeMode: "request"`).
News paid for those two with three silent failures in one afternoon -- a Controller nobody mounted, one
whose senders it did not recognise, and one that heard what it sent -- and now has none. The Settings Page
shell and the Auth Installations Page are the shape to copy.

Creating a record and correcting one are two dialogs, not one dialog opened twice. A Form Widget with a
`source` and an `openActionKey` is a record editor: it shows its skeleton from the moment it mounts and
leaves it when the row it was opened with arrives. A new record has no row, so the same dialog opened on
nothing shows a skeleton for ever -- the fields never appear, and nothing says why. The create dialog
carries the same Form with no source, which opens ready to type; what distinguishes a new record from a
correction is then the identity field the editor fills and the create dialog leaves empty. The auth
Installations Page states both, side by side.

An Overlay opened by a Table's row action names that action itself, in `openActionKey`. A Table announces
one thing -- a row action happened, and here is which one -- so each listener decides for itself whether
it was meant: the Record or Form Widget in the Body by its own `openActionKey`, and the Overlay by this
field. `matchesOpenAction` refuses an `open` route carrying the `tableAction` schema whenever the key is
absent, because an Overlay that opens for every announcement opens when a row is deleted; the cost of
that choice is that a forgotten key is silent -- no exception, nothing in the journal, a dialog that
simply never comes up, which the Logs page carried for as long as it existed. Both halves are checked:
the shell's overlay descriptor requires the field in its type, and
`scripts/validate-overlay-open-action-keys.mjs` reads every hand-written Overlay node in a preset and
fails one that listens Table-shaped without a key -- or states a key that no Table-shaped route reads.

Runtime, preview, and authoring must resolve the same Overlay config and all declared zone trees.
Provider demand, Widget/Controller materialization, access filtering, signal-route validation, and
media/reference scans must include every reachable Overlay subtree exactly like reachable Region subtrees.

## Core React containers

`PhiModalControl` and `PhiDrawerControl` are the provider-free Core presentation adapters over Ant Design.
They own portal behavior, focus, viewport bounds, the fixed Header/Footer and scrolling Body semantics,
semantic DOM styles, and user-dismiss reason reporting. They receive already rendered title, Header, Body,
and Footer content and do not own CMS identity, revisions, Layout ids, Providers, Controllers, or signal
routes.

`PhiDialogControl` is the only other Control that may render either of them. Nothing else imports
`PhiModalControl` or `PhiDrawerControl` directly -- see [Dialogs that are Controls](#dialogs-that-are-controls).

`PhiOverlayContainerClient` is the Core CMS renderer for resolved Overlay nodes, as Modal or Drawer. It
adapts serializable Phi config to the Controls, resolves the optional Header and Footer Layouts plus the
required Body Layout, and maps Control interaction reasons into the Overlay signal contract. Modal and Drawer share this logical
composition; Ant Design `title`, Drawer `extra`, and their differing semantic DOM nodes are private adapter
details. Domain components render ordinary Widget or Control content only and must not wrap themselves in
Ant Design Modal or Drawer components.

### The imperative exemption, and how narrow it is

One kind of dialog is not a CMS Overlay: a prompt whose whole content is a sentence and the two answers
to it. `modal.confirm` with a title, a line of text, an OK and a Cancel. Nothing else qualifies, and this
paragraph is the only licence -- it has been read as a general one three times, which is what these rules
answer.

The exemption ends the moment the body has **structure**. A field to fill in, an alert beside a form, two
things stacked with a gap between them, anything a Widget would otherwise render: that is a Body Layout
with Widgets in it, and building it by hand builds a Region without declaring one. The test is not how
important the dialog is, how long it lives, or whether the Builder is the only place it appears. It is
whether you are arranging content. If you are reaching for a Flex to lay the body out, you have left the
exemption.

What that costs when it is ignored is not style. A zone's padding owner is its root Layout
([Padding ownership](#padding-ownership)); a hand-assembled body has no root Layout, so it has no padding
owner, and the spacing gets typed in by hand -- differently each time, answering to nothing.

The shape a structured dialog takes is the ordinary one, because an Overlay is a Region with named zones:

```text
overlays[]
└── one Overlay node          title, width, mountPolicy, closeMode, signal routes
    ├── bodyLayoutNodeId   -> flex-vertical, `panel`         gap + padding + background
    │   ├── Widget                                            an alert, a message, a table
    │   └── Widget                                            a Form
    └── footerLayoutNodeId -> flex, `overlay-actions`         canonical padding, no config
        └── Widget                                            a Command Toolbar
```

Both Layouts are declared as ordinary top-level Layout nodes by the same preset that declares the
Overlay, and the Widgets sit in their slots at sequential slot indexes. The footer's commands are a
Command Toolbar, not buttons the container draws; a button that must wait for the body enables itself
through the normal `enabled` channel from whatever in the body decides it.

A Builder-only prompt is not exempt for being Builder-only. `mountPolicy` and the Area preset are where a
workspace dialog belongs just as much as a public one; "it only shows up in the Builder" describes who
sees it, not what it is.

### Dialogs that are Controls

There is one place a structured body may be assembled in code, and it is not an exemption from the rule
above -- it is the case the rule cannot reach. A Control has no position in a CMS tree. Authoring chrome
that a Widget draws inside its own scaffold popup has none either: there is no preset that could declare
an Overlay for it, because the thing it belongs to is a Control, not a node. The Inspector's collection
editor and the static options picker are that case.

Those render `PhiDialogControl` (`components/controls/phi-dialog-control.tsx`), which is the code-side
counterpart of the Body and Footer Layouts and exists for exactly the reason
[Padding ownership](#padding-ownership) gives: a hand-assembled body has no padding owner, so the spacing
gets typed in by hand and answers to nothing. It takes a title, an optional alert, the subject, and the
Footer's actions, and it renders the same shape the tree produces -- Body one `base` apart and one `base`
in from every edge, actions anchored right, `xs` apart, `xs` from the fold and `base` from the sides.

The boundary is therefore: **has this thing a place in a tree?** If a preset could declare it, the preset
declares it and the answer is an Overlay node. If the only thing that could own it is a Control, the
answer is `PhiDialogControl`. "It was easier in code" is not a reading of that question.

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
normal Command Toolbar in the Footer root. For the Asset Focal Rectangle Editor, the Builder Area preset
declares the Modal with `mountPolicy: "remount"`, its Body is a Content Layout providing zero padding and
the secondary background, and its Asset-owned spatial-editor Widget is projected only into the Builder
runtime Client manifest.
Apply emits the controlled Form-field value and then closes with the originating correlation; Cancel or
Escape discards the local draft. The opening Preview action is therefore a `PhiButtonControl`, not a
specialized focal-rectangle Control.

## Authoring boundary

Builder has no Overlay authoring; its design is [design/OVERLAY_AUTHORING.md](./design/OVERLAY_AUTHORING.md).

Code-owned and persisted presets declare complete Overlay instances and explicit
named zone Layouts, and runtime/preview render them through the canonical path. No preset-local Modal/Drawer
renderer is allowed.

