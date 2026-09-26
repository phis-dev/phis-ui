# Responsive block geometry design

Every renderable block states `size`, `minSize` and `maxSize` as one value per axis, and that value is
the same in a 320px column and in a 1600px Region. This document is the design for letting a block name
a value per profile. It is not built, and building it changes `PhiRenderableBlockBase`, so it requires
operator approval.

The decision it rests on is recorded in [TODOS.md](../TODOS.md) under "One resolver for block geometry":
**a profile is measured against the room the block is offered, and CSS decides it -- nothing measures.**

## Why CSS and not a ResizeObserver

`resolvePhiRenderableBlockGeometry` is a pure function and runs on the server, where no width exists. It
cannot pick a profile; it can only hand all of them over and let the room choose. Measuring would mean
every responsive block is delivered at one profile and corrected after hydration -- the state the Form
was rebuilt out of, and the state the Grid is still in.

Two prices come with that choice, and they are not details.

**One pair of thresholds for all blocks.** A container query cannot read a custom property in its
condition -- `@container (width >= var(--x))` is not a thing -- so the widths stand literally in the
stylesheet. "Which pair a block picks is the block's own business"
([theme/phi-container-breakpoints.ts](../theme/phi-container-breakpoints.ts)) therefore cannot hold for
block geometry: it takes one pair off the house scale and every block switches at the same two widths. A
Form and a Grid keep their own pairs, because each writes its own rules; geometry has one rule for
everybody. The pair is **377 and 610** (`PHI_CONTAINER_BREAKPOINT_COL3` and
`PHI_CONTAINER_BREAKPOINT_CONTENT`), the same two the Grid already switches at, so `compact | medium |
wide` means one thing across the tree.

**The container is the box that offers the room, never the block itself.** `container-type: inline-size`
brings inline-size containment, and a box whose inline size may not depend on its contents cannot be
`width: fit-content` -- which is exactly what the slot child frame writes for an `intrinsic` child. So
the declaration goes one box out and the child queries it by name. That also settles the circle the
first decision left open: what is asked is the offered room, which stands before the block answers,
rather than the block's own width, which is what the answer changes.

## The stored form

The house form for a profile value already exists and is used by the Grid for `span` and `offset`:
`PhiResponsiveValue<TValue>` in [types/responsive.ts](../types/responsive.ts), with the cascade
`compact -> medium -> wide`. Nothing second is put beside it.

```ts
/** One length, at one profile or at all of them. */
export type PhiResponsiveLength = number | string | PhiResponsiveValue<number | string> | null;

/** Unchanged: what a Signal sets and what the dimension control edits. */
export type PhiRenderableBlockSize = {
  width?: number | string | null;
  height?: number | string | null;
};

/** How a block stores it: each axis may name a value per profile. */
export type PhiRenderableBlockResponsiveSize = {
  width?: PhiResponsiveLength;
  height?: PhiResponsiveLength;
};
```

`size`, `minSize` and `maxSize` on `PhiRenderableBlockBase` take the responsive pair.
`collapsedSizeHint` stays plain -- a collapsed block is not laid out, one substitute measurement is
enough. The Signal value types ([types/signals.ts](../types/signals.ts)) and `readPhiDimensionValue`
([types/dimension.ts](../types/dimension.ts)) stay on the plain pair: a Signal names a length, not a
profile, and setting one replaces that axis at every profile.

**The profile sits on the leaf, not on the field.** The alternative,
`size?: PhiResponsiveValue<PhiRenderableBlockSize>`, makes an author restate a height that never changes
and turns `size` into a union of two object shapes that have to be told apart by their keys. On the leaf,
every stored config stays valid byte for byte and means "the same at every profile", and the axis stays
the unit an author thinks in -- usually exactly one of the two varies. The risk that a reader now meets
an object where it expected a number is carried by the consolidation: there is one reader, and
`scripts/validate-block-geometry-readers.mjs` holds it to that.

## What the resolver returns

Existing readers must not notice. `geometry.inline` and `geometry.block` stay exactly as they are and
are the **base answer** -- `compact`, what stands without a container query.

```ts
export type PhiResolvedBlockGeometry = {
  inline: PhiResolvedBlockAxisGeometry;   // the base, as today
  block: PhiResolvedBlockAxisGeometry;
  explicitInline: boolean;                // any profile names a width
  explicitBlock: boolean;
  /** Only where a field names more than one profile. */
  profiles: {
    medium: { inline: PhiResolvedBlockAxisGeometry; block: PhiResolvedBlockAxisGeometry };
    wide: { inline: PhiResolvedBlockAxisGeometry; block: PhiResolvedBlockAxisGeometry };
  } | null;
};
```

`explicitInline` is "any profile names a width", because a data attribute and a slot policy are resolved
once on the server and CSS can vary a width but not `data-phi-layout-explicit-width`. "Explicit" is
therefore a property of the block as a whole: the profiles vary the value, not the policy.

The cascade runs upward from `compact`, so a block that names only `wide` has no stated width below 610
and is `auto` there. The Inspector control asks narrow first for that reason.

## The rule that makes it work

**An axis is written inline or in CSS, never both.** An inline style beats every `@container` rule --
that is the defect the Builder root scaffold was carrying until the custom properties it wrote were
removed. So for an axis with profiles the frame writes no `width` inline; it writes the three values as
custom properties and a static rule plus two `@container` blocks choose. For an axis without profiles
nothing changes and the value stays inline.

```css
@container phi-slot (width >= 377px) { … width: var(--phi-block-width-medium) … }
@container phi-slot (width >= 610px) { … width: var(--phi-block-width-wide) … }
```

The properties are written only where the block states them, so a rule never reads an empty variable,
and a block that names no profile writes nothing and matches no rule -- it pays nothing for the feature.

## What it touches

1. `types/responsive.ts`, `types/renderable-block.ts` -- the two types above.
2. `types/renderable-block-geometry.ts` -- the resolver reads the responsive leaf and adds `profiles`.
   Nothing else reads the three fields.
3. `types/cms-config.ts` -- normalisation and validation for a responsive length, beside
   `readGridResponsivePlacement`, which is the same shape one level down.
4. `plugins/runtime/phi-slot-child-frame-view.tsx` and `plugins/runtime/slot-size-policy.ts` -- the frame
   omits an axis it hands to CSS and writes the properties instead. The cap rule
   (`resolvePhiSlotChildInlineMaximum`) applies per profile, by the same test.
5. `styles/layout.css` -- the static rules and the two `@container` blocks.
6. The boxes that offer the room -- the Layout slot wrapper, the Layout box, the Region shell -- declare
   `container-type: inline-size; container-name: phi-slot`, and only where the block they hold names a
   profile (see "Only where it is needed").
7. `components/controls/phi-geometry-control.tsx` -- a per-profile field, narrow first.
8. Presets and `types/cms-presets.ts` -- the same widened fields, no preset changes required.

## Only where it is needed

The container does not have to be declared across the tree. The resolver knows while rendering whether
a block names profiles at all (`profiles != null`), and a Layout can learn that about its child the way
it already learns the child's sizing, through `resolvePhiSlotChildSizing`. So the offering box carries
`container-type` only where the block standing in it actually asks a question -- a data attribute on the
slot, and one rule in the stylesheet that turns it on.

That is worth the extra step, because containment is not free and everything under "What it costs"
below then applies to the blocks that use the feature rather than to every block in the tree. A page
that names no profile anywhere is byte for byte the page it is today.

## What it costs elsewhere

`container-type: inline-size` is a shorthand for three containments at once: layout, style and
inline-size. Paint containment is *not* among them, so nothing is clipped -- a child may still overflow
its box, which is the usual fear and not the problem here.

**Layout containment** is the one to weigh. It makes the box a containing block for absolutely *and
fixed* positioned descendants, it makes it an independent formatting context, and it makes it a stacking
context.

The stacking context is mostly a gain: a `zIndex` authored in one block stops competing with the rest of
the page, which is what one wants where blocks are authored independently. What it costs is that nothing
inside can leave any more -- no value is high enough, because the whole container occupies one place in
its parent's order and its contents are painted there atomically. Concretely: a menu or popover inside
block A used to be painted with the positioned elements of the root, above a later sibling block B; with
A a stacking context it is painted with A, and B, coming later, covers it.

That only bites where such a thing is rendered *inside* the block, and the tree is already built so
that it is not. Overlays leave the subtree: Modal and Drawer go through Ant Design's default portal to
`body`, and no `getContainer` is set anywhere in this repository -- an Overlay rendered inline
(`getContainer={false}`) would be the case to watch for. Tooltips, Dropdowns and Selects are the same
by default, and where this repository names a container it names one helper,
`getPhiWidgetScaffoldPopupContainer`
([components/widgets/client/shared/phi-widget-scaffold-popup.tsx](../components/widgets/client/shared/phi-widget-scaffold-popup.tsx)),
which answers `document.body` and only inside a Shadow Root falls back to `[data-phi-root-layout]`.
Two places render into the trigger's parent on purpose
(`components/controls/phi-color-control.tsx`,
`components/widgets/client/html-editor-image-node.tsx`); both already sit inside a popover of their own.

So this is a rule for new code rather than a repair of old: **a popup that can stand inside a block
belongs in a portal**, and `getPopupContainer` is never pointed at a node inside the block tree. Two
things follow for the container declaration itself -- the root layout node (`[data-phi-root-layout]`)
must never become a size container, because the Shadow Root branch anchors there, and neither must
anything above it.

`position: fixed` is the sharper half, because it has no `zIndex`-like dial: a fixed element inside a
container is re-anchored to that container geometrically. `components/root/phi-root-background.tsx` is
the one such element today; it sits above every slot, and that is the sort of thing to walk through
before the declaration spreads.

Style containment scopes counters and quotes to the box, which matters only for a numbering meant to run
across blocks.

## What this does not do

- No viewport profiles. A Modal that genuinely hangs on the window says so with `maxSize` in `vw`, not
  with a second profile system. The Overlay's `{ xs, md, lg }` handed to Ant Design is what goes, once
  the Overlay adopts block geometry -- which follows this, not the other way round.
- No per-block thresholds, for the reason above.
- No profile for `collapsedSizeHint`, `anchor`, padding or gap. Those are separate cases and each would
  need its own argument.

## Order

The resolver and the types first, with the frame still writing exactly what it writes today for a block
that names no profile -- that step moves no pixel and can be verified as such. Then the container
declarations and the stylesheet, then the Inspector control. The Grid's missing per-profile default
(`PHI_GRID_LAYOUT_DEFAULT_SPAN`, one constant for all three profiles) is a separate item in TODOS.md and
uses the same `PhiResponsiveValue` form; it is not a dependency in either direction.
