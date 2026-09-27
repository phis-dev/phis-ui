# Open work

Open work only, grouped by area. Binding contracts live in the contract documents; designs live in
[design/](./design/README.md). A contract extension named here still needs operator approval before it is
built. Remove an entry when it is done.

## Code hygiene

- **One dead export left, and it is the interesting one.** `usePhiAssetCollectionRuntime`
  (components/media/asset-collection-runtime.ts) has no caller anywhere, but
  `scripts/validate-media-space-contracts.ts` reads its source and pins the guarantee that *a Collection
  request without a bound provider surfaces as an error, never as an empty gallery*. Deleting the hook
  takes the guarantee with it and the check fails, which is the check doing its job. So the question is
  not whether the export is used -- it is where that guarantee belongs now that the Media Picker binding
  and the Collection View binding each answer the same question for themselves. Decide that, then move
  the assertion and drop the hook.

  The rest of the sweep is done. Two findings worth keeping. **The public barrels are not an add-on
  surface**: `@phis/ui` ships types and functions for Modules, not for Add-ons, so a name sitting behind
  `export *` in helpers.ts, types.ts or constants.ts is not thereby public API -- nothing chose it, the
  wildcard swept it up. **A sweep grows as it runs**: removing `isApiV1Path` and `isMedusaApiPath` left
  `API_PATHS` and `MEDUSA_API_PREFIXES` with no reader, and removing `canAccessPage` left
  `PageAccessInput`; each removal has to be re-scanned after the one before it, not planned in one list
  up front.

  `helpers/cms-config-serialization.ts` came out of it holding one function that forwards to
  `mergeRenderableBlockDefaults` under another name. Worth folding into its single caller,
  `components/widgets/config/parser-primitives.ts`, rather than keeping a file for a rename.
- **Convert concrete preset builders to local-key templates.** Some first-party preset builders still
  return concrete trees with synthetic ids (for example
  `components/regions/presets/phi-default-site-area-preset-tree.ts`), so the central instantiator is not
  yet the only node-construction authority.

## Layouts and Widgets

- **Block geometry: the rules each reader kept, now settled one at a time.** The move is done: one
  reader, `resolvePhiRenderableBlockGeometry` (types/renderable-block-geometry.ts), and a guard that
  names who draws geometry and who merely touches the fields (`scripts/validate-block-geometry-readers.mjs`;
  LAYOUTING.md, "Block geometry is read once"). No pixel was meant to move, and each reader's own
  fallback stayed at its call site. What remains is the list of rules that were preserved verbatim
  because settling them moves pixels, plus what the move turned up.

  **Rules still stated per caller, each its own change:**

  - (a) is settled: nobody answers an absent size with a size. `resolvePhiLayoutBoxStyle` writes only
    what the block states, the frame's policy classes fill the box (`.phi-slot-child--inline-fill > *`,
    `.phi-slot-child--block-fill > .phi-layout`), and the one place that renders a Layout without a
    frame -- the Builder's edit scaffold drawer, for a Structure Region root -- states the same fill in
    CSS. With it, `slotSizePolicy` became a required field on every Widget and Layout definition, so a
    child is treated by its policy alone and `intrinsic` now means intrinsic for a Layout too (it used
    to fall through to the kind's default, which for a Layout is the opposite answer).

    The eight Layout clients that wrote `width: 100%; height: 100%` into their own container by hand
    are done too, and the sequence slot editor with them. Two things the sweep turned up: the Stack and
    the Carousel box carried no `phi-layout` class at all, so the fill rule for the block axis could
    never have reached them -- their own `height: 100%` was covering for a missing name, and they are
    named now. And the Region stack in `phi-cms-layout-renderer.tsx` is the one Layout in the tree with
    no frame above it -- reached only when the renderer is asked for several Regions at once, which in
    the repo no caller does; it was handing in `size` and `maxSize` that the Flex Vertical client reads
    with nothing, and it states its fill in its own style now.
  - (b) is settled: a maximum is capped at the slot only where the slot is a room the child does not
    decide. `resolvePhiSlotChildInlineMaximum` (plugins/runtime/slot-size-policy.ts, beside the base
    style and tested with it) caps a maximum in `px`, `em`, `rem`, `vw` or `vh` at `min(100%, ...)` for
    a child that fills or is fixed on the inline axis; an `intrinsic` child's maximum is written plain,
    because there the `100%` is the cyclic percentage that takes the whole declaration with it -- the
    Markdown Widget's finding. A `%` maximum and an undecoded expression stay plain, and the block axis
    takes no cap: a percentage height meets an `auto` containing block as the rule rather than as the
    exception, so the cap would be the cyclic case by default.

    No pixel moved. Every maximum authored in the repo today hangs on a `fill-inline` or `fill` block --
    480 on the welcome measure and the login form, 400 on the four brand control panels, 610 on the
    settings panels -- so the cap still applies exactly where it applied; what changed is that an author
    who caps an intrinsic Widget is now obeyed. Markdown stays `fill-inline`, and not as a leftover: a
    text block takes the width it is given, which is what `textAlign: end` needs, and the HTML Widget
    and the Markdown TOC read the same. What the frame still cannot see is its parent -- a `fixed` child
    inside a shrink-to-fit box meets the same cyclic percentage and its stated width wins there, as
    before.

    The inventory turned up five further places that write a maximum into CSS, all of them plain:
    `resolvePhiLayoutBoxStyle`, the Region shell on the server and in the client, the Flex Layout's own
    slot wrapper, and the Structure Region preview. Those are boxes that give the room rather than boxes
    standing in one, so plain is the right answer for them --
    except the Layout's inner box, which restates its own frame's maximum one box further in. It is
    harmless there (it stands inside the cap) and load-bearing where a Layout has no frame, so it stays,
    recorded here rather than swept.
  - (c) is settled: the scaffold had no fallbacks to decide, because none of them could be seen. Its
    slot is a `PhiSlotChildFrame`, and the frame writes width, height, minimum and maximum inline from
    the root's own geometry -- `100%` where the root fills, `fit-content` where it is its content, `0`
    and `100%` for the constraints. The scaffold restated all six of those through custom properties
    read in `styles/layout-authoring-scaffold.css`, and an inline style beats a stylesheet, so the six
    declarations never applied once. The `100%`, `auto`, `0` and `none` behind them were unreachable,
    and so was the band the Structure Region handed down -- which that Region was already writing on
    the box one further out (`built-in.tsx`, the root body), where it does apply. So the general
    answers are the frame's and the scaffold has no exception to state; a Region that wants a band
    writes it on the box that gives the room.

    What stays is what the frame cannot say: `--phi-root-scaffold-flex`, because the frame writes no
    `flex` and a root that states a size must stop flexing, and the stated width and height, for the
    one caller that builds its frame without the root's config -- the server preview. Those two are
    written only when there is a size, so the declaration reading them never holds an empty variable;
    the attribute that gates it (`data-phi-layout-explicit-width`) has the same source as the value.

    One pixel does move, and on purpose. The server preview wrote `flex: 1 1 auto` inline beside the
    properties, which shadowed `--phi-root-scaffold-flex` and grew a root that had just stated a
    height. That inline value is gone and the property decides, the way it already did in the Canvas.
    The same call site also restated the frame's `minWidth: 0` and `minHeight: 0`; those are the
    frame's and are gone with it. And one more dead declaration went with the six: the slot's
    `align-self: stretch`. The frame states `align-self: auto` inline on purpose -- that is how a
    Layout's anchor keeps the placing of a child that caps its own width -- so a scaffold stretching
    its root would have been the anchor bug again, had the declaration ever applied.

    One value went out with the plumbing: the Structure Region's `resolvedRootBodyMinHeight`, the band
    a content Region kept for a root that states no minimum. It was computed for the scaffold alone and
    had no second reader, so it left with it. The box that gives the room still writes
    `minHeight: slotBodyMinHeight` -- the draft's own minimum, or its height, and nothing where the
    draft states neither. That is the rule speaking: a band nobody states is not a band the scaffold
    invents.
  - Then the responsive form, in the resolver alone; the readers never learn about profiles. With it the
    question the palette raises: if a block states a width at `wide` and not at `compact`, does its slot
    policy change with the viewport, or is "explicit" a property of the block as a whole?

    **Step one is built (2026-09-26): the stored form and the resolver.** A length may name a value per
    profile, the resolver keeps handing back the `compact` answer where it handed back the only answer
    before, and the other two stand beside it in `profiles`. Nothing renders differently: no container
    is declared, no stylesheet reads the properties, and the Control edits the base entry alone instead
    of flattening what it cannot show. What is left is the container declarations and the stylesheet,
    then the Control.

    **Decided (2026-09-26): CSS decides, nothing measures**, and the form is settled. Designed in
    [design/RESPONSIVE_BLOCK_GEOMETRY.md](./design/RESPONSIVE_BLOCK_GEOMETRY.md): the profile sits on
    the stored length (`PhiResponsiveLength`, on the house `PhiResponsiveValue` the Grid already uses),
    the resolver keeps handing back today's answer as the `compact` base and adds the other two beside
    it, and an axis with profiles is written in CSS rather than inline, because an inline style beats
    every `@container` rule. "Explicit" becomes a property of the block as a whole -- the profiles vary
    the value, not the policy. The container goes on the box that offers the room, never on the block,
    and the thresholds are 377 and 610 for every block, because a container query cannot read a custom
    property in its condition. Building it changes `PhiRenderableBlockBase` and needs operator approval.

    The one profile system that was built and fed by nobody is settled (2026-09-26): the Grid's
    fallback span is a profile value now, `PHI_GRID_LAYOUT_DEFAULT_SPAN` = 24 / 12 / 6, and it lives in
    `components/layouts/phi-grid-contract.ts` beside the placement it feeds rather than in the client,
    so it is tested with it. A Grid whose slots carry no authored span reflows: one per row below 377,
    two below 610, four above. It did not before -- four abreast at every width, only narrower, because
    the 24 tracks are `minmax(0, 1fr)` and shrink, and the wrapping that did happen was the cursor
    running past column 24 rather than an answer to the room.

    One rule moved with it. `readGridSlotPlacement` (types/cms-config.ts) invented a span of six to
    check `offset + span <= 24`; with a `compact` default that fills the row, repeating the default
    there would reject stored placements that state an offset and no span -- a rule the author never
    broke. The check is stated of the profiles that name a span, and an offset with no room is clamped
    by `resolvePhiGridSlotColumns`, as it always was. The Grid still measures itself with a
    `ResizeObserver`; moving that onto a container query belongs to the responsive form.

  **What the move turned up.** There were more than five readers. `helpers/css-length.ts` was a sixth
  interpreter, used by the Structure Canvas and the Builder sider width; the Structure Region slot
  appended `px` to a minimum height without asking what it was, so a `%` height there produced `50%px`
  and no minimum at all (now decoded). The `collapsedSizeHint` substitution was copied into six files
  and is the resolver's now. The three-column Layout declared `size`, `minSize`, `maxSize` and
  `collapsedSizeHint` in its client props and never applied them -- not even destructured. Settled
  (2026-09-26): it states them the way every other Layout does, through `resolvePhiLayoutBoxStyle`, the
  same call `PhiBaseLayout` makes first. This client draws its row itself instead of going through the
  base layout, which is how it came to miss the one thing the base box does. A three-column Layout with
  an authored width was whatever its slot gave it before, and only the frame above it held a maximum.
  `resolvePhiLayoutBoxStyle` now takes `PhiRenderableBlockGeometryInput` rather than a hand-picked slice
  of the Layout props, because the resolver behind it already accepts a `null` field and the two
  signatures disagreed about that.
  Two small changes of meaning that the guard makes deliberate: a blank string no longer claims an axis
  (`""` used to flip a slot policy to `fixed` while writing no width), and a `"240px"` string is now
  capped at the slot like the bare `240` that means the same thing.

- **Placing a child that does not fill.** Mostly settled (2026-09-26); what is left is written at the
  end of this entry.

  It was written four times. Every Layout translated the anchor into `justify-content`/`align-items`
  in its own words -- `resolvePhiFlexAxisAlignment`, `resolveAnchorAlignment`, the Grid pair and Three
  Column's own -- sharing nothing but `resolvePhiSlotCrossMargin`, and the four answers differed in
  three ways that are real and one that was not. The real ones: the spelling (`flex-start` against
  `start`), which axis is the main one, and a slot role that overrides or mirrors an axis. The one that
  was not: what an unstated axis means.

  Now there is one reading. `resolvePhiPlacement` (components/layouts/phi-layout-contract.ts) answers
  `{ inline, block }` in `start | center | end | null`, takes the anchor in both spellings it arrives
  in, and takes the slot role as a modifier on one axis (`mirrorInline`, `pinInlineStart`,
  `pinInlineEnd`). `phiFlexPlacementWord` and `phiGridPlacementWord` spell it; `phiPlacementFromWord`
  reads a word back, for a Layout whose author set `align` or `justify` directly;
  `resolvePhiSlotPlacementMargins` turns a placement into the four custom properties. All five call
  sites go through it and the four translators are gone.

  *The properties are named by the axis they write.* `--phi-slot-cross-margin-*` only ever wrote
  `margin-inline`, which is the cross axis of a column and the main axis of a row -- the Grid handed its
  `justify-content` to the same pair. Under that name nobody noticed that one axis had no properties at
  all. They are `--phi-slot-inline-margin-*` now, `--phi-slot-block-margin-*` exists beside them, and
  the frame reads all four.

  *And nobody invents a middle any more.* The Anchored Overlay answered an absent anchor with `center`,
  which quietly made it the place where four kinds got their default: Stack, Carousel, Split Card and
  Three Column all drew a centre they never declared. They declare it now
  (`PHI_CENTRED_SLOT_DEFAULT_ANCHOR` in layout-definitions.ts, passed by their plugins), so the same
  centre is readable in the picker and the Inspector, and an anchor that arrives absent at the overlay
  means what the house says it means: no anchor, which stretches and starts. No pixel moved.

  **What is left.** Writing the block-axis margins is not enough to make them work: an auto margin
  places a box only where its parent is a flex or grid container, and in block flow `margin-block: auto`
  computes to `0`. The Grid's own inner placement box (`resolveGridSlotPlacementStyle`) is a plain block
  box -- which is exactly why the *inline* margins work there, since `margin-inline: auto` does centre a
  block box of a definite width. So the block axis needs that box to become a flex column first, per
  Layout, and until then `resolvePhiSlotPlacementMargins` is called with `block: null` everywhere.
  Masonry is the other half: it has no anchor at all, no prop and no client, and forces `width: 100%` on
  every slot, so an intrinsic Widget there cannot follow one. Both are additive rather than
  consolidating, and each moves pixels where it lands.

  **Findings worth not rediscovering.**

  *A number is a unit, not a type.* `PhiCssLength` is `number | "<n><unit>"` and `serializePhiCssLength`
  stores a pixel length as a bare number and everything else as a string (`types/length.ts`). So
  `typeof value === "number"` in a reader means **"is an absolute pixel length"**, and the frame's
  capping is the correct rule -- an absolute maximum can be wider than its slot, a `%` or `ch` maximum
  is already relative to something. The guard refuses the `typeof` spelling outright.

  *`size` is two statements in one field.* It is a measurement, and it is the claim "I decide this axis",
  which flips the slot policy from `fill` to `fixed` (`resolvePhiEffectiveSlotSizePolicy`). The resolver
  makes that claim once (`explicitInline`, `explicitBlock`).

  *The medium is not symmetric.* A page is definite in width and indefinite in height, so `height: 100%`
  against an auto-height parent resolves to `auto` and a percentage `max-height` is treated as `none`.
  That is why the frame caps the inline axis and not the block axis, and it is the same asymmetry that
  hides the palette defect in the entry below.

- **The layout palette says nothing, and what it inherits is wrong.** A Layout's `slotSizePolicy` answers
  "when this Layout stands in someone else's slot, how does it size itself". Eleven of twelve Layouts
  answer nothing and inherit `fill` on both axes; only Three Column declares (`fill-inline`).

  Flex and Three Column are the same shape -- a row of slots -- and run different policies today for no
  reason anybody wrote down. And a vertical Flex is **not** the mirror of a horizontal one: mirroring
  would give it `inline: intrinsic`, which shrink-wraps a page column to its widest child, and
  `block: fill`, which resolves to `auto` and does nothing. Both axes of the symmetric answer are wrong,
  for the reason above -- width is definite, height is not.

  What the palette should say, on that reading: **`fill-inline` for Flex, Flex Vertical, Three Column,
  Grid, Masonry, Split Card, Content, Collapsible, Stack and Carousel** -- take the inline size you are
  given, be as tall as your content -- and **`fill` only for Page Region and Structure Region**, which
  genuinely fill a definite height. The default is the rare case today and the exception is silent.

  It has stayed invisible because `block: fill` is `height: 100%`, which does nothing wherever the parent
  height is auto. It bites only where a parent does have a definite height, and there it looks like a bug
  in the parent: two such were fixed on 24.09. (the Stack stage's height, and the anchor that ignored
  `bottom`). Widgets do not have this problem -- their default is `intrinsic`, which suits the controls,
  and 38 of 67 declare something else where it matters. The Layouts inherit an answer that nothing forces
  them to notice.

  This moves pixels wherever a definite height is in play, so it is its own change, after the resolver.

- **Generic float-button Widget.** A Widget over antd `FloatButton` behind a Phi Control, with
  config-driven placement, icon, and badge, emitting activation like the button Widget.
- **Control badge adoption from real use cases.** The badge contract exists for button and toolbar.
  Evaluate basket, support inbox, and similar domain buttons one by one; migrate only where the generic
  receiver contract fits without losing domain semantics.
- **Normalize Preset Content roots to vertical Flex.** Audit first-party Page presets and use a vertical
  Flex Layout as the Content Region root, keeping another root only where the Page has a semantic reason.
  The legacy Content Layout path is still registered.
- **Wrap the uncontrolled Ant Design primitives in Phi Controls.** `scripts/validate-control-boundaries.mjs`
  **permits everything it does not name**, so the exception is not a short list somebody chose -- it is
  whatever nobody has got to yet. **The reason to close it is that Ant Design is replaceable in principle
  and every direct import makes replacing it harder:** with a Control it is an adapter change, without
  one it is a tree-wide edit.

  It started at 28 named primitives against about 25 uncontrolled ones. It now names 43, closes five
  more to a single owner file, and leaves none: no file in the tree imports an Ant Design primitive past
  it any more.

  **That is not the same as closed.** `Row`, `Col` and `Layout` are the proof -- imported nowhere, and
  unprotectable by this map, which demands a Control exporting the named symbol where a three-column grid
  is a Layout. A denylist nothing violates still permits by omission, so the next primitive somebody
  reaches for is permitted again exactly as the last thirty were. The allowlist below is what remains.

  `Row`, `Col` and `Layout` are imported nowhere any more -- the footer Widget went and took them -- but
  the validator cannot say so. `controlledPrimitives` requires a Control that exports the named symbol,
  and there is none: a three-column grid is a Layout, not a Control. So the three sit in the gap this
  whole entry is about, permitted by omission and reachable again by anyone who types the import. That is
  the allowlist's job, and it is now the clearest argument for it.

  `App`, `ConfigProvider` and `theme` stay direct: they are the root and theme adapters AGENTS.md
  already exempts, not feature surface.

  **Not every primitive wants the same answer.** Four outcomes, and picking the wrong one is how a
  wrapper ends up being written for something that should have been deleted:

  - **A Control**, where there is platform semantics to own -- a normalized contract, defaults the
    platform should decide once rather than at each call site:
    ~~`Upload`, `Progress`, `Skeleton`, `Empty`, `Tooltip`, `Avatar`, `Card`, `Collapse`,
    `Descriptions`~~ done; `Space.Compact` (which is a different thing from `Space`, see below) remains.
  - **A thin pass-through**, where there is nothing to decide and the wrapper exists only so the import
    points at us: ~~`PhiTypographyControl` (~63 files), `Flex` (~60), `Divider`, `Spin`, `QRCode`,
    `Statistic`~~ -- all done. `PhiSpinControl` stays beside `PhiSkeletonControl` rather than being
    folded into it: a Skeleton draws the shape of what is coming and is only usable where that shape is
    known, and a guess that turns out wrong rearranges the page under somebody already reading it. A
    spinner claims nothing, which is the whole of what recommends it.
  - ~~**An owner entry only** -- the Widget that already wraps the primitive *is* the contract, so no
    new file is needed, just an entry naming it: `Anchor`, `Breadcrumb`, `Image`, `Result`, `Badge`.~~
    Done, as `soleOwnerPrimitives` in the validator. It is checked both ways: nobody else may import
    one, and an owner that stops importing it fails too, so a stale entry cannot sit there looking like
    a decision.
  - ~~**Deletion**, where the direct use should stop rather than be wrapped: the footer Widget with
    `Row`, `Col` and `Layout`, and plain `Space` in twelve files.~~ Done.

  Specifics worth not rediscovering:
  - ~~`Upload`~~ built as `PhiFileDropControl`, the one Control with a deliberately **smaller** surface
    than its primitive: `accept`, `multiple`, `disabled`, `dropZone`, `onFile`, `children`, and nothing
    of `fileList`, `showUploadList`, `beforeUpload`, `customRequest` or `LIST_IGNORE`. `onFile` rather
    than the `onFiles` sketched here, because every caller handled one file at a time and a batch prop
    would have made each of them loop. Two findings kept: Ant Design never transported a byte, and the
    three sites disagreed on `false` versus `LIST_IGNORE` -- only the latter also keeps the file out of
    the hidden list, so the Control settles it the strict way. `PhiProgressControl` came with it as a
    plain pass-through; an upload-specific `shape` prop would have been inventing props, and nothing
    about a percentage is specific to uploading.
  - `Skeleton` normalizes the vocabulary and not the measurements. Every site wrote
    `paragraph={{ rows: n }}`, the same nested object twelve times, so that became `lines`; the number
    itself stays per-site, because three lines for a form preview and eight for a security page are two
    different pages rather than a value nobody centralized. `presentation` covers `Skeleton.Input`,
    `.Button` and `.Node`. `active` defaults to true, and the one site that passes `false` means
    something else by it -- a Builder preview saying the Widget has nothing to show, where a shimmer
    would promise an arrival that never comes.
  - ~~`Empty`~~ built as `PhiEmptyControl`, before the `Listy` migration, because both `List` sites set
    `locale.emptyText` and migrating turns those into explicit empty states. Eight sites, not the six
    counted here. **One prop, `description`** -- the picture is not a call-site choice. Ant Design ships
    two and the eight sites split five to three with no rule behind it, two sibling collection bindings
    drawing different ones into the same slot of the same `PhiCollectionViewControl`; the quiet line is
    now the only one. An empty list is the most ordinary thing a page can report, and the large
    illustration spends the vertical space and the attention of an event. Absence is stated, not
    announced.

    An **omitted `description` means no text**, where Ant Design distinguishes a missing prop -- which
    draws a hard-coded English "No Data" -- from `description={false}`, which draws the picture alone.
    Two spellings of absence, one of them an untranslated string in a product where every other label
    comes from a label set, so the Control keeps one.

    One thing found and deliberately **not** settled in the migration, because it is a behaviour change
    rather than a wrapping: `phi-icon-picker-control.tsx` uses an empty state to report an Iconify
    **search failure** (`description={iconifySearchError}`). A failure is not an absence -- it can be
    retried, and drawing it as "no results" tells somebody their search was fine when the call broke.
    `PhiAlertControl` is what that wants, inside a 240px scroll area.
  - ~~`Tooltip`~~ built as `PhiNameControl`, which is **not** a tooltip wrapper. A tooltip is never the
    thing; it is an attribute of a thing, and a wrapper anyone may hang on anything is what produced the
    divergence below. The Control instead **names a graphic that shows no text** -- an icon standing in
    for a column header, an information glyph, a swatch -- and may therefore render `aria-label`, because
    an accessible name cannot be handed to a child from outside the element it belongs to. That is the
    line: something that names itself and wants only the hover text uses `PhiButtonControl`'s `tooltip`
    or `PhiLabeledControl`'s `description` with no label, which is the house's tooltip-only shape and was
    already there.

    **Five hand-written copies of "named graphic", four different answers.** The spoken name was the
    description at one site, the literal word "Information" at another and "Option description" at a
    third; one took focus and four did not, so four hints were unreachable without a pointer; one drew
    the help cursor. Nothing chose any of it. `PhiNameControl` settles all four, and `PhiDescriptionHint`
    composes it with the information glyph for the four surfaces that carry a `description`.

    **`option.description` had a rule already and nobody had written it down.** In a list a person scans,
    pointing at a row is already the cursor, so the description needs a deliberate target of its own; a
    standing option -- a checkbox, a radio -- is pointed at on purpose, so the option itself carries it.
    Both were being followed; what was duplicated was the rendering, and it had drifted: the checkbox and
    radio groups drew an option's icon but not its preview swatch. Both now go through
    `PhiControlOptionContent`, whose `presentation` gained `option` beside `dropdown` and `selection`.

    **`PhiButtonControl` now catches the pointer when it is disabled.** The primitive hangs the tooltip on
    the button, a disabled button emits no pointer events, and a disabled button is exactly when the hover
    text matters most -- it is the only place the reason it is off can be read. The table Widget had been
    working around this by wrapping the whole action; the wrapper now lives in the Control and only
    appears when the button is actually inert.

    One behaviour change worth knowing: the colour swatches in `PhiColorControl` carried a native `title`
    *and* an antd Tooltip with two different strings. They now say one thing, the fuller of the two.
  - ~~`Avatar`~~ built as `PhiAvatarControl`. Two importers, and they answered the same question
    differently: **picture, then initials, then the generic silhouette** was written down once, in
    `PhiAvatar` for the account menu, while the account page's own avatar Widget went from picture
    straight to the silhouette. A person with a name and no picture therefore looked different depending
    on which surface was drawing them, and "no picture" is the ordinary state -- most people never choose
    one. How people are identified is a platform decision, so the chain lives in the Control and
    `readPhiAvatarInitials` stopped being exported.

    The account avatar Widget still draws the silhouette, but now because no name reaches it rather than
    because it decided not to look. That is a data gap: `fetchPhiViewerAvatar` returns the asset and
    nothing about the viewer. Worth closing, and mild where it is -- on your own account page you know
    who you are.

    `PhiAvatar` in `components/shell/` keeps the navigation job it actually does -- the account-menu
    trigger, with the dropdown, the link and the label -- and hands the picture over. Its name says
    "avatar" and means "account menu trigger", which is worth a rename it cannot have yet: it is public
    API in `navigation.ts`. Its `<Space size={8}>` became `PhiFlexControl`, one site off the `Space`
    sweep below.
  - ~~`Card`~~ built as `PhiCardControl`. Eleven sites in three files, doing three different jobs with
    one primitive: a card on a page (the Card Widget), four inspector panels, a Theme preview frame, and
    three headed sections in the security Widget.

    **What it holds is the padding.** Ant Design hard-codes the small Card's body padding to 12 and
    reaches for `paddingLG` otherwise, and on this Fibonacci scale neither is right: `paddingSM` is 13,
    and `paddingLG` is 55, which made the security Widget's three ordinary sections look like features.
    Four of the five small Cards had noticed the first half and written the same one-line override by
    hand. The fifth had not, and it was the Theme preview: the one box whose entire job is to show what a
    Theme looks like was the one drawn off the Theme's own scale. `PhiCardControl` decides both sizes
    once, from `paddingSM` and `padding`.

    `extra` is `toolbar`, the word `PhiCollectionHeaderControl` already uses for the same thing, and it
    passes straight through -- a toolbar with no title still draws the heading bar, because that is the
    primitive's behaviour and a rule against it here would only hide it. **There is no body style**: a
    card is a box, and arranging what is inside it belongs to the caller's own element. The Card Widget's
    body grid moved into a `div` of its own.

    The Card Widget's three hand-written `rgba(17, 24, 39, …)` shadows are gone with it: depth now comes
    from `boxShadowTertiary` for an ordinary card and `boxShadowSecondary` for a featured one, and a
    highlighted card keeps its primary-coloured ring, which is a border rather than depth. A card sits on
    the page rather than over it, so the quiet shadow is the ordinary one.
  - ~~`Collapse`~~ answered twice, because the two importers are two contracts rather than one.

    **The CollapsibleLayout is the adapter** and keeps the primitive, named in `primitiveAdapterOwners`.
    It uses nearly the whole surface -- `accordion`, `activeKey`, `bordered`, `ghost`, `collapsible`,
    `destroyOnHidden`, `expandIconPlacement`, `size`, `items`, `onChange`, `styles` -- and a Control
    between the two would only hand a Layout its own props back.

    **The Theme inspector's four became `PhiAccordionControl`.** They were identical byte for byte apart
    from the state they were bound to, and the whole of what they repeated was an undoing: three `styles`
    overrides taking the panel look back off the primitive, because an inspector section is a heading
    with things under it and the box around it belongs to whatever the inspector already stands in. One
    open at a time is the shape rather than a prop -- sections fold so a long inspector stays short, which
    only works if opening one closes the last.

    `collapseStyles?: CollapseProps["styles"]` is gone from the Layout's props. It was dead -- declared,
    threaded through a merge that handled a function form nobody used, and passed by nobody -- and it was
    the one thing dragging `CollapseProps` into the Layout's public shape.

    **The leak worth more than the two import lines** was in the DOM, not in an import: the Layout tested
    an editor-scaffold click against `.ant-collapse-header` and `.ant-collapse-expand-icon`. Class names
    are not imports, so no validator can see them, and a library swap would have left the check compiling
    and matching nothing -- every header click in the Builder selecting the block instead of folding the
    slot, silently. The primitive takes a `classNames.header`, so the element is the same one and the name
    is ours. No behaviour changes with it: same element, same geometry, same hit area. The expand-icon
    test went with it, because Ant Design draws the icon inside the header and `closest` had already
    passed it on the way up.

    Marking the label instead would have been the tempting answer and the wrong one: the header is a
    full-width row and the label sits inside it, so clicking the empty strip beside the label would have
    stopped folding the slot and started dragging the block -- and that strip is the easiest thing in the
    header to hit.
  - `Typography` is `PhiTypographyControl`, decided. `PhiTextControl` is **taken** -- it is antd `Input`.
    So is `PhiAnchorControl`: `components/controls/phi-anchor-control-contract.ts` is about placement
    anchors (`topLeft`…`bottomRight`), not antd `Anchor`. Both names are settled before the first commit,
    not during it.
  - ~~`Descriptions`~~ built as `PhiDescriptionListControl`. Both sites were on the `Descriptions.Item`
    children form, deprecated since antd 5.8 -- the note here claimed `core/widgets/form-preview` was
    already on `items` and it was not, so the debt was twice what was written down.

    **A missing value is a dash, everywhere.** The primitive draws an empty cell, which reads as a field
    nobody thought about rather than one with nothing in it. `log-detail` had written that dash itself,
    in a local `formatValue`, and applied it to four of its nine entries -- so in one grid an empty
    `path` said "--" and an empty `message` said nothing, and `message` is the widest thing on the view.

    **The label is legible.** Ant Design draws it tertiary at normal weight, which is faint for the thing
    you read in order to know what the value beside it means. `form-preview` had already moved it to
    secondary at 500 and `log-detail` had not: the same divergence as the Card padding and the Tooltip
    name, one site noticing and fixing it locally.

    **One column on a phone.** `columns` is what stands side by side from `md` up; the primitive takes a
    fixed number and would have kept two columns of short facts on a narrow screen. `presentation` is the
    one axis left to the caller and the only one the code could not settle -- a grid is a record read
    closely, a list is a summary read once.

    A long entry says `full`, not how many columns it takes. That was a correction: `span={2}` shipped
    first and contradicted the responsive column count the moment the viewport dropped below `md`, which
    antd reports at runtime -- *"Sum of column `span` in a line not match `column`"* -- and no type can
    catch. A number has to agree with a count this Control decides and changes by viewport; `full` is
    what the caller means anyway.

  Two conditions, or the work makes things worse rather than better. **A Control passes its primitive's
  contract through rather than inventing props**, which is what keeps the migration mechanical and keeps
  the Controls from becoming a second styling vocabulary. And **the validator should end up refusing by
  default** -- an allowlist of what may be imported directly, rather than today's list of what may not --
  because otherwise the next primitive somebody reaches for is permitted again by omission and this
  entry has to be rewritten a third time. `pendingControlAdoptions` is the tool for getting there before
  all the Controls exist: a primitive joins `controlledPrimitives` together with its remaining sites, and
  the sites are cleared one at a time.

  ~~**The validator has a hole that the allowlist must close.**~~ Closed. `antdImportAllowance` names
  every Ant Design import outside `components/controls/` -- 27 files, values, types and deep paths, each
  with its reason -- and anything absent fails. It is checked both ways, so a permission nobody needs any
  more fails as loudly as an import nobody allowed.

  **The deep-path reader was worse than recorded.** It matched one path segment, so `antd/es/select`
  would have been caught and `antd/es/theme/util/alias` never was. `theme/phi-antd-token-resolver.ts`
  imports four **value** paths into Ant Design's internal theme machinery -- `theme/themes/dark`,
  `theme/themes/default`, `theme/themes/seed`, `theme/util/alias`, of which the last two are not public
  exports. That is the deepest coupling to Ant Design in the tree, deeper than any `import { Button }`
  this entry ever removed, and no check had seen it. It is allowed now, with the reason written down,
  which is the difference between a decision and an oversight.

  Found with it: **ten surfaces read design tokens through antd's `theme` hook** rather than through
  `usePhiConfig()`, which returns the same set. Not wrong, but a Control adoption still open; they are
  listed in the allowance so the number shrinks in the open.

  Order: ~~the two big pass-throughs (`Flex`, `PhiTypographyControl`), the five owner entries, the
  trivial wrappers, `PhiFileDropControl` with `Progress`, `PhiSkeletonControl`, `PhiEmptyControl`,
  `PhiNameControl`, `PhiAvatarControl`, `PhiCardControl`, `PhiAccordionControl`,
  `PhiDescriptionListControl`, `PhiEntryListControl`, `PhiCompactGroupControl`, the deletions, and the
  allowlist~~ -- **done, all of it.** What is left is not wrapping: the ten `theme` readers above.

  `pendingControlAdoptions` is gone with the denylist: it existed to let a primitive join
  `controlledPrimitives` before its last sites were converted, and there are no unconverted sites left.
  The allowance entry with its reason does the same job better, because it says why rather than only
  how long.
- ~~**`Space.Compact`**~~ built as `PhiCompactGroupControl`. **It had to be a wrapper and could not be
  written ourselves:** Ant Design joins Controls through a React context, not CSS -- `Space.Compact` puts
  `isFirstItem`, `isLastItem`, the size and the direction around each child, and ten of its components
  read that context and emit their own border-collapsing class names. Negative margins of our own would
  reach eighty per cent and break on the focus ring, an error state, a disabled edge, an open Select --
  per Control, separately.

  Ten sites, two meanings, one rendering. A **compound field** is several Controls holding one value and
  joined so they read as one input (a number and its unit, a width and its style, a range); a **button
  group** is separate commands drawn as one bar. Seven to three. They are not two Controls, because the
  seam is the same seam and the primitive has one contract -- the distinction lives in the doc comment so
  that nobody reaches for it to build a layout.

  Left out deliberately: a `label` prop for `role="group"` plus `aria-label`. No site needs it today, the
  parts carry their own names, and `SpaceCompactProps` extends `HTMLAttributes`, so a real case can pass
  both itself.

  **Two differences between `Space` and `Flex` no typechecker sees**, found while sweeping and worth not
  rediscovering. A horizontal `Space` centres its children (`align === undefined && !vertical ? 'center'`
  in antd's source) where `Flex` stretches, so every horizontal site needed an explicit `align="center"`.
  And `Space` is `display: inline-flex` where `Flex` is `flex`: inside a table cell an inline box follows
  the cell's `text-align` and a block box fills the cell and leaves its content on the left, so the five
  sites that render inside a cell kept `display: inline-flex` deliberately. Everywhere else the parent is
  itself a flex container, where an inline child is blockified anyway, or a `width: 100%` was already
  there.

  Three sites in the description Widget wrote `size={0}` and then set the real spacing in
  `style={{ gap: … }}` beside it -- a way around `Space`'s size scale that `gap` takes directly.
- ~~**Migrate off antd `List`, which is deprecated.**~~ Done, and **not** onto `Listy`.

  `List` was a kit: a responsive card grid on `Row` and `Col`, pagination, a spinner, an empty state,
  borders, and two fixed row templates in `Item` and `Item.Meta`. `Listy` keeps none of it -- `items`,
  `rowKey`, `itemRender`, grouping, virtualisation -- because that is what a list of ten thousand rows
  needs and what `List` structurally could not do: a grid of variable heights cannot say where row four
  hundred is without drawing the first three hundred and ninety-nine.

  **Nothing here has that list, and the contracts are why.** Provider-backed data pages by contract
  (`query: { pagination: "offset" }` on the resource), and every client-held list is bounded by the thing
  it describes -- one document's headings, the installed Widget catalogue, a palette's colours. The one
  candidate that could have been unbounded, the icon picker's Iconify results, already pages with
  `start`/`limit`/`total`. A third-party Module with ten thousand rows should publish a Provider and get
  search, sorting, paging, authorization and the Builder binding with it; handing it `Listy` would make
  bypassing that comfortable.

  So the four sites became `PhiEntryListControl`: a name, a line about it, a state, and the one thing you
  can do to it. What they used from `List` was the row template, which is exactly the part `Listy` drops
  -- the deprecation was the occasion, not the instruction. `List` and `Listy` both point at the new
  Control in `controlledPrimitives`, so reaching for either is a conversation rather than an import.

  Found on the way: the sessions list passed no `emptyText` at all and fell back to Ant Design's
  hard-coded English, the same trap `PhiEmptyControl` closes one level down. It says "No sessions
  recorded." now -- another hardcoded English string in a Widget that has no label set, which the whole
  security Widget still needs.

  **When `Listy` would earn its place:** a continuous history read upwards rather than a page at a time,
  a message thread being the case in [THREADS.md](./THREADS.md). Even there the first answer is loading
  on scroll by cursor; virtualisation only pays once thousands of rows stay mounted. That surface makes
  the case with its own numbers.

## Regions and Overlays

- **Parameterized Region shape dividers.** One Region-edge contract for optional top and bottom
  decorations, rendered centrally by the Region container. Scope: `header_bottom.bottom`, `hero.top`,
  `hero.bottom`, `footer_top.top`. Closed shape catalog (wave, layered wave, zigzag, curve, slope) with
  validated ids and bounded parameters, never raw SVG or path data. Static inline SVG outside Region layout
  metrics; optional transform-only, reduced-motion-safe animation that a static Region never loads.
- **An Overlay is a block, and should be sized like one.** This began as "Modal sizing: either drop
  `width` from Modal config or admit it in the contract", and the answer turned out to be neither. The
  question is not which of the two sizing fields wins. It is why an Overlay has private sizing fields at
  all.

  Every renderable block carries `size`, `minSize`, `maxSize` and `collapsedSizeHint`, each a
  `{ width?, height? }` (types/renderable-block.ts). `PhiCmsOverlayConfig` carries none of them: it
  extends `PhiCmsContainerChromeConfig`, which is padding, background, border, shadow and effect and no
  geometry at all (types/cms-container.ts). So the Overlay grew three fields of its own, each weaker
  than the one it stands in for -- `width` is a width with no height, the Drawer's `size` is a single
  length under the same name the block contract uses for a pair, and `maxSize` is a bare number under
  the same name the block contract uses for a pair.

  **What the missing vocabulary costs is visible in the presets.** The auth Overlay says in its own
  comment that "the width has a floor rather than a preference" -- and then writes two widths, 400 and
  420, both chosen to sit above the 360 at which the form inside puts its labels back over its inputs.
  The floor is simulated by picking values above it, because there is no `minSize` to state it with. At
  the other end, the viewport clamp every Modal gets is hard-wired in the Control
  (`calc(100vw - 2 x base)`, components/controls/phi-modal-control.tsx) rather than written as a
  `maxSize` where any other block would write it. And an authored height cannot be expressed at all:
  height reaches a Modal only through the transient `size` signal and is gone at the next remount.

  **The shape of it.** Adopt `size`, `minSize` and `maxSize` on the Overlay from the block contract and
  drop `width`. `controlSize` stays, in the role it has everywhere else -- three steps for whoever does
  not want to name a number, the same role a Button's size has -- and it is not a responsive vocabulary:
  `small` is 520px on a phone and on a 4K screen alike. Its three widths also fit none of the eight
  Overlay presets, which want 400, 420, 480, 520, 560, 600, 640 and 720; adding steps for them would
  damage a vocabulary that belongs to Controls rather than to Overlays.

  **And this is the part that reaches past Overlays.** `PhiRenderableBlockSize` is a plain
  `{ width, height }`. The `compact | medium | wide` axis lives only on Grid spans and offsets and on
  the Overlay `width` being removed here, so adopting block geometry as it stands would lose the 20--80px
  each preset gains on a wide screen. Block geometry therefore has to take the responsive form first,
  and that is a change to every renderable block, not to Overlays. Order matters, and the first step is
  done: the container-breakpoint scale in `theme/phi-container-breakpoints.ts` is what a profile is
  measured against. Next is "One resolver for block geometry" under Layouts and Widgets, which is where
  the responsive form would be built; then the Overlay adoption, then `width` goes -- the other order
  would drop distinctions the presets are making on purpose.

  **The decision that has to come before any of it: what a profile is measured against.** "Responsive"
  is not one mechanism here, it is three, and the tree is not of one mind about them:

  - *CSS decides on its own, nothing is authored.* A Flex Layout's `wrap` is a boolean and the room
    decides; a Masonry with `minColumnWidth` fills as many columns as fit, and with `columns` does not.
  - *The block measures its own width.* A Form declares `container-type: inline-size` and switches at
    360px and 768px (styles/layout.css); a Grid runs a `ResizeObserver` on its own container and reads
    `compact | medium | wide` off it (components/layouts/clients/phi-grid-layout-client.tsx); the Shell
    does the same for its visibility flags at 768 and 1200 (styles/shell.css).
  - *Neither.* A Split Card has no wrap and no profiles at all -- its two cards do not stack. And
    `size`, `minSize` and `maxSize` are a number that never becomes another one.

  The Overlay is the one exception, and it matters for this decision: its responsive `width` is handed
  to Ant Design as `{ xs, md, lg }`, which are **viewport** media queries. Every other responsive thing
  in the tree answers to its own measured width. So block geometry cannot simply "become responsive" --
  it has to say against what, and the two answers are not compatible: a `medium` that means "this block
  is between 360 and 768 wide" and a `medium` that means "the window is" would be the same word for the
  third time.

  **Decided (2026-09-25): a profile is measured against the block's own width.** What forces the
  content is the room the block actually stands in, and that keeps one meaning of `compact | medium |
  wide` across Grid, Form and block geometry -- a word that means three things is worse than a word
  that covers one case less well. A Modal genuinely hangs on the viewport rather than standing in a
  Layout; it says so with `maxSize` in `vw` units, not with a second profile system. The Overlay's
  `{ xs, md, lg }` handed to Ant Design is therefore the thing that goes, not the thing the rest adopts.

  What follows from it was the first question of the responsive form, and it is answered under Layouts
  and Widgets: **CSS decides, nothing measures** (2026-09-26). The scale stays the container-breakpoint
  one (theme/phi-container-breakpoints.ts), the query goes on the box that offers the room rather than
  on the block, and a block that states no responsive value pays nothing, because it writes no
  properties and no rule matches it.
- **What the Shell is on a phone.** Today the answer is subtraction: the Shell hides Regions by
  `viewportFlags` below 768px (styles/shell.css), so a narrow screen gets the same Shell with parts
  missing. Nothing is re-arranged, and the navigation that lived in the sider is simply gone.

  An idea rather than a design: collect the navigation items that the sider, the header and the footer
  each contribute into one menu, so a phone gets one way in instead of three that do not fit. What would
  have to be decided before it is a design -- which Regions may contribute, what orders the result, and
  who owns the collecting. The last one is the trap: a menu that gathers items from every Region is one
  step from being the single place that knows all five Areas' presets, catalogs and module sets, which
  NEXT_INTEGRATION.md forbids outright. The Area-switch entry under Verification ran into the same wall
  from the other side.

- **Overlay authoring in Builder.** Designed in [design/OVERLAY_AUTHORING.md](./design/OVERLAY_AUTHORING.md).

## Builder

- **Author a table where the table is.** A collection field in an Overlay is better than a collection
  field down a narrow column, but for a table it is still describing a thing from beside it. The thing is
  on screen: a `+` in the header row adds a column and opens a picker with that column's settings, a `+`
  at the end adds a row. The Inspector's collection stays -- it is the general case, and a Widget with no
  visible shape has nothing to click -- but wherever the configured thing is already drawn, that is where
  it should be reachable.

  **One rule this raised, wider than the table.** *Not everything belongs in the Builder*: some settings
  should be reachable only through the Module that declares them, so the Inspector is not the union of
  every config field that exists. Which ones is not decided yet, and the field contract has no way to say
  it.

  The second one is answered: `PhiDialogControl` now owns what a code-built Dialog looks like inside, and
  both callers use it (OVERLAYS.md, "Dialogs that are Controls"). The open remainder is small -- whether
  *dense* is a real case at all. The static options picker was the only argument for it and it turned out
  to be an omission, not a decision; if a table really should bleed to the Dialog's edge, that arrives as
  one named `density` with a reason, not as three callers quietly disagreeing again.
- **Move transient Builder previews to shared storage** before running more than one Skeleton process.
  `plugins/runtime-modules/builder/preview-store.ts` keeps snapshots in a process-local `globalThis` Map.
  Replace it with a shared TTL store bound to the Site and the authorized Builder session, keep the opaque
  id transport, reject cross-session reads, and keep `/builder/api/[[...path]]` transport-only.
- **Refuse activation when a Site Page holds a Module's package path.** The Public address dialog is
  built; outside Public nothing checks a Site Page against the package path
  (THIRD_PARTY_MODULES.md, "Addresses are granted, not owned").
- **Optional visual Form Builder.** Define the canvas and its Draft/Publish request shape (selection,
  field insertion and reordering, responsive placement, preview, Undo/Redo) before adding persistence
  capabilities to `controller:@phis/ui/modules/form-builder/controller/default:default`. Reuse the `form_definitions` revision
  statuses; do not add another Form table.

## Media and Theme

- **Media Inspector variant hand-over.** The Inspector always simulates the variant crop from the original
  (`components/media/phi-asset-inspector-section.tsx`) and never shows the generated variant. Decide
  whether that stays and the contract says so, or whether unsaved focal edits get an owner and the preview
  switches to the regenerated variant after save.
- **Module fonts: a package from a tarball is not compiled.** `phis module` writes the fonts projection,
  but nothing names an installed package in the Site's `next.config.ts`. A Module linked from a workspace
  resolves outside `node_modules` and Next compiles it either way; one installed from a tarball is not
  compiled, so its `./fonts` boundary contributes no typefaces and says nothing. Tracked with the shape of
  a fix in [phis-server TODOS.md](../phis-server/TODOS.md), "Site bootstrap and releases".
- **Module font adoption into the Media library.** Designed in [design/FONTS.md](./design/FONTS.md).
- **The token vocabulary is the house's; what is missing is the boundary and the bridge.** The names
  are Ant Design's spelling and they stay that way: `colorPrimary`, `paddingSM`, `controlHeight` are
  this house's words too, and nothing stored anywhere has to move. What is missing is that the list is
  never stated on the Client side and nothing computes it but Ant Design.

  The Server already has the stated version. `PhiServerThemeTokens` (`theme/phi-server-tokens.ts`) is a
  closed list of the names a Server render may read, owned here, spelled Ant Design's way, and the Shell
  publishes it as `--phi-*`. The Client has no such list: `PhiConfig.token` is antd's `GlobalToken`
  (`components/root/phi-config-provider.tsx`), so 57 files read from an open surface and the 51 names
  they happen to use are an accident of what somebody typed rather than something the house promised.
  Neither is a stored Theme held to the list -- `theme.palette.seed`, `theme.palette.modes.*.overrides`,
  `theme.style.token` and `theme.components` are open `Record<string, ...>` on the Site record, so a key
  this house does not have reaches the resolver unremarked.

  The bridge exists and is not named as one. `theme/phi-antd-token-resolver.ts` derives the alias tokens
  out of `antd/es/theme/themes/*` and `antd/es/theme/util/alias`, `components/root/phi-config-provider.tsx`
  configures Ant Design with the result, and `components/widgets/helpers/font-family.ts` and
  `font-size.ts` read the token names; those four are already the only files
  `scripts/validate-control-boundaries.mjs` lets near Ant Design, each with its reason. Naming them the
  bridge is most of the work: above it everything reads a Phi token record whose names are declared here,
  below it one implementation turns a stored Theme into that record.

  What swapping Ant Design would then mean, stated so it can be checked: the names are the contract, the
  algorithm behind them is not. A different implementation has to answer the same list -- including what
  antd derives rather than seeds, which is the part that is genuinely antd-shaped today -- and nothing
  above the bridge changes. So the order is: state the Client list beside the Server one, type
  `PhiConfig["token"]` with it, hold a stored Theme to it, and extend the boundary check from who may
  import Ant Design to which names cross.

- **A Tour for the Theme workspace.** The one thing `/builder/theme` does not say out loud is that a
  Module's Theme is offered and never taken: installing a package that ships a look changes nothing until
  somebody picks it here, and the "your logo" placeholder in the header is the sign that nobody has. That
  is written in [THEME.md](./THEME.md#selection-and-resolution) for whoever reads contracts, and it wants
  saying once in the workspace itself, for whoever does not. A Tour is the shape for it; the design is
  [design/TOURS.md](./design/TOURS.md) and nothing of it is built, so this waits on that.

## Translations and preferences

- **Count-aware plural translation.** Add one plural contract to the central translation and placeholder
  formatter before Widgets branch on singular/plural locally. Providers keep returning scalar counts.
- **User-profile Tooltip preference.** A per-user setting to disable optional Tooltips, resolved centrally
  and applied through the Phi Control adapters; essential validation, warning, confirmation, and
  accessibility text stays available.

## Tables and Markdown

- **Provider-backed Markdown table embeds.** TABLES.md defines the closed embed descriptor; no embed parser
  exists yet.
- **Code samples are coloured by a scanner, not by a grammar.** `core/widgets/markdown/code-tokens.ts`
  reads six languages -- TypeScript, JSON, Bash, SQL, YAML and CSS -- and a fence naming anything else is
  printed plain, which is the stated answer rather than a gap. What the scanner cannot see is a tag: HTML
  and JSX come out as ordinary text, and so do interpolation inside a template literal, here-documents and
  regular-expression literals. Decide whether a real grammar is worth a dependency in a package that
  installs into every Site before adding one.

## Modules and packaging

- **Groups administration package.** The Groups Runtime Module ships in this package as
  `@phis/ui/modules/groups` (`plugins/runtime-modules/groups/`), with Admin and App pages. Decide whether it
  moves to a separate `phis-cli`-installable package. Either way it binds only to Core
  `@phis/server/groups:v1`, never branches on a Directory provider, and leaves provider setup and sync to
  the Add-on half.
- **Module distribution.** Designed in [design/MODULE_DISTRIBUTION.md](./design/MODULE_DISTRIBUTION.md).
- **Say what a Site loses before it switches a Module off.** Deactivating a Module leaves every reference
  to it dangling, and each kind is only discovered when the page renders: a Collection View naming one of
  its item renderers, a signal route pointing at a receiver it owned, a data-provider binding to one of
  its resources. Each reports itself in the block, which is right at render time and far too late at
  decision time. One check that answers "what stops working if this goes" for renderers, routes and
  bindings together, run where the Module selection is edited and again on publish. Not a fallback: the
  block still refuses to draw something other than what was chosen, the Site is simply told first.

## Verification

- **The Area-switch loop: a server redirect answered into a navigation that changes the Area.** Narrowed
  on 24.09. from "somewhere in the parallel routes" to that sentence. Every row is dev, after a cleared
  `.next/dev`, a restart and a `curl` warm-up of both routes, because without those the numbers mean
  nothing:

  | click, as a `Link` | navigations | RSC | outcome |
  |---|---|---|---|
  | into another Area's **root**, which forwards | 41 / 45 / 46 / 55 / 67 / 98 / 110 | 2 per navigation | never settles |
  | into another Area's **Page** (no redirect) | 1 | 1 | quiet, 3 of 3 |
  | into another Area whose root is configured **not** to forward (`rootRoute.mode: "landing"`) | 1 | 1 | quiet, 3 of 3 |
  | inside one Area, Page to Page | 1 | 1 | quiet |
  | inside one Area, Page to that Area's root, **which forwards back** | 2 | 3 | quiet |

  Read down the column: crossing an Area is quiet. A redirect is quiet. Crossing the `(root)`/`(pages)`
  group boundary is quiet -- the last row does all three of those and costs two navigations. Only a
  redirect *and* a change of Area in one navigation loop. The landing row is the control that settles it:
  same Area boundary, same group structure, same menu, no forward, quiet.

  **The server is not looping.** Logged inside `resolvePhiCmsPageRedirect` during a run: `/editor`
  resolves exactly once -- seven lines, which is one render (the Layout, the Page and the five slots) --
  with `currentPathname="/editor"`, so its guard correctly does not apply. Nothing after that. The access
  log for the same window shows **52 requests to `/editor/phis/ui/dashboard`, every one answered 200 in
  400--900ms**, and no further redirect resolution at all. Each answer is complete and correct.

  **It is the client's router state that never advances.** The request sequence is: one RSC request for
  `/editor` (answered with a serialised redirect inside a 200), then the follow-up for
  `/editor/phis/ui/dashboard` **in pairs**, and from the second pair onwards always with the *same*
  `_rsc` key. That key is derived from the router state tree, so an unchanging key means the tree is not
  moving -- which is the `"refetch"` marker the earlier analysis found standing on all six parallel
  segments after a complete response. Today's contribution is the trigger: the marker is set by applying
  a redirect whose follow-up response belongs under a different Area segment than the tree the client
  still holds.

  Levers tried and dead: `308`/`permanentRedirect` instead of `307` (41 and 45 navigations, unchanged).
  Things that turned out **not** to be it, each changed anyway on its own merits and each measured as a
  full 2x2 in which every cell runs away: the Page-owned slots having no `default.tsx`, and the slots
  raising refusals of their own beside the Layout's (`NEXT_INTEGRATION.md`).

  **What is left to know, and it is one thing:** why the reducer keeps the marker after a complete
  response. That needs Next's `router-reducer` instrumented, which is the step
  `browser-test/notes/ANALYSE-area-switch-loop.md` has named since 22.09. Everything above it is now
  measured rather than suspected.

  **What follows for us.** Not a link change: giving the menu the landing Page would make the account menu
  the one place that knows all five Areas' presets, catalogs and module sets, which
  `NEXT_INTEGRATION.md` forbids outright, and the target is deliberately a Page reference whose fallback
  is the Area navigation's first entry -- reorder it and the front door moves. So the entry stays a plain
  anchor at two document requests. The two real options are an Area root that does not forward
  (`rootRoute.mode: "landing"`, measured quiet, but that is a product decision per Area) and the planned
  removal of the Page-owned parallel routes, whose *existence* is still implicated even though their
  defects were not.

  Scripts: `browser-test/scripts/check-area-link-loop.mjs` (counts; `TO_HREF` picks the target),
  `trace-area-link-navigations.mjs` (history stacks), `check-area-arrival-settle.mjs` (hard-load control).

- **Close the last cold door, and then the account menu's anchor goes.** The proxy answers an Area root
  with a real HTTP 307 once a door is known, and any request in an Area now teaches it that Area's door
  (`gateway/area-root-door.ts`, `server-helpers/area-root-door-warmup.ts`). Measured, dev:

  | the click, as a `Link` from another Area | navigations | RSC |
  |---|---|---|
  | after any visit to any Page of the target Area | **1** | 2 |
  | with nobody having been in that Area this process | 42 | 85 |

  What is left is exactly one case: the **first** request into an Area after a process starts or a publish
  sweeps the cache. Warming cannot reach it from inside -- that request is the one that would warm the
  door, and the warm-up runs in its own Layout after the proxy let it through. Warming it from outside
  would mean one Area's render reaching another Area's descriptor catalog, which `NEXT_INTEGRATION.md`
  forbids and which is the reason the proxy remembers instead of computing.

  Two candidates, both needing operator approval:

  - **Hold the door in Core.** A Site process that learns a door publishes it; the proxy asks Core on a
    local miss, through the same cached read it already makes for the locale. Then only the very first
    request across the whole installation is cold, and a restart costs nothing. It needs an endpoint and a
    place to keep it.
  - **Make the cold forward a hard one.** The render only ever forwards when the proxy did not, so the
    render could forward with `location.replace` instead of `redirect`. Measured quiet at 3 navigations
    and 2 documents, against 42 for the loop. The price is that one cold request's status line: 200 with a
    client-side redirect rather than 307. Staff Areas are `noindex`, and Public is not in this branch, so
    the crawler argument that put the 307 there may not apply -- but it is the operator's call.

  Until one of them, `components/menus/phi-account-menu.tsx` keeps its plain anchor.

- **The Builder got heavier and nobody said why.** Measured against production builds two weeks apart
  (`browser-test/notes/MESSUNG-payloads.md`, which also says how to run the three measurements and which
  of them answer which question): between 09.09. and 24.09. the Builder gained **18 scripts, 169 kB over
  the wire and 479 kB decoded** on a cold load of `/builder/phis/ui/dashboard`. In the same fortnight
  Public and the landing page each *lost* around 180 kB over the wire and 600 kB decoded.

  The Builder is the surface with the smallest audience and the largest load, so a rise there is the one
  that should be argued for rather than noticed later. Find what joined its graph and either justify it in
  that note or move it out.

- **The Public bundle drifts upward unremarked.** 21.09. to 24.09.: **+5,320 raw and +1,457 gzip**, same
  script count, measured by `pnpm bundle:check:public` against a production server. Small, but it has only
  ever gone one way, and the guard reports contents rather than size, so nothing fails when it grows.
  `TODOS.md` already carries "freeze the module-graph audit"; a size budget belongs beside it, and the
  numbers to set it from are in the note.

- **Freeze the module-graph audit.** `pnpm audit:graph` exists but is not part of `pnpm verify`. Set its
  output budget and failure thresholds, then add it.
- **Generated-output budget report** for the Skeleton's development build, separating Turbopack cache,
  source maps, server chunks, and browser chunks.

## Contracts

- **Check that a preset icon name resolves, not only that it is namespaced.**
  `validate-preset-icon-vocabulary` accepts any `antd:*` name; a name in neither
  `components/shell/phi-icon.tsx` nor `phi-management-icon.tsx` renders nothing at all, with no error
  anywhere. Read both registries in the guard and fail on a name that is in neither.

- **Machine-readable JSON schemas.** Signal `valueSchema` ids are enforced by TypeScript readers and
  emitters only. Add a runtime schema registry once the controller and Widget schema inventory is stable.
- **Keep `scopeKey` separate from signal routing.** Audit new `scopeKey` uses; never derive a signal scope
  or receiver from it.

## Operations

- **CMS backup/restore and portable transfer.** Exact backup/restore that preserves canonical CMS instance
  ids and DB sequences; portable export/import into a target Draft with central id allocation and atomic
  remapping of structural, signal-route, controller/form, and module-owned references. Define the transfer
  scope (media binaries, Site configuration, content records) first.
