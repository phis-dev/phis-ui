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
- **Normalize Preset Content roots to vertical Flex.** Audit first-party Page presets and use a vertical
  Flex Layout as the Content Region root, keeping another root only where the Page has a semantic reason.
  The legacy Content Layout path is still registered.
- **Wrap the uncontrolled Ant Design primitives in Phi Controls.** `scripts/validate-control-boundaries.mjs`
  names 28 controlled primitives and **permits everything it does not name**, so the exception is not a
  short list somebody chose -- it is whatever nobody has got to yet. The tree actually imports about 25
  uncontrolled ones. **The reason to close it is that Ant Design is replaceable in principle and every
  direct import makes replacing it harder:** with a Control it is an adapter change, without one it is a
  tree-wide edit.

  `App`, `ConfigProvider` and `theme` stay direct: they are the root and theme adapters AGENTS.md
  already exempts, not feature surface.

  **Not every primitive wants the same answer.** Four outcomes, and picking the wrong one is how a
  wrapper ends up being written for something that should have been deleted:

  - **A Control**, where there is platform semantics to own -- a normalized contract, defaults the
    platform should decide once rather than at each call site:
    `Upload`, `Progress`, `Skeleton`, `Empty`, `Tooltip`, `Collapse`, `Descriptions`, `Card`, `Avatar`,
    and `Space.Compact` (which is a different thing from `Space`, see below).
  - **A thin pass-through**, where there is nothing to decide and the wrapper exists only so the import
    points at us: ~~`PhiTypographyControl` (~63 files), `Flex` (~60)~~ done; `Divider`, `Spin`,
    `QRCode`, `Statistic` remain.
  - ~~**An owner entry only** -- the Widget that already wraps the primitive *is* the contract, so no
    new file is needed, just an entry naming it: `Anchor`, `Breadcrumb`, `Image`, `Result`, `Badge`.~~
    Done, as `soleOwnerPrimitives` in the validator. It is checked both ways: nobody else may import
    one, and an owner that stops importing it fails too, so a stale entry cannot sit there looking like
    a decision.
  - **Deletion**, where the direct use should stop rather than be wrapped -- see the next entry.

  Specifics worth not rediscovering:
  - `Upload`: **Ant Design never transports anything.** Two uses return `false` from `beforeUpload`, one
    returns `Upload.LIST_IGNORE`, and `components/media/phi-area-upload-widget.tsx` overrides
    `customRequest` to call `runPhiMediaUploadSession`. What is left is a file dialog and a drop target,
    so the Control is `PhiFileDropControl` -- named for what it does, since it does not upload --
    carrying `accept`, `multiple`, `disabled`, `dropZone`, `onFiles`, `children`, and nothing of
    `fileList`, `showUploadList`, `beforeUpload`, `customRequest` or `LIST_IGNORE`. `Progress` comes
    with it: all four uses render an upload percentage, three linear and one circular.
  - `Empty` before the `Listy` migration: both `List` sites set `locale.emptyText`, and migrating turns
    those into explicit empty states. Six `Empty` sites make the image/label choice six different ways
    today.
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

  Order: the two big pass-throughs first (`Flex`, `PhiTypographyControl` -- mechanical, and together most
  of the sites), then the five owner entries, then the trivial wrappers, then `PhiFileDropControl` with
  `Progress`, then the loading family (`Skeleton`, `Spin`), then `Empty`/`Tooltip`/`Card`/`Collapse`/
  `Descriptions`, then the deletions, then `Listy`, and the allowlist last.

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
  rather than preset structures. `locale.emptyText` has no equivalent, which is why `Empty` comes first.
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
