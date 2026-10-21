# Tour and visual-anchor design

This is a design, and the first cut of it is built (2026-10-17): visual anchors in the signal partition
(`components/runtime/runtime-visual-anchors.ts`), `PhiTourControl`, the definition type
(`types/tours.ts`), the Page hand-over (`server-helpers/page-tour.ts`, `phi-cms-page-render-scope.tsx`),
the Tour button (Core, `core/widgets/tour-button`), and the Tour Module with its Controller
(`plugins/runtime-modules/tour`). The Theme workspace
carries the first Tour.

Subcontrol anchors are built for the Table (2026-10-19, below), and for the Regions on the Builder's
Shells and Pages canvas. A step's `prepare` and `release` signals and the Overlay anchor are built
(2026-10-21, below). Not built yet: subcontrol anchors of other Widgets, resuming at a stored step, and
Region targets of a Page Tour in the Area's own Shell.

A feature-local Tour renderer, DOM-selector convention, address family, or signal protocol is not an
allowed substitute for this design.

## Decided direction (2026-10-17)

The split below was agreed with the operator and supersedes the "no discovery" sentence under
[Core model](#core-model) as far as it goes:

| Part | Owner |
| --- | --- |
| Visual anchors, `PhiTourControl`, the definition type, the Tour workflow as a client state machine with `profile` persistence | Core (foundation) |
| One Tour | the Module that owns the Page, attached to that Page's route preset |
| The Tour button, and the Tour Controller's address and channel (`PHI_TOUR_CONTROLLER_ADDRESS`, `tour`) | Core (foundation) |
| The Tour Controller | the Tour Module, opt-in and switchable |

- Discovery is per Page, not a registry: the render knows whether the current Page carries a Tour, the
  way it knows the Page's meta, and the button is visible only then.
- The button sends an ordinary signal to the Tour Controller of its Area; the Controller reads the Page's
  definition and the user's progress and runs it. Offering a Tour once on first visit is the
  Controller's too.
- Switching the Tour Module off removes the Controller, for every Module's Tours alike: the buttons, never
  told that a Tour is there, stay hidden, and definitions in other Modules stay inert. No Module depends on
  the Tour Module to carry a Tour or to place the button -- a third-party Module puts `tour-button` on its
  own Page the way a Shell puts it in `header_top` (2026-10-19). A single Tour is switched off per user
  by its progress (dismissed/completed).
- Operator-authored Tours (a target picker in the Builder) remain out of scope.
- Target ids: a preset node keeps its derived id through editing, saving and publishing (CMS.md), so a
  Tour may target preset nodes of an edited Page; a node the Site removed is a missing target.
- Since the button is Core's, a Shell preset places it like any Core Widget: Admin, Editor and Builder
  carry it at the left of `header_top`. Still open: the Public and App Shells carry none, and the Public
  Area shows `header_top` only on `/`.

## Core model

A Tour is a transient guided-learning workflow that presents an ordered set of steps around visible Phi
UI targets. It is not CMS content, a Modal or Drawer Overlay, a Picker, a Tooltip, a Region, or a hidden
Widget occupying a Layout slot.

`PhiTourControl` is the provider-free Core presentation adapter. It privately adapts Ant Design `Tour`
and receives only normalized presentation state plus already-resolved visual targets. Feature code,
Modules, Widgets, Forms, Controllers, and third-party packages must not import Ant Design `Tour`, its
types, refs, callbacks, or target shape directly.

The owning Tour runtime Controller owns the workflow state: selected Tour, current step, open/closed
state, target readiness, preparation signals, navigation coordination, completion, dismissal, and
progress persistence. `PhiTourControl` never resolves CMS data, navigates, dispatches business signals,
or writes user state.

The target v1 structure is:

```text
versioned Tour definition
        |
        v
owning Tour runtime Controller
  - current/open/progress
  - normal Phi signaling
  - active Runtime visual-anchor lookup
        |
        v
PhiTourControl
        |
        v
private Ant Design Tour adapter
```

This contract does not introduce a global Tour registry, a new Runtime Module descriptor family, or a
visual Tour Builder. Tour-definition discovery and authoring require a separate operator-approved
contract. Until then, a Tour definition is supplied explicitly by its owning installed Module and
Controller through the normal module/controller configuration path.

## Definition identity and content

- Every Tour has a stable namespaced id and a positive integer definition version.
- Every step has a stable step key within that Tour. Array position is presentation order, not identity.
- Step title, description, button labels, and optional cover metadata use the normal Phi label-set and
  translation paths. Raw Ant Design locale strings are not a second localization source. The buttons are
  Core's `tour` label set. The steps' words are translated with the Page, in one batch per Tour and under
  the Tour's id as context (`server-helpers/page-tour.ts`): a built-in Tour -- one whose owning Module is
  in `@phis/ui` -- in the global set, since its words are the same on every Site; a third-party Module's
  Tour per Site with `trForLocale`, from the language that Module writes in, where the Site's own
  corrections apply.
- A definition may configure normalized placement, mask, interaction blocking, scrolling, keyboard,
  and previous/next presentation supported by `PhiTourControl`; arbitrary Ant Design props, style
  callbacks, React nodes, DOM elements, and refs are never persisted or exposed as public ABI.
- Changing the definition version deliberately creates a new learning revision. User completion is
  compared with the version, not inferred from the number or text of steps.

## Target addresses

Tour targets reuse the existing `PhiSignalAddress` namespace. They do not introduce Tour ids, CSS
selectors, DOM ids, ref names, Widget-type selectors, or another runtime identity family.

The visual target subset is:

- `cms:<instanceId>` for one rendered Widget, Layout, or Overlay instance;
- `cms:<instanceId>:<subcontrolKey>` for one stable visual subcontrol exposed by that instance; and
- `region:<regionKey>` for one visible Region container.

`PhiCmsInstanceId` is therefore the canonical persistent Tour reference for CMS instances. The same id
continues across Draft, preview, Published runtime, move, and preset reset according to the CMS identity
contract. The Tour definition does not copy node paths or derive identity from a Widget/Layout type.

A `controller:...` address is never a visual target because a Controller need not own a visible DOM
element. A step may explicitly declare no target for intentional centered presentation. Failure to
resolve a declared visual address must never silently turn that step into a centered step.

Subcontrol keys must already be stable keys owned by the canonical Phi Control/Widget contract. A Tour
must not identify a Table row by array position, a generated React key, visible text, or an Ant Design
class. Dynamic collection targets require a separately approved stable-address contract before use.

## Visual-anchor registration

The active Runtime Registry gains one optional visual-anchor facet keyed by the same visual
`PhiSignalAddress`. This is target resolution, not a second routing registry and not a new public address
family.

- A mounted CMS renderable-block frame registers its base `cms:<instanceId>` visual anchor.
- A mounted Overlay registers its panel under `cms:<overlayId>`: the Overlay container hands its Drawer or
  Modal Control a `panelRef`, and the Control attaches it to the element it draws the panel as. A closed
  Overlay has no box and is not found.
- A Region container registers its existing `region:<regionKey>` visual anchor.
- A canonical Phi Control or Widget may register a stable
  `cms:<instanceId>:<subcontrolKey>` anchor when its public contract exposes that subcontrol.
- Registration supplies a live element getter or equivalent lifecycle-safe handle. DOM elements never
  enter a signal payload, persisted config, server response, or Controller snapshot.
- Registration and removal follow mount/unmount. Hidden, collapsed, disabled, or portal-mounted content
  reports its real current availability rather than retaining a stale element.
- Duplicate active visual anchors for one address inside one Runtime partition are a contract error.

A part is marked by the Control that draws it and offered by the Widget that owns the address. The
Control sets `PHI_VISUAL_ANCHOR_PART_ATTRIBUTE` (`data-phi-anchor-part`, `types/tours.ts`) on the part's
element -- an inert mark on its own -- and the Widget registers the parts it promises with
`usePhiVisualAnchorParts`, which finds each one inside the Widget's own registered frame and nowhere else.
The Table Widget offers `filters`, `toolbar`, `header` (the column heads as far as they are seen, never the full width of a Table that scrolls sideways), `row-actions` (the actions
column's head), `footer` and `pagination`; a part the Table does not draw is simply not found, and the
step does what its `ifMissing` says. The Builder's Shells and Pages workspaces offer each Region on their canvas by its key
(`cms:<canvas>:header_main`, `cms:<canvas>:content`), marked by the Region scaffold. A Page Tour naming a part makes the owning Widget's frame live, as
naming the Widget itself does.

Anchor lookup is always scoped to the active Runtime Registry partition. Live runtime, Builder Canvas,
Preview, and other sandboxes may contain the same `PhiCmsInstanceId` concurrently without resolving to
one another. Global `document.querySelector`, raw `data-phi-block-id` lookup, and cross-partition fallback
are forbidden. Existing data attributes remain diagnostics and renderer metadata, not the Tour lookup
API.

## Signaling and orchestration

Tour workflow uses the existing Phi signal bus, scopes, addresses, capability metadata, correlation ids,
actions, and value types. It does not define a parallel event bus or widen `PhiSignalAction`.

- The Tour Controller declares every input and output of its own protocol through its normal
  `runtimeSignals` metadata. A step's signals are not part of it: they are written in the definition like
  a route, by the Module that owns the Page, and checked there against their receiver.
- Opening, closing, changing the current step, restarting, completing, or dismissing a Tour uses ordinary
  Tour-specific channels combined only with approved actions such as `open`, `close`, `change`, and
  `activate`.
- A step may ask the Controller to prepare its target by dispatching ordinary typed Phi signals. Examples
  include opening a Collapsible slot, activating a Stack/Tab slot, opening a Drawer, or changing a
  controlled selection. Those receivers must already declare matching listen capabilities.
- The step states them as `prepare` and `release` (`PhiTourStepSignal`: receiver, channel, action, value
  type, schema, value), sent in the Area scope under the Tour Controller's address and always to a named
  receiver, never broadcast. `prepare` goes out when the step is asked for, before its target is waited
  for; `release` goes out when the step is left, however it is left -- the next or previous step, a step
  passed over, the Tour closed or finished, the Page left. Every `prepare` is answered by exactly one
  `release`, so whatever a step opened does not stand in front of the steps after it. The owning Module's
  tests check each step signal against a listen capability of its receiver
  (`plugins/runtime-modules/builder/tour.test.ts`).
- A step that opens a Builder Inspector selects through the Builder Controller's `selection` channel, the
  way a click does. A sender that cannot know a Site's node ids names a Layout by its Region alone
  (`{ nodeKind: "layout", regionKey }`), and the Controller selects that Region's root Layout; a Region
  without one selects nothing. Inspector sections open through the section Collapsible's `slot/open`.
- A user interaction may advance a Tour only through an explicitly routed signal from the originating
  CMS instance/subcontrol to the Tour Controller. The Controller must not attach feature-specific DOM
  listeners or infer completion from Ant Design internals.
- Preparation and advancement retain correlation ids through the normal signal path. Broadcast and
  cross-Area signaling remain subject to the existing restrictions.
- The target address is used as a Registry lookup key; it is not itself proof that a signal receiver or
  visual element exists. Signal readiness and visual-anchor readiness are related lifecycle facts but
  remain distinct.

No signal may request or return an `HTMLElement`, React ref, DOM selector, or bounding rectangle.
`PhiTourControl` alone receives the resolved element getter from the Tour Controller's client boundary.

## Target readiness and navigation

Before presenting a targeted step, the Controller performs this sequence:

1. establish the required Area/Page route through the existing navigation boundary when the Tour
   definition explicitly owns such a transition;
2. dispatch the step's declared preparation signals;
3. wait for the target address to register in the current Runtime partition with a box of some area --
   a slot that hides itself lays out at zero height and is not a target;
4. wait for the target to stand still, so an opening Drawer or slot is not measured mid-motion
   (`waitForPhiVisualAnchorToSettle`, bounded);
5. hold the window's scroll padding at the bands that stay stuck above the target -- the Shell's Header
   bands, a Page's sticky band -- found from the target outwards (`holdPhiTourViewport`,
   `components/controls/phi-tour-viewport.ts`);
6. pass its live element getter to `PhiTourControl`; and
7. present the step and let the Control scroll the target into view: centered below the stuck bands where
   it fits there, top-aligned under them where it is taller. Ant Design alone scrolls only a target that is
   not wholly inside the window -- a tall one on every scroll event, to the middle and under the Header, and
   one under a sticky band never -- so the Control hands it the alignment that fits and brings in a target
   it took for seen. The scroll begins only once the step is presented: Ant Design scrolls a shown target
   back into view, so a scroll begun under the previous step is undone by it.

Readiness waiting must be bounded and cancellable. A declared missing-target policy may skip the step or
stop the Tour with normal feedback; it must never select a similarly named element, cross into another
partition, or silently center the step. Navigation failure, inactive owner Module, tombstoned CMS
content, access filtering, and responsive visibility are legitimate missing-target outcomes.

One Controller instance never sends lateral signals into another Area. A Tour that crosses an Area
boundary must checkpoint user progress before navigation and resume through the destination Area's
normal Tour owner after authorization and target resolution. Cross-Area Controller bridging is forbidden.

## User progress

Guided-learning progress is user state, not Site CMS config, Theme config, a Draft revision, or browser
layout state.

- Authenticated progress belongs to the User Space/Profile and is scoped by Site, user, Tour id, and Tour
  definition version.
- The stored state may represent not started, current step, dismissed, or completed. It stores stable step
  keys rather than array offsets as durable identity.
- A user may restart an available Tour. A newer definition version may be offered again without deleting
  the history of the previous version.
- Modules and Sites may decide whether to offer or auto-start an available Tour, but must not bypass the
  user's completion/dismissal policy or write progress from presentation code.
- Anonymous progress, synchronization policy, retention, and Admin reporting are outside target v1 until
  separately approved. They must not be implemented through an unrelated cookie or local-storage path.

## Presentation and accessibility

- `PhiTourControl` owns normalized mask, gap, placement, keyboard, interaction-blocking, scrolling,
  indicators, and previous/next/finish presentation. Ant Design `ConfigProvider.tour` remains a private
  Theme-adapter detail and is not Site/runtime configuration transport.
- Escape closes or dismisses according to the owning Controller policy; it never records completion.
- Keyboard navigation, focus restoration, reduced-motion preferences, readable contrast, and accessible
  names remain available independently of optional Tooltips.
- Essential validation, authorization, warning, and confirmation information must not exist only inside
  a Tour. Tours explain the UI; they do not become a prerequisite for operating it.
- `disabledInteraction` controls whether the highlighted target may be used during a step. Advancing on a
  real target action requires interaction to remain enabled and the resulting normal Phi signal to reach
  the Controller.

## Authoring boundary

Builder may display and validate existing Tour target addresses once Tour authoring is approved, but v1
does not yet add a Tour canvas, target picker, auto-generated steps, DOM recorder, or CMS persistence.
Any future authoring UI must select canonical addresses from the active target-Area metadata and preserve
Runtime partition isolation. It must never persist DOM selectors or create signal routes implicitly.
