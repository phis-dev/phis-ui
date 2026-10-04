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
- visual treatment: padding, and the Surface.

The shared fields are:

- `padding`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`
- `surface` -- what the Layout's box looks like (see [Surface](#surface))
- the shared renderable-block geometry, visibility, access, and transition fields

Layout-family plugins add only topology-specific or explicitly family-specific fields. A family must
not duplicate shared parsing or serialization, and it never declares chrome of its own.

The Split Card is two cards on the golden ratio (`components/layouts/split-card-geometry.ts`), and its
Surface is the cards': each card draws the edge, corner, depth, pane and mode (`PhiSplitCardHalf`). The
Background runs once across both cards and shows only inside them -- each card's ground layer is as wide
as the Split Card's content box (`100cqw`, the Split Card being the query container) and moved by the
card's own offset, so a picture or a gradient goes on behind the right card instead of starting again.
Around and between the cards the Split Card is transparent. A moving Background does not move there:
each card would move a copy of its own. Its fields are the Paddings panel -- `padding` outside, `gap`
between the cards -- and the Surface; a card has no inset of its own, so what stands in a half sets it,
usually a Layout with padding, as on the sign-in, registration, password reset, confirmation and contact
Pages.

The named looks a Surface can start from are plain values in `helpers/surface-presets.ts`:
`PHI_SURFACE_CARD` (container ground, quiet line, soft shadow) and `PHI_SURFACE_WASH` (the Theme's
quietest filling, no line, no depth -- the Form Widget's `wash` step in Surface values). A Preset writes
them, and the Inspector's style switch writes the same values -- None, Card, Wash, and Custom once they
were changed; nothing stores their names.

Canonical defaults are neutral: no margin, no padding, and no Surface -- so no ground, no line, no
corner, no depth. The Split Card is the one exception: it stands with `padding` and `gap` at the base
step, because two cards flush against each other and the Region's edge are not a split anybody means, and
it is created wearing `PHI_SURFACE_CARD` (`PHI_SPLIT_CARD_LAYOUT_CREATION_CONFIG`). The Surface is a
creation value, not a default: a default is put back under a node that states nothing, so an author who
took the cards away would get them back. A Layout never adds implicit inner padding around its slot content; a Region that
needs padded composition configures padding on its Layout or on the Region itself. A first-party creation preset may provide an initial visible-container configuration,
but creation presets are input to the node factory only. Their values are materialized as normal
Layout config and the preset name is never persisted or interpreted at render time.

### Surface

A Surface (`types/surface.ts`, `PhiSurface`) is one object for every box that has a look -- a Layout, and
in the same shape a Region, an Overlay and a Widget:

- `background` -- the structured Background config, including its `filter` (see
  [Background filter](#background-filter)) and its motion;
- `borderSource` and `border` -- where the line comes from, and the line with its four corners;
- `shadow` -- a semantic id (`none`, `soft`, `strong`) or `{ kind: "custom", value: "<box-shadow>" }`;
  presets store the id, not CSS;
- `tone` -- the mode the box and its content are drawn in (`inherit`, `light`, `dark`, `inverse`; see
  [Surface tone](#surface-tone)).

Padding is not part of it, because how far content stands from the edge is geometry; nor are a block's
`effects`, which say how it arrives. A Surface that states nothing reads as absent (`readPhiSurface`).

It is drawn by one resolver, `resolvePhiSurfaceStyle` (`helpers/surface-style.ts`), and every Layout goes
through it in `resolvePhiBaseLayoutChrome`. The resolver answers the box style and, when the paint needs a
layer of its own -- a softened or moving picture -- the ground the Layout renders as its first child with
`PhiSurfaceGroundLayer`. No second path decorates a Layout from outside: the Builder hands the Surface to
the Layout like any other prop, so the Canvas draws what the page will.

A Widget's Surface is the node's `config.surface` as well, and who draws it is the Widget plugin's
`surface` metadatum (`PhiSurfacePolicy`):

- `frame` (the answer when a plugin says nothing) -- the slot frame draws it on the box the Widget sits
  in, with the same resolver, the same corner fallback as a Layout and the same ground layer;
- `own` -- the Widget reads `config.surface` and draws it itself, for a Widget whose ground has to live
  inside its own box (a card whose picture zooms under the pointer);
- `none` -- the Widget has no Surface, and the Inspector offers none.

A Layout's slot frame never draws a Surface: the Layout draws its own, and a second ground under it would
double every pane and every shadow. The renderer reads the policy from the runtime registry
(`widgetSurfacePoliciesByType`), the Builder from the Widget's client definition; neither branches on a
Widget type.

A Layout answers the Surface Signals ([SIGNALS.md](./SIGNALS.md)) although it draws its Surface itself.
The Signals reach its slot frame, which keeps what they set in the block runtime and hands the result to
the Layout through `PhiLayoutSignalSurfaceProvider` -- only once a Signal has changed something, so the
Layout's config (in the Builder, the draft) stays the answer until then. A Layout that renders on the
server takes it through its root box, `PhiLayoutSurfaceBox`, which draws the server's style unchanged and
swaps only the Surface's part once a Signal arrives; a Client Layout asks `usePhiLayoutSignalSurface`
directly. Every Layout root is one of the two -- a Layout that draws its root as a plain element does not
answer.

### Surface tone

`tone` draws a Surface's box and content in a mode of its own: `light`, `dark`, or `inverse` -- the other
mode than the page's, read against the page and not against the nearest Surface, so every inverse Surface
on a page is the same mode. `inherit`, the default, is never stored.

- The box carries a fixed class per tone (`phi-tone-light`, `phi-tone-dark`, `phi-tone-inverse`, from
  `resolvePhiSurfaceStyle(...).className` or `resolvePhiSurfaceToneClassName`), so the server writes it
  without knowing the mode. `styles/layout.css` gives that class its text colour again, because text
  inherits the colour the page computed, not the variable.
- `PhiSurfaceTone` stands around the box's content (it draws no element). When the content is not yet in
  the asked-for mode, it loads the tone scope (`components/surface/phi-surface-tone-scope.tsx`) -- Ant
  Design's Theme for that mode with its variables written under the box's class, and the house config
  (`usePhiConfig`) with that mode's tokens. The scope is code-split and rendered on the server like the
  rest of the page. When the content already is in that mode, nothing is mounted: the class then has no
  variables of its own and the content inherits the right ones.
- Both modes come from the root (`PhiThemeToneSourceProvider` in the live Theme provider), which resolves
  them anyway for the mode switch; no Surface resolves a Theme of its own.
- The slot frame does this for a Widget whose Surface it draws, `PhiLayoutSurfaceBox` and the Client
  Layouts for a Layout, the Region renderers for a Region, the Builder's structure Region for the draft.
  An Overlay's Surface does not take a tone yet: its box is the Drawer's or Modal's own.
- A Region's Shell ground and a Layout's own chrome that is painted from JavaScript tokens read the page's
  mode; a tone changes what the Surface paints and what stands inside it. A Surface that changes its mode
  without a ground of its own lets the page's ground show through under the other mode's text.

### Where a Surface's outline comes from

`borderSource` is `none`, `theme`, or `custom` (`types/cms-border-source.ts`).

- `theme` draws the Site's own line: its border colour at its line width, so it follows the Theme rather
  than copying it.
- `custom` draws the configured `border`, and is the only source that reads a configured corner. Under the
  other two the corner comes from the Control shape's surface step
  ([THEME.md](./THEME.md#control-shape)), so switching to `theme` or `none` shows the shape at once.
- `none` draws no line and states so, rather than saying nothing: the style is laid over one that may
  already carry a line.

A Surface that states no source is read by `resolvePhiCmsBorderSource`: a configured LINE means `custom`,
everything else means `none`. A radius alone is not a line. The rule is stated once and read by the
drawing and the Inspector, which is what keeps them from disagreeing.

A corner nobody stated is the Site's surface step for a Layout (`PHI_LAYOUT_SURFACE_RADIUS`), applied as
four longhands; a Layout without a Surface states no corner. This is the only thing that decides a
Layout's outer edge. A Layout family never draws a frame of its own -- the Collapsible's `ghost` governs
the INSIDE, whether its panels are separate objects or a flat list, and says nothing about the edge around
them. Its grounds state no corner at all: the Layout box has one and clips them to it, because a clip only
takes away and a ground rounded more tightly than its box would never be reached.

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

### Background filter

A Background carries one optional `filter` (`types/layout-style.ts`, `PHI_BACKGROUND_FILTERS`): `glass`,
`haze`, or `blur`. It acts on the Background, never on the content of the box that carries it.

- `glass` and `haze` are panes: a `backdrop-filter` on the box frosts what lies behind it, through a ground
  thinned from the Base colour. They need a Base there is something to thin, so they are neither offered nor
  rendered over an image or a gradient.
- `blur` softens the paint itself -- a picture, a gradient, a pattern or noise; a flat colour softened is the
  same colour, so it is neither offered nor rendered there. A filter on the box would soften the content with
  it, so the paint moves onto a layer of its own: `PhiSurfaceGroundLayer`
  (`components/surface/phi-surface-ground.tsx`) for a still paint, rendered on the server, and the motion
  layer for a moving one, which carries the same softening. `resolvePhiBackgroundWidgetStyle` never puts
  `blur` on the element; a surface that has no ground layer draws the paint unsoftened.
- There is no darkening filter. A `color` Overlay at an opacity darkens or tints, and its colour and strength
  are the author's.

A stored value the Background cannot render resolves to no filter without being rewritten
(`resolvePhiBackgroundFilter`), and the Control offers only what the current Background can render
(`phiBackgroundSupportsFilter`). A surface narrows the offer with `filters` the way it narrows
`motionModes`: the Shell Chrome Overlay offers the two panes, the Theme Root Background none.

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
- a `surface` (see [Surface](#surface));
- `padding`, `paddingTop`, `paddingRight`, `paddingBottom`, and `paddingLeft`.

Region padding is applied to the Region root and is independent of root-Layout padding. It is stored
flat in the Region config, parsed through the shared padding value rules, and edited as a Region
property. The Builder must not synthesize a Layout solely to represent Region padding.

A Region reads its Surface with two differences that belong to Regions. A `theme` edge is the separator --
the Site's line on the side that faces the Page: below a Header, above a Footer, on the inner side of a
Sider, all round any other Region; `custom` draws the configured border as it says. A Region states no corner
of its own otherwise, because it spans its part of the frame. And a glass pane on a Region without a ground of
its own frosts the Region's Shell ground (SHELL.md). A Region without a Surface renders no border: separators
are never implicit, and Canvas outlines belong to Builder scaffold chrome only. Static and client-enhanced
Region renderers resolve chrome through the same Region-shell resolver, and both mount the ground layer a
softened paint needs.

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
- A Layout in the editor draws exactly one insert affordance, at the next free `slotIndex`, and draws it
  itself. There is no insert between the items: the base layout offered one after every slot, which made
  the count grow with the children and turned an empty trailing entry of the slots array into a position
  of its own. A fixed-slot Layout marks its empty slots instead, which is the same one-per-place rule.
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
- Regions, Layouts and Widgets edit their Surface with one `PhiSurfaceControl` (background including image
  motion and filter, border source and border, shadow). The motion fields appear only when the selected
  Background owns an image.

## Sizing and nesting

- Every Widget and Layout definition states its own `slotSizePolicy`; it is a required field, not a
  default to fall back into. Layouts state `fill` where they fill, Widgets `intrinsic` where they are
  their content, and a Layout that sizes like a Widget says so -- Three Column states `fill-inline` and
  is placed in its slot rather than stretched by it. A child is treated by its policy alone: nothing
  below the definition asks again whether it is a Widget or a Layout.
- Layout depth counts actual Layout nodes only; visual config never adds depth.
- The Canvas, preview, and published runtime must derive sizing from the same declared policies.
- Responsive behavior belongs to the Layout that knows the actual slot geometry, not to a global
  viewport heuristic. A `compact | medium | wide` profile is measured against the block's own width on
  the container-breakpoint scale (theme/phi-container-breakpoints.ts), never against the viewport --
  one meaning of the three words across Grid, Form and block geometry. A block that really hangs on the
  window says so in `vw` units, not with a second set of profiles.
- The anchor is read once. `resolvePhiPlacement` (components/layouts/phi-layout-contract.ts) answers
  `{ inline, block }` in `start | center | end | null`, takes the anchor as either the nine placements
  or the `{ horizontal, vertical }` pair, and takes a slot role as a modifier on one axis -- the outer
  columns of a three-column Layout do not listen to the anchor, an overlay in the right-hand role reads
  it mirrored. `phiFlexPlacementWord` and `phiGridPlacementWord` spell the answer; `null` means the
  anchor said nothing and the Layout's own value stands, which is not the same as the middle.
- A Layout kind declares its default anchor where kinds are declared, never in the component that draws
  it. A kind that declares none keeps "no anchor", which stretches and starts.
- Every slot states all four placement margins from its own placement, `0` included
  (`resolvePhiSlotPlacementMargins`): `--phi-slot-inline-margin-start`/`-end` and
  `--phi-slot-block-margin-start`/`-end`. A child stretched to its slot and capped by a maximum is
  placed by the auto margins it reads off them, and custom properties inherit: a slot that states none
  hands its child the placement of whatever Layout stands above. An auto margin places a box only where
  its parent is a flex or grid container -- in block flow `margin-block: auto` computes to `0`, while
  `margin-inline: auto` still centres a box of a definite width.
- A box that caps itself inside a Widget reads the same four properties, through
  `PHI_SLOT_INLINE_PLACEMENT_MARGIN_STYLE` and `PHI_SLOT_BLOCK_PLACEMENT_MARGIN_STYLE`. The slot child
  frame is not always where the width is decided -- the Form Widget caps its fields so that the cap is
  the measure the fields read, which leaves the frame filling the slot -- and a frame with no room left
  over places nothing. Both boxes may read the properties: at most one of them has room, and the other
  one's auto margins come to nothing. Read them through the two constants rather than by name, so the
  `, 0` fallback cannot be forgotten.

### Block geometry is read once

`size`, `minSize` and `maxSize` (CMS.md, renderable blocks) reach CSS through one reader,
`resolvePhiRenderableBlockGeometry` (types/renderable-block-geometry.ts). It reads a block's config once
and answers per axis -- `inline` and `block`, each with `size`, `min` and `max` -- as CSS lengths decoded
by unit, and it states whether the block decides an axis for itself (`explicitInline`, `explicitBlock`),
which is what flips a slot policy from `fill` to `fixed`.

Each of the six lengths may name a value per profile (`PhiResponsiveLength`, on the house
`PhiResponsiveValue` with the smaller-to-larger cascade). The answer above is then the `compact` one --
the base, what stands without a container query -- and the other two are in `profiles`, present only
where a field names more than one. An axis counts as explicit where *any* profile names a size: a slot
policy and the attribute that carries it are resolved once on the server, and CSS can vary a width but
not an attribute, so the profiles vary the value rather than the policy. `collapsedSizeHint` stays
plain. Nothing writes the profile answers to CSS yet; that is
[design/RESPONSIVE_BLOCK_GEOMETRY.md](./design/RESPONSIVE_BLOCK_GEOMETRY.md). A collapsed block measures by its
`collapsedSizeHint` where it has one; that substitution is the reader's too.

- A bare number is a pixel length, because that is how the vocabulary stores one (`PhiCssLength`); a
  string on the vocabulary is decoded and written back canonically; a keyword or an expression
  (`fit-content`, `calc()`) passes through as written, undecoded. A reader that has to know whether a
  maximum is absolute asks the decoded unit, never `typeof`.
- A maximum is capped at the slot only where the slot is a room the child does not decide. The frame
  writes `max-width: min(100%, ...)` for a maximum in a length that measures something other than the
  slot (`px`, `em`, `rem`, `vw`, `vh`), and only for a child that fills or is fixed on the inline axis
  (`resolvePhiSlotChildInlineMaximum`). An `intrinsic` child's maximum is written plain: it is
  `width: fit-content` and often stands in a box that shrinks to fit it, so the `100%` is a percentage
  of a width being computed from the child itself -- and a math function cannot behave as `none` the way
  a plain percentage does, so the browser drops the declaration and the maximum with it. A `%` maximum
  and an undecoded expression are plain everywhere, and the block axis takes no cap at all: a percentage
  height is measured against a containing block that is `auto` in the ordinary case. Every other box
  that writes a maximum -- a Layout's inner box, the Region shell, a Flex slot wrapper -- gives the room
  rather than standing in it, and writes the maximum as it stands.
- An absent value is not answered with a size. Neither the slot child frame nor a Layout's inner box
  writes one: the frame carries the child's policy, and `styles/layout.css` fills the box from it
  (`.phi-slot-child--inline-fill > *`, `.phi-slot-child--block-fill > .phi-layout`). Where a Layout is
  rendered outside a frame, the element standing in for the frame states the same fill in CSS -- the
  Builder's edit scaffold drawer is the one such place. What remains a caller's own fallback is a value
  no policy can supply: a sider takes the Theme's width. The reader does not decide any of it a second
  time.
- A scaffold does not restate what its frame already writes. The Builder root scaffold's slot is a slot
  child frame, so its width, height, minima and maxima are inline on the element, and the custom
  properties the scaffold once wrote for the same six declarations could never win against them. What
  it writes now is what the frame does not: `--phi-root-scaffold-flex`, because a root that states a
  size must stop flexing, and the stated width and height for the server preview, which builds its
  frame without the root's config.
- A Widget may state a block base of its own, and it states it in `defaultConfig` -- never in its
  parser. The three readers of that declaration are the Builder, which writes it into a node it
  creates, the Inspector, which shows it under the node it edits, and the render path, which merges it
  under a node that states nothing (`widgetBlockDefaultsByType`, built with `stripRenderableBlockDefaults`
  so only what a Widget says beyond the house answer is inherited). The merge is shallow, per key: a
  node that states `maxSize` owns `maxSize` whole. A parser that fills the same field in instead reaches
  only the Widget's own render, and the slot frame -- which is what draws the block -- never sees it:
  that is how every Form a Preset placed rendered uncapped while the same Form dropped in the Builder
  carried its cap, back when the Form's cap was a block base at all. It is not any more: a Widget that
  draws a box inside its block has to cap the fields rather than the block, because a block cap hands
  the inset the width the content was promised ([FORMS.md](./FORMS.md)). Only the block base is inherited; a Widget's own fields stay with its parser, because
  a Segmented's field key or a Table's source would change what a Preset means rather than how wide it is.
- Nothing else reads the three fields by name. `scripts/validate-block-geometry-readers.mjs` names every
  file that draws geometry and checks that it imports the resolver, names every file that touches the
  fields without drawing them with the reason, and fails an entry nothing uses any more. Since a Widget
  states its block base rather than inventing it, no Widget parser is on either list.

### Grid slot placement

`PhiGridLayout` owns one 24-unit logical grid. Every populated slot may declare presentation-only
placement with a responsive `span` and `offset`, using the shared `compact`, `medium`, and `wide`
profiles. `span` is an integer from `1` through `24`; `offset` is an integer from `0` through `23`,
defaults to `0`, and counts unused columns before the slot in flow: slots stand in source order from the
logical inline start, each after the one before it, and a slot that no longer fits starts the next row
(`resolvePhiGridSlotColumns`). `offset + span` must not exceed `24` in any profile that states a span.
Responsive values use the shared smaller-to-larger cascade.

A slot that states no span takes the profile default, `PHI_GRID_LAYOUT_DEFAULT_SPAN` -- 24 at `compact`,
12 at `medium`, 6 at `wide`: the whole row where there is no room to share, two abreast in the middle,
four where the Grid is at least as wide as the content column. It was one constant for all three
profiles, so a Grid whose slots carried no authored span never reflowed -- four abreast at 320px and at
1600px alike, only narrower, because the tracks are `minmax(0, 1fr)`. Because the `compact` default fills
the row, an offset has nothing to push into there and is clamped away; that is also why the rule above
is stated of the profiles that name a span, rather than of an invented one.

`gap` is the distance between slots on both axes; `columnGap` overrides it on the horizontal one and is
what a Grid states that holds its rows apart and its columns flush. `gap` used to reach `row-gap` alone
while only `columnGap` had a field, so the vertical distance was whatever a default or a preset had
written and no operator could reach it.

The column gap falls between slots, not between tracks. The 24 tracks are flush (`column-gap: 0`) and
each slot insets its content by its share of the gap (`resolvePhiGridSlotGapShares`): a slot on line `s`
spanning `n` tracks takes `(s - 1) / 24` of a gap before it and `(25 - s - n) / 24` after, so two slots
side by side hold exactly one gap between them and every edge stands where a `column-gap` put it. A
`column-gap` fell on all 23 track boundaries whether a slot ended there or not, which made `23 x gap`
(368px at 16px) the narrowest a Grid could be; below it the Grid ran over its box. Now a Grid without
that room narrows its slots instead. The Builder's track guides take the same shares.

The effective profile is resolved from the Grid Layout's own inline size -- its content box, inside its
padding, the width the tracks have -- on the same shared Phi thresholds as responsive Forms
(`PHI_GRID_RESPONSIVE_MIN_WIDTH`, 377 and 610), never from the browser viewport. It is resolved in CSS,
not measured: every slot carries its columns and gap shares for all three profiles as custom properties
(`resolvePhiGridSlotColumnProperties`), the Grid's Layout box is the `phi-grid` query container, and
`@container phi-grid` rules in `styles/layout.css` pick one set -- the Form grid's arrangement. So the
server's markup already stands where it stays; a `ResizeObserver` answered after hydration before, and
every Grid was delivered at `compact` and rebuilt. Runtime, preview, and Builder therefore resolve the
same placement when the Grid is mounted in a Page, Modal, Drawer, Inspector, or nested Layout slot; a
nested Grid answers to its own box, the nearest `phi-grid` container.

The Grid's outer element is its Layout box (`.phi-layout`); the Builder's track guides are drawn inside
it rather than beside it in a wrapper, which kept the fill rules (`.phi-slot-child--block-fill >
.phi-layout`) from ever reaching a Grid. Being a size container, the Grid's width cannot come from its
content: it takes the width its slot gives, as its `fill` policy says. Slot source order remains the logical, focus, accessibility, and authoring order;
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

### Stack slot display

`slotDisplay: "single" | "stacked"` decides whether the Stack is a sequence or a pile, and defaults to
`single` -- one slot stands in the box and the rest wait, which is everything the section below
describes. `stacked` draws every populated slot in that same box, in slot order, so the last one lies on
top; the first one stays in normal flow and owns the Stack's natural size, the rest are taken out of flow
over it. Every layer stays reachable, and the topmost takes the pointer where they overlap.

A pile does not pick a slot, so `defaultActiveSlotKey`, `mountPolicy` and the three transition settings
describe nothing and are neither read nor offered in the Inspector. Everything is mounted. Slot signals
still emit, and the persisted child topology is the same one `single` reads -- switching between the two
is a presentation change and never touches content. Builder edit rendering stays on the slot editor in
both modes: a pile has no way to say which layer a dropped Widget belongs to.

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
