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
  `plugins/runtime-modules/phi-default-site-area-preset-tree.ts`), so the central instantiator is not
  yet the only node-construction authority.

## Layouts and Widgets

- **Block geometry: the rules each reader kept, now settled one at a time.** The move is done: one
  reader, `resolvePhiRenderableBlockGeometry` (types/renderable-block-geometry.ts), and a guard that
  names who draws geometry and who merely touches the fields (`scripts/validate-block-geometry-readers.mjs`;
  LAYOUTING.md, "Block geometry is read once"). No pixel was meant to move, and each reader's own
  fallback stayed at its call site. The per-caller rules are settled; what remains is one piece:

  - The responsive form, in the resolver alone; the readers never learn about profiles. With it the
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
    fallback is a profile value, since 2026-10-04 a column count the Grid states itself
    (`columns`, default `PHI_GRID_LAYOUT_DEFAULT_COLUMNS` = 1 / 2 / 4), and it lives in
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
  extends `PhiCmsContainerChromeConfig`, which is padding and a Surface and no
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
    decides; a Masonry with `minColumnWidth` filled as many columns as fit, and with `columns` did not (it
    answers by profile now, LAYOUTING.md "Masonry columns").
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
- **Code samples are coloured by a scanner, not by a grammar.** `components/widgets/shared/markdown-code-tokens.ts`
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

- **The one cold door that is left.** A forwarding Area root is answered by the proxy with a real 307 once
  the door is known (`gateway/area-root-door.ts`, `server-helpers/area-root-door-warmup.ts`), and a cold
  one is forwarded hard from the render (`components/cms/phi-hard-forward.tsx`), so a client navigation
  into another Area no longer loops and the account menu links with `<Link>`. What is left is the
  **first** request into an Area after a process starts or a publish sweeps the cache: it is answered 200
  with a client-side forward rather than 307, because warming cannot reach it from inside (that request
  is the one that would warm the door) and warming from outside would mean one Area's render reaching
  another Area's catalog, which `NEXT_INTEGRATION.md` forbids. Holding the door in Core -- a Site process
  that learns a door publishes it, the proxy asks Core on a local miss -- would close it, and needs an
  endpoint and operator approval. The measurements behind this are in
  `browser-test/notes/ANALYSE-area-switch-loop.md` and `browser-test/scripts/check-area-link-loop.mjs`.

- **The Builder got heavier and nobody said why.** Measured against production builds two weeks apart
  (`browser-test/notes/MESSUNG-payloads.md`, which also says how to run the three measurements and which
  of them answer which question): between 09.09. and 24.09. the Builder gained **18 scripts, 169 kB over
  the wire and 479 kB decoded** on a cold load of `/builder/phis/ui/dashboard`. In the same fortnight
  Public and the landing page each *lost* around 180 kB over the wire and 600 kB decoded.

  The Builder is the surface with the smallest audience and the largest load, so a rise there is the one
  that should be argued for rather than noticed later. Find what joined its graph and either justify it in
  that note or move it out.

- **The Public bundle drifts upward unremarked.** 21.09. to 24.09.: **+5,320 raw and +1,457 gzip**, same
  script count, measured against a production server the way `browser-test/notes/MESSUNG-payloads.md` describes. Small, but it has only
  ever gone one way, and the guard reports contents rather than size, so nothing fails when it grows.
  `TODOS.md` already carries "freeze the module-graph audit"; a size budget belongs beside it, and the
  numbers to set it from are in the note.

- **An own Button inside `PhiButtonControl`.** The antd Button is on every Public page, and with it
  Collapse and the color-picker: `antd/es/button/style/token.js` imports `isBright` from
  `color-picker/components/ColorPresets`, which imports `Collapse` and `@rc-component/color-picker`. On the
  Landing that is ~40 kB raw for the Button (wave, styles) and ~22 kB for the chain; Turbopack's
  unused-export/-import removal does not cut it (measured 02.10., same bytes), and an alias onto antd
  internals would be a shim in the Skeleton's config. Every Button we render goes through the Control,
  submit buttons included -- an antd Form submits on the native `submit` event, so a plain
  `<button type="submit">` keeps `onFinish`. Scope: variants, sizes, loading and disabled, icon, `danger`,
  the antd CSS variables for the look. Buttons antd draws inside its own components (Modal footer,
  Popconfirm, `Input.Search`, DatePicker, Upload) keep the antd Button and bring it when they load.
  Check every submit path (`htmlType`, form footers) before building. An upstream PR moving `isBright` to
  `color-picker/util` would remove the chain alone: ant-design/ant-design#59461 (02.10.).
- **Freeze the module-graph audit.** `pnpm audit:graph` exists but is not part of `pnpm verify`. Set its
  output budget and failure thresholds, then add it.
- **Generated-output budget report** for the Skeleton's development build, separating Turbopack cache,
  source maps, server chunks, and browser chunks.

## Contracts

- **Machine-readable JSON schemas.** Signal `valueSchema` ids are enforced by TypeScript readers and
  emitters only. Add a runtime schema registry once the controller and Widget schema inventory is stable.
- **Keep `scopeKey` separate from signal routing.** Audit new `scopeKey` uses; never derive a signal scope
  or receiver from it.

## Operations

- **CMS backup/restore and portable transfer.** Exact backup/restore that preserves canonical CMS instance
  ids and DB sequences; portable export/import into a target Draft with central id allocation and atomic
  remapping of structural, signal-route, controller/form, and module-owned references. Define the transfer
  scope (media binaries, Site configuration, content records) first.
