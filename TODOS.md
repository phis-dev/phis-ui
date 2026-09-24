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

- **One resolver for block geometry.** `size`, `minSize` and `maxSize` are read in five places, and each
  one interprets them for itself. This is the prerequisite for making them responsive, and it is worth
  doing on its own merits.

  **The five readers, and what each answers when a value is absent:**

  | | Where | What it writes | Absent inline size means |
  |---|---|---|---|
  | A | `plugins/runtime/slot-size-policy.ts` | the slot policy, as `phi-slot-child--*` classes | the declared policy, else the kind's default |
  | B | `plugins/runtime/phi-slot-child-frame-view.tsx` | CSS on the frame around every child | nothing written |
  | C | `components/layouts/phi-layout-contract.ts` | CSS on a Layout's own inner box | `100%` |
  | D | `components/regions/clients/cms-region-container-client.tsx` | Shell Region geometry | the Theme's sider width |
  | E | `plugins/runtime-modules/builder/render-root-node-preview.server.tsx` | custom properties for the root scaffold | `100%` |

  Five answers to one blank. B and C are not alternatives: a Layout in a slot is wrapped by B and draws
  its own box with C, so its geometry is applied twice, on two nested elements, **by two rules that
  disagree** -- B caps an absolute inline maximum with `min(100%, Npx)`, C writes the same value plain.

  **Findings worth not rediscovering.**

  *A number is a unit, not a type.* `PhiCssLength` is `number | "<n><unit>"` and `serializePhiCssLength`
  stores a pixel length as a bare number and everything else as a string (`types/length.ts`). So
  `typeof value === "number"` in these readers means **"is an absolute pixel length"**, and B's capping
  is the correct rule -- an absolute maximum can be wider than its slot, a `%` or `ch` maximum is already
  relative to something. It only looks like a type check. Any reader that branches on `typeof` instead of
  `readPhiCssLengthPart` has misread the vocabulary; the same encoding carries runtime values, because
  `readPhiDimensionValue` serialises signal input with the same function.

  *`size` is two statements in one field.* It is a measurement, and it is the claim "I decide this axis",
  which flips the slot policy from `fill` to `fixed` (`resolvePhiEffectiveSlotSizePolicy`). That function's
  own comment gives the reason this entry exists: *"a rule that has to be remembered at each site is a
  rule that is already broken."* It is correct one level down and unstated one level up.

  *The medium is not symmetric.* A page is definite in width and indefinite in height, so `height: 100%`
  against an auto-height parent resolves to `auto` and a percentage `max-height` is treated as `none`.
  That is why B caps the inline axis and not the block axis, and it is the same asymmetry that hides the
  palette defect in the entry below.

  **The target model.** One function, beside the vocabulary rather than beside any caller, that reads a
  config once and returns everything the five need:

      resolvePhiRenderableBlockGeometry(config) -> {
        inline: { size, min, max },   // resolved CSS lengths, decoded by unit
        block:  { size, min, max },
        explicitInline: boolean,      // "this block decides its own inline axis"
        explicitBlock:  boolean,
      }

  A: reads `explicitInline`/`explicitBlock` and the constraints. B: builds its style from it. C: the same,
  plus its own `100%` fallback applied by the caller rather than decided a second time. D and E: the same
  object instead of their own fallbacks. Nobody else touches the three fields, and a guard enforces that
  the way `soleOwnerPrimitives` enforces primitive ownership -- checked in both directions, so a reader
  that stops using it fails too.

  Then responsive geometry is a change to the resolver alone; the five call sites never learn about
  profiles. Without this they would each learn it separately, and by the record above, slightly
  differently.

  **Order.** The move first, with no pixel changed: five callers, the differences preserved verbatim as
  caller-side fallbacks or named options, plus the guard. Then each rule settled on its own, because each
  moves pixels: (a) whether `100%` is the answer for everyone or stays C's fallback, (b) whether an
  absolute maximum is capped on the block axis too and what a `ch` or `rem` maximum should do, (c) whether
  the Builder root scaffold's own fallbacks become the general ones or stay a stated exception. Only then
  the responsive form -- and with it the question the palette raises: if a block states a width at `wide`
  and not at `compact`, does its slot policy change with the viewport, or is "explicit" a property of the
  block as a whole?

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

  Recommendation: **the block's own measured width**, because that is what actually forces the content,
  and because it keeps one meaning across Grid, Form and block geometry. A Modal genuinely is hung on
  the viewport rather than standing in a Layout, but it can say so with `maxSize` in `vw` units instead
  of with a second profile system.
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
