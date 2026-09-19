# Open work

Open work only, grouped by area. Binding contracts live in the contract documents; designs live in
[design/](./design/README.md). A contract extension named here still needs operator approval before it is
built. Remove an entry when it is done.

## Code hygiene

- **Remove dead value exports.** Named exports with no consumer in phis-ui, the Skeleton, phis-server,
  or the sibling Module packages -- each name below appears only at its definition:
  `NAV_ITEMS`, `PRODUCT_PANELS` (helpers/site-structure.ts); `canAccessPage` (helpers/access.ts);
  `isApiV1Path`, `isMedusaApiPath`, `buildLocalProxyPath` (helpers/site-api.ts); `PHI_MOTION`
  (theme/antd-css-var-contract.ts); `matchesPhiCmsVisibility`; `getPhiSiteLocaleConfig`;
  `PhiRuntimeModuleAuthoringHost`; `PHI_SIGNAL_CHANNELS`, `findPhiSignalRouteByKey` (types/signals.ts);
  `PHI_STACK_SIGNAL_CHANNEL`; `PHI_PAGE_TITLE_SIGNAL_KEY`; `deletePhiImagePreviewStore`,
  `removePhiImagePreviewAsset`, `setPhiImagePreviewDateRange` (components/media/phi-image-preview-store.ts);
  `usePhiAssetCollectionRuntime`; `PhiCmsRegionStatus`; the `*_PLUGIN_TYPE` constants in
  `components/layouts/plugins/`; `serializePhiCmsRenderableBlockConfig`,
  `deserializePhiCmsRenderableBlockConfig`, `stripPhiCmsRenderableBlockConfigDefaults`,
  `serializePhiCmsDirectionalLayoutConfig`, `deserializePhiCmsDirectionalLayoutConfig`, and
  `serializePhiCmsWidgetConfig` (helpers/cms-config-serialization.ts). Keep deliberate public entry
  points such as `phisUiLogger` (net/log.ts) and mark them as such; re-scan before deleting.
- **Convert concrete preset builders to local-key templates.** Some first-party preset builders still
  return concrete trees with synthetic ids (for example
  `components/regions/presets/phi-default-site-area-preset-tree.ts`), so the central instantiator is not
  yet the only node-construction authority.

## Layouts and Widgets

- **Collapsible Layout open-state emit.** The Collapsible Layout listens to `openSlotKeys`,
  `activeSlotKey`, `activeSlotIndex`, and `slot` signals but emits nothing
  (`components/layouts/clients/phi-collapsible-layout-client.tsx`). Add a symmetric open-state change
  emit. No consumer needs it today.
- **Generic float-button Widget.** A Widget over antd `FloatButton` behind a Phi Control, with
  config-driven placement, icon, and badge, emitting activation like the button Widget.
- **Control badge adoption from real use cases.** The badge contract exists for button and toolbar.
  Evaluate basket, support inbox, and similar domain buttons one by one; migrate only where the generic
  receiver contract fits without losing domain semantics.
- **A Statistic Widget.** `PhiStatisticControl` exists and has one caller, the Theme inspector. The
  second is a Widget of its own, so a Site can put a figure on a page -- a count, a total, a rate --
  with `title` and `value` as config and the Control deciding presentation. Placing it is the point:
  the Theme inspector's three are a fixed internal readout, where a Widget is the general case.
- **A record Widget, over one row of a table Provider.** `PhiDescriptionListControl` exists and has two
  callers. The Widget is the general case of what `observability/widgets/log-detail` already is: it
  listens for a row identity on the signal bus, calls `provider.readRecord({ resourceKey, rowIdentity,
  params, signal })`, and draws the record as named values. Nothing in that is missing -- `recordRead`
  is part of the table Provider contract, `executionMode: "static"` is available to table Providers with
  their `resources` declared in the descriptor, so a Site can have a record without a server, and the
  resource's `fields` carry the labels through the label set the way column titles already travel.

  **The field definition is `PhiTableColumnDefinition` minus sorting, width and sticky**, and that is the
  point: `renderer` (`text`, `datetime`, `tags`, `code`, `json`, `link`, …) with `valueMap`,
  `tagColorMap` and `tagVariant` already covers every value `log-detail` draws by hand -- and the
  `<pre>{JSON.stringify(meta, null, 2)}</pre>` under it is the `json` renderer, written out. No new
  vocabulary, half an existing one.

  **The author picks the fields**, the way the table Widget lets an author pick columns, rather than the
  Widget showing whatever the resource declares. That needs a field picker in the Builder Inspector,
  which is the real work in this entry.

  Afterwards `log-detail` is the Widget plus a `json` field, and its `record as LogRow` cast goes -- the
  Widget claiming a shape the Provider never promised it is what this replaces.
- **Normalize Preset Content roots to vertical Flex.** Audit first-party Page presets and use a vertical
  Flex Layout as the Content Region root, keeping another root only where the Page has a semantic reason.
  The legacy Content Layout path is still registered.
- **Wrap the uncontrolled Ant Design primitives in Phi Controls.** `scripts/validate-control-boundaries.mjs`
  **permits everything it does not name**, so the exception is not a short list somebody chose -- it is
  whatever nobody has got to yet. **The reason to close it is that Ant Design is replaceable in principle
  and every direct import makes replacing it harder:** with a Control it is an adapter change, without
  one it is a tree-wide edit.

  It started at 28 named primitives against about 25 uncontrolled ones. It now names 43, closes five
  more to a single owner file, and leaves five: `Col`, `Layout`, `List`, `Row`, `Space`.

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
  - **Deletion**, where the direct use should stop rather than be wrapped -- see the next entry.

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

  Two conditions, or the work makes things worse rather than better. **A Control passes its primitive's
  contract through rather than inventing props**, which is what keeps the migration mechanical and keeps
  the Controls from becoming a second styling vocabulary. And **the validator should end up refusing by
  default** -- an allowlist of what may be imported directly, rather than today's list of what may not --
  because otherwise the next primitive somebody reaches for is permitted again by omission and this
  entry has to be rewritten a third time. `pendingControlAdoptions` is the tool for getting there before
  all the Controls exist: a primitive joins `controlledPrimitives` together with its remaining sites, and
  the sites are cleared one at a time.

  **The validator has a hole that the allowlist must close.** Type imports are skipped deliberately, so
  `UploadProps`, `CollapseProps` (including `CollapseProps["items"]` as a return type), `DataNode`,
  `InputRef` and `TextAreaRef` reach past it today. A type import costs a library swap exactly as much as
  a value import, and a rule that checks only values moves the workaround from `import {` to
  `import type {`. The deep-path check has the same gap: its pattern matches only a default value import,
  so all seven `antd/es/*` sites in the tree are type-only and therefore invisible. The theme types
  (`GlobalToken`, `AliasToken`) stay exempt as part of the theme adapter.

  Order: ~~the two big pass-throughs (`Flex`, `PhiTypographyControl`), the five owner entries, the
  trivial wrappers, `PhiFileDropControl` with `Progress`, `PhiSkeletonControl`, `PhiEmptyControl`,
  `PhiNameControl`, `PhiAvatarControl`, `PhiCardControl`, `PhiAccordionControl`,
  `PhiDescriptionListControl`~~ -- done. Next the record Widget below, then the deletions, then `Listy`,
  and the allowlist last.

  Until the Controls exist, direct use in a Widget or Layout stays correct and the validator keeps
  permitting it: this is a planned narrowing, not a rule being broken today. Update the validator's own
  comment, the AGENTS.md line and `components/widgets/README.md` when it lands, since all three currently
  read as settled.
- **Delete the footer Widget, and three antd primitives with it.**
  `plugins/runtime-modules/core/widgets/footer/` is the only place in the tree that imports `Row`, `Col`
  and `Layout`, because it builds its own three-column responsive grid (`<Row gutter={[16,16]}>` with
  three `<Col xs={24} md={8}>`) and a `Layout.Footer`. It also carries a `Divider` and a
  `const { Text } = Typography`.
  **It is placed nowhere.** `PhiCmsWidgetType.Footer` appears only in the Widget's own files and in the
  client manifest; the default preset tree builds the footer from the `footer_top`, `footer_main` and
  `footer_bottom` Regions (`components/regions/presets/`, `family: "footer"`) with ordinary Widgets. So
  the Widget is a second way to do what the Regions already do -- and the way that reimplements layout
  inside a leaf, which the Widget contract forbids in every other case.
  A three-column Layout placed in the footer Region is the whole replacement. Remove the Widget, its
  registrations and its labels; the `Divider` goes too, since a Region draws its own separator through
  `border` ([LAYOUTING.md](./LAYOUTING.md)). Four primitives leave the list without a wrapper being
  written for any of them.
- **Migrate off antd `List`, which is deprecated.** antd 6.6.4 warns at runtime: *"The `List` component
  is deprecated and will be removed in the next major version. If you're using version 6.6.0 or later,
  please use `Listy` instead."* Two sites: `auth/widgets/security/client.tsx` (three lists, each with
  `List.Item.Meta` and `actions`) and `core/widgets/slot-upload/client.tsx`.
  `Listy` is not a renamed `List`: `dataSource` becomes `items`, `renderItem` becomes `itemRender`,
  `rowKey` is required with no default, and `List.Item.Meta`/`actions`/`extra` are rebuilt as plain JSX
  rather than preset structures. `locale.emptyText` has no equivalent, which is why `PhiEmptyControl`
  came first -- each `emptyText` becomes an explicit `<PhiEmptyControl description=… />`.
  Neither site uses `grid`, `pagination` or `loadMore`, so nothing here hits the parts the antd FAQ
  advises against migrating. **A `PhiListControl` that passes the old `List` API through would be the
  wrong investment** -- if it is wrapped at all, it is cut against `Listy`.

## Regions and Overlays

- **Parameterized Region shape dividers.** One Region-edge contract for optional top and bottom
  decorations, rendered centrally by the Region container. Scope: `header_bottom.bottom`, `hero.top`,
  `hero.bottom`, `footer_top.top`. Closed shape catalog (wave, layered wave, zigzag, curve, slope) with
  validated ids and bounded parameters, never raw SVG or path data. Static inline SVG outside Region layout
  metrics; optional transform-only, reduced-motion-safe animation that a static Region never loads.
- **Modal sizing.** OVERLAYS.md makes `controlSize` the Modal sizing path, but `PhiCmsOverlayConfig` still
  accepts `width` (types/cms-overlay.ts) and the auth and avatar Overlay presets persist a responsive
  `width` beside `controlSize`. Either drop `width` from Modal config or admit it in the contract.
- **Overlay authoring in Builder.** Designed in [design/OVERLAY_AUTHORING.md](./design/OVERLAY_AUTHORING.md).

## Builder

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

## Verification

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
