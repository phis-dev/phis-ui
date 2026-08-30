# Tour and visual-anchor contract

This document defines the target v1 contract for guided Phi UI Tours. Changing, extending,
reinterpreting, or bypassing this contract requires explicit prior operator approval. A feature-local
Tour renderer, DOM-selector convention, address family, or signal protocol is not an allowed fallback.

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
  translation paths. Raw Ant Design locale strings are not a second localization source.
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
- A Region container registers its existing `region:<regionKey>` visual anchor.
- A canonical Phi Control or Widget may register a stable
  `cms:<instanceId>:<subcontrolKey>` anchor when its public contract exposes that subcontrol.
- Registration supplies a live element getter or equivalent lifecycle-safe handle. DOM elements never
  enter a signal payload, persisted config, server response, or Controller snapshot.
- Registration and removal follow mount/unmount. Hidden, collapsed, disabled, or portal-mounted content
  reports its real current availability rather than retaining a stale element.
- Duplicate active visual anchors for one address inside one Runtime partition are a contract error.

Anchor lookup is always scoped to the active Runtime Registry partition. Live runtime, Builder Canvas,
Preview, and other sandboxes may contain the same `PhiCmsInstanceId` concurrently without resolving to
one another. Global `document.querySelector`, raw `data-phi-block-id` lookup, and cross-partition fallback
are forbidden. Existing data attributes remain diagnostics and renderer metadata, not the Tour lookup
API.

## Signaling and orchestration

Tour workflow uses the existing Phi signal bus, scopes, addresses, capability metadata, correlation ids,
actions, and value types. It does not define a parallel event bus or widen `PhiSignalAction`.

- The Tour Controller declares every input and output through its normal `runtimeSignals` metadata.
- Opening, closing, changing the current step, restarting, completing, or dismissing a Tour uses ordinary
  Tour-specific channels combined only with approved actions such as `open`, `close`, `change`, and
  `activate`.
- A step may ask the Controller to prepare its target by dispatching ordinary typed Phi signals. Examples
  include opening a Collapsible slot, activating a Stack/Tab slot, opening a Drawer, or changing a
  controlled selection. Those receivers must already declare matching listen capabilities.
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
3. wait for the target address to register in the current Runtime partition;
4. pass its live element getter to `PhiTourControl`; and
5. present the step and allow the Control to scroll the target into view according to normalized config.

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
