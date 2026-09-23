# Layout contract

This document defines the contract for CMS Regions, Layouts, and slots. Shell topology and shell CSS are
owned by [SHELL.md](./SHELL.md); the signal channels a Layout receives are owned by
[SIGNALS.md](./SIGNALS.md).

## Core model

The render tree has three structural levels:

1. A Region is an Area- or Page-owned placement container.
2. A Layout is a persisted CMS node that owns child topology and optional visual treatment.
3. A slot is a typed child position owned by its Layout.

The tree rules are strict:

- A Region never contains a Widget directly. A Region node points to exactly one root Layout
  (`rootLayoutNodeId`); a Region whose root Layout does not resolve is not rendered and leaves no wrapper.
- A Layout may contain Layouts and Widgets. Widgets are leaves.
- A slot holds at most one direct child, which is either one Layout or one Widget. A Layout's flexibility
  comes from how many slots it exposes, never from several children in one slot.

There is exactly one Layout node kind, one Layout plugin registration, and one renderer path per
topology. Visual treatment is ordinary Layout config; it never creates another node kind, registry
entry, type-key suffix, renderer, parser, serializer, Builder category, or signal receiver family.

## Identity and type keys

- A Layout type key is `<plugin-key>/<layout-type>`.
- A Layout instance has one canonical `PhiCmsInstanceId`.
- Layout receivers use `cms:<instanceId>` and the mounted Area/Page scope.
- Persisted v1 data using a third presentation segment is invalid. There is no compatibility reader.
- Nested Layouts use the same identity, signaling, sizing, and Inspector contract as root Layouts.

## Layout config

Every Layout combines two independent concerns in one config object:

- topology and geometry, such as direction, gap, columns, widths, wrapping, alignment, and slot policy;
- visual treatment, such as padding, background, border, radius, shadow, and effect.

The shared fields are:

- `padding`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`
- `background`
- `borderSource`, `border`, `borderRadius`
- `shadow`
- `effect`
- the shared renderable-block geometry, visibility, access, and transition fields

Layout-family plugins add only topology-specific or explicitly family-specific fields. A family must
not duplicate shared parsing or serialization.

Canonical defaults are neutral: no margin, no padding, no visible background, no border, no radius, no
shadow, and no effect. A Layout never adds implicit inner padding around its slot content; a Region that
needs padded composition configures padding on its Layout or on the Region itself. A first-party creation preset may provide an initial visible-container configuration,
but creation presets are input to the node factory only. Their values are materialized as normal
Layout config and the preset name is never persisted or interpreted at render time.

Effects and standard shadows are selected by semantic ids and resolved globally (`types/layout-style.ts`):
effects are exactly `glass`, `haze`, `blur`, and `dim`; shadows are exactly `none`, `soft`, and `strong`.
Presets store the chosen id, not CSS implementations. A custom shadow is the sole exception and persists
as `{ kind: "custom", value: "<box-shadow>" }`; arbitrary effect parameters and arbitrary strings in the
shadow field are invalid. `borderRadius` given as one value is shown by the Border control as four equal
corner radii; explicit per-corner values override it.

### Where a Layout's outline comes from

`borderSource` is `none`, `theme`, or `custom` (`types/cms-config.ts`), and it answers for every Layout
family alike -- it is chrome, not a family field, so a Module's own Layout gets it without declaring
anything.

- `theme` draws the Site's own line: its border colour at its line width, so it follows the Theme rather
  than copying it.
- `custom` draws the configured `border`, and is the only source that reads a configured `borderRadius`
  or per-corner radius. Under the other two the corner comes from the Control shape's surface step
  ([THEME.md](./THEME.md#control-shape)), so switching to `theme` or `none` shows the shape at once.
- `none` draws no line and states so, rather than saying nothing: the style is laid over one that may
  already carry a line.

A stored Layout that predates the field is read by `resolvePhiCmsBorderSource`: a configured LINE means
`custom`, everything else means `none`. A radius alone is not a line. The rule is stated once and read by
the drawing and the Inspector, which is what keeps them from disagreeing about a Site nobody rewrote.

This is the only thing that decides a Layout's outer edge. A Layout family never draws a frame of its own
-- the Collapsible's `ghost` governs the INSIDE, whether its panels are separate objects or a flat list,
and says nothing about the edge around them. Its grounds state no corner at all: the Layout box has one
and clips them to it, because a clip only takes away and a ground rounded more tightly than its box would
never be reached.

### Background motion

The canonical structured Background config may attach motion to its own image base:

```ts
motion?: {
  mode: "static" | "fixed" | "parallax";
  strength?: number;
  direction?: "natural" | "reverse";
}
```

`static` is the default. `fixed` and `parallax` are valid only when the same Background config owns an
image base; neither mode may implicitly read, inherit, or reuse the Theme Root image or another ancestor's
Background. `strength` is normalized to `0..1` and defaults to the shared Phi Parallax strength. Motion follows
the logical block/scroll axis. The runtime derives required image overscan and clipping; those mechanics
are not persisted presentation fields.

Background motion is visual treatment, not Layout topology and not a semantic Effect. It therefore does not
create a `ParallaxLayout`, another Layout plugin/type, extra slot depth, or a separate parser/renderer family.
Every normal Layout topology may opt into it through its shared Background config, and Region Backgrounds use
the identical value contract. Layout children and Region root Layouts remain in normal flow above the moving
Background layer.

The motion implementation is one shared, UI-library-independent Background renderer. It resolves movement from
the owning Region/Layout box relative to the active scroll viewport, clips inside that owner, uses a central
scroll/frame coordinator rather than React state or one scroll listener per instance, and stops work for
off-screen instances. `prefers-reduced-motion` renders the same image statically. SSR, no-motion Backgrounds,
and the Layout/Region child tree remain server-renderable; only an actively configured moving Background
mounts the lazy Client layer (`components/cms/clients/phi-background-motion-layer-client.tsx`), which Layouts,
Regions, and the Theme Root Background share.

The Theme Root Background (`components/root/phi-root-background.tsx`) uses the same config but offers only
`static` and `parallax`: it is viewport-fixed, so `fixed` would be indistinguishable from `static`, and a
stored `fixed` resolves to no motion. Its host geometry belongs to [SHELL.md](./SHELL.md).

## Form grid

A form is a Form Widget and stands in whichever Layout suits the page, commonly a vertical flex in slot 0.
No Layout kind is dedicated to forms. What the Layout contributes is `labelEnd` (below).

A form is a grid of 24 tracks, and every element in it says which tracks it lies on as a range of grid
lines: `start` is the line it begins at and `end` is the line it stops before, counted from 1, so the
last line is 25. This is CSS Grid's own counting and no other counting is used.

- A label at 1-7 with a control at 7-25 is a two-column row. A control at 7-19 leaves 19-25 empty, and
  a further element may then say 21-25 and stand in that gap on the same row.
- A label and a control that claim any of the same tracks cannot share a row, so they take two. That is
  how a stacked field is written; there is no placement mode beside it.
- Each field is placed as one unit spanning its label and its control together, and lays its parts out
  inside that unit on the same tracks. Elements are placed in declaration order and the grid never goes
  back to fill a gap it has passed, so a field meant to stand beside the one before it is declared after
  it.
- The Layout a form stands in decides its label column, as `labelEnd` -- a shared Layout field carrying a
  line on this same grid, never a width. It is read two ways: as the grid line a descriptor form places its
  labels on, and as the share of the width derived for labelled Controls, which know nothing of the grid.
  Nothing authors that share, so the two cannot drift. Shared like padding, because any Layout can be the one a form or
  a panel of labelled Controls stands in. The descriptor decides it where no Layout says anything. A field that departs from those columns says so itself, because that is a
  statement about the field and not about the form.
- The same ranges are declared per measured width. A set that is two columns at `wide` and one column
  at `compact` is the whole of what used to be a column count plus a label placement.

## Regions

Regions own shell and page placement rather than child topology. They may configure:

- visibility, enabled state, viewport behavior, size bounds, opacity, and z-index;
- sticky/full-height/collapse behavior where the Region family supports it;
- background, border, shadow, and semantic effect;
- `padding`, `paddingTop`, `paddingRight`, `paddingBottom`, and `paddingLeft`.

Region padding is applied to the Region root and is independent of root-Layout padding. It is stored
flat in the Region config, parsed through the shared padding value rules, and edited as a Region
property. The Builder must not synthesize a Layout solely to represent Region padding.

A Region without a configured `border` renders no border: header, footer, and sider separators are never
implicit, and Canvas outlines belong to Builder scaffold chrome only. Static and client-enhanced Region
renderers resolve chrome through the same Region-shell resolver.

`PhiStructureRegionLayout` and `PhiPageRegionLayout` are Builder/preview adapters for Region-owned
composition, not alternate Layout kinds.

## Slots

- A Layout plugin declares its slots and their stable semantic keys.
- The ordered runtime representation uses `slotIndex`; authoring maps it to the declared slot key.
  Semantic slot names of a fixed-slot family resolve from stable indexes such as `0`, `1`, `2`.
- Sequential flow Layouts (every slot `sequential`) compact their `slotIndex` order after a delete;
  sparse slot Layouts keep their positions.
- A slot declares accepted child kinds, multiplicity, size policy, and optional default anchor.
- Layouts receive ordered `slots` as the primary child API; free-form `children` is not the public
  placement API.
- Empty, occupied, preview, and edit rendering use the same slot topology.
- Slot state belongs to the owning Layout receiver. `slot:` is not a public v1 receiver family.
- A title-bearing Layout family stores slot titles as Layout presentation config keyed by its declared
  slot order. A child Widget/Layout label is not a fallback source for that title.
- Titles live on the owning Layout (for example `slotTitles` on `PhiCollapsibleLayout`) and do not move
  with child drag and drop.
- Moving, replacing, or deleting a child does not move, rewrite, or delete either the source or target
  slot title. Authoring exposes title editing as an explicit Layout operation.
- A title-bearing live renderer may omit an empty slot panel without deleting its configured title;
  inserting a later child reuses that title until the operator changes it.
- The Collapsible Layout is capped at 12 slots (`PHI_CMS_COLLAPSIBLE_LAYOUT_MAX_SLOTS`), one child per
  slot. Compositions that need more panels — including Module Settings pages, whose sections become
  Collapsible panels — must split across Layouts or pages instead of exceeding the cap.

The standard size policies are `fill`, `hug`, `fill-inline`, `fill-block`, `fixed`, and `intrinsic`.
The parent slot policy is authoritative; child defaults cannot override it.

## Rendering and authoring

- Runtime, preview, and authoring resolve the same Layout plugin, parser, and slot definitions.
- `PhiBaseLayout` owns shared renderable-block behavior and the common visual config. Family renderers
  own topology and explicit slots and do not add a second generic wrapper to apply padding, background,
  border, radius, shadow, or effect.
- Optional creation presets are resolved by the node factory and materialized into ordinary config; no
  preset identity reaches persistence or rendering.
- A Layout's configured visual treatment is rendered on the same root that owns its topology.
- Editor scaffolding is an authoring overlay and must not change persisted topology or runtime depth.
- Insert, select, drag, delete, and title controls operate on the Layout instance and its declared slots.
- The Inspector exposes topology fields and shared visual fields for every Layout.
- Regions expose their own geometry, padding, background (including image motion), border, shadow, and effect
  controls. Layout Background authoring exposes the same motion fields only when the selected Background owns
  an image.

## Sizing and nesting

- Layouts default to filling the available parent slot unless their plugin declares another policy.
- Layout depth counts actual Layout nodes only; visual config never adds depth.
- The Canvas, preview, and published runtime must derive sizing from the same declared policies.
- Responsive behavior belongs to the Layout that knows the actual slot geometry, not to a global
  viewport heuristic.

### Grid slot placement

`PhiGridLayout` owns one 24-unit logical grid. Every populated slot may declare presentation-only
placement with a responsive `span` and `offset`, using the shared `compact`, `medium`, and `wide`
profiles. `span` is an integer from `1` through `24`; `offset` is an integer from `0` through `23`,
defaults to `0`, and counts unused columns from the logical inline start. `offset + span` must not exceed
`24` in any profile. Responsive values use the shared smaller-to-larger cascade.

The effective profile is resolved from the Grid Layout's own available inline size and the same shared
Phi thresholds used by responsive Forms, never from the browser viewport. Runtime, preview, and Builder
must therefore resolve the same placement when the Grid is mounted in a Page, Modal, Drawer, Inspector,
or nested Layout slot. Slot source order remains the logical, focus, accessibility, and authoring order;
offset changes presentation only and must not reorder or synthesize slots.

Placement belongs to the owning Grid Layout config. A Grid must not inspect a child Widget type, Form
descriptor, Provider, Controller, field placement, or submitted values to infer it. Conversely, a child
Form must not inject Buttons into the Grid or expose its internal field grid as parent Layout slots.
External Form actions are ordinary Button Widgets in explicit Grid slots and use the normal Controller,
Form-signal, validation, and result lifecycle. A preset that aligns such a Button with a Form's control
column declares matching responsive values on both independent contracts; no Form-specific Layout family,
implicit action row, margin compensation, or ancestry detection is permitted.

A Form Widget's declared `submit` is not such an action. It belongs to the Widget, not to the form inside
it, opens its own row of the same twenty-four tracks, and lines up under the inputs because it takes the
form layout's own control range at each width, including the label column a Form Layout moved -- not
because the Grid arranged it. A form whose labels stand above their controls has no label column, and its
submit starts where its inputs start. The Grid still sees one Widget.

### Stack slot mounting

`PhiStackLayout` declares `mountPolicy` from the shared mount vocabulary in `types/cms-mount-policy.ts`
(also used by Overlays): `remount` (default) mounts the active slot and takes a slot down when it stops
being active, `lazy-keep` mounts a slot when it first becomes active and keeps it, and `eager` mounts every
populated slot with the Stack. A kept inactive slot is `inert` and `aria-hidden`, so it is out of focus,
pointer interaction, and the accessibility tree. `lazy-keep` or `eager` is required for tabbed workflows
whose Controls must retain draft state while another slot is active. The policy changes
only mounting; `activeSlotKey`, runtime slot signals, and persisted child topology remain unchanged.

The presentation option `slotTransition: "none" | "fade-over"` controls visual changes between active
slots and defaults to `none`. `fade-over` places the inert outgoing slot temporarily above the new
active slot and fades only that outgoing surface, for `slotTransitionDurationMs` or by default the Ant
Design `motionDurationSlow` token. The
new slot always remains in normal flow and therefore owns the Stack's natural size. Rapid changes
replace the current outgoing surface instead of queueing transitions; reduced-motion preferences and
Builder edit rendering use an immediate switch.

Stack signaling always uses the concrete runtime scope of the Layout instance. An Area-owned Overlay
Stack therefore emits and listens in Area scope, while a Page-owned Stack uses Page scope.

## Styling

- Generic component values use Ant Design tokens or their server-safe resolved equivalents.
- Persisted config contains semantic choices and explicit operator overrides, not copied theme values.
- `--phi-*` variables are reserved for Phi-specific structural or technical contracts.
- Presets select config values only; they must not redefine effects, shadows, or theme algorithms.

## Extension rules

A Layout plugin provides one topology under one type key and must use the common Layout contract.
Third-party code may add Layout families, fields, slots, and render policies, but may not reintroduce a
parallel presentation kind or compatibility suffix. Phi-owned modules must use the same registry,
factory, parser, renderer, Inspector, persistence, and signaling paths as third-party modules.
