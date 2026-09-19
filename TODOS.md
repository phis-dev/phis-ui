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
- **Normalize Preset Content roots to vertical Flex.** Audit first-party Page presets and use a vertical
  Flex Layout as the Content Region root, keeping another root only where the Page has a semantic reason.
  The legacy Content Layout path is still registered.
- **Wrap the uncontrolled Ant Design primitives in Phi Controls.** `scripts/validate-control-boundaries.mjs`
  **permits everything it does not name**, so the exception is not a short list somebody chose -- it is
  whatever nobody has got to yet. **The reason to close it is that Ant Design is replaceable in principle
  and every direct import makes replacing it harder:** with a Control it is an adapter change, without
  one it is a tree-wide edit.

  It started at 28 named primitives against about 25 uncontrolled ones. It now names 40, closes five
  more to a single owner file, and leaves eight: `Card`, `Col`, `Collapse`, `Descriptions`, `Layout`,
  `List`, `Row`, `Space`.

  `App`, `ConfigProvider` and `theme` stay direct: they are the root and theme adapters AGENTS.md
  already exempts, not feature surface.

  **Not every primitive wants the same answer.** Four outcomes, and picking the wrong one is how a
  wrapper ends up being written for something that should have been deleted:

  - **A Control**, where there is platform semantics to own -- a normalized contract, defaults the
    platform should decide once rather than at each call site:
    ~~`Upload`, `Progress`, `Skeleton`, `Empty`, `Tooltip`, `Avatar`~~ done; `Collapse`,
    `Descriptions`, `Card` and `Space.Compact` (which is a different thing from `Space`, see below)
    remain.
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
  - `Typography` is `PhiTypographyControl`, decided. `PhiTextControl` is **taken** -- it is antd `Input`.
    So is `PhiAnchorControl`: `components/controls/phi-anchor-control-contract.ts` is about placement
    anchors (`topLeft`…`bottomRight`), not antd `Anchor`. Both names are settled before the first commit,
    not during it.
  - `Descriptions` has to move off the `Descriptions.Item` children form (deprecated since antd 5.8) in
    `observability/widgets/log-detail`; `core/widgets/form-preview` already uses `items`.

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
  `PhiNameControl`, `PhiAvatarControl`~~ -- done. Next `Card`/`Collapse`/`Descriptions`, then the
  deletions, then `Listy`, and the allowlist last.

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
