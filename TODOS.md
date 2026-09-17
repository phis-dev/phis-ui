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
  capabilities to `controller:@phis/ui/form-builder:default`. Reuse the `form_definitions` revision
  statuses; do not add another Form table.

## Media and Theme

- **Media Inspector variant hand-over.** The Inspector always simulates the variant crop from the original
  (`components/media/phi-asset-inspector-section.tsx`) and never shows the generated variant. Decide
  whether that stays and the contract says so, or whether unsaved focal edits get an owner and the preview
  switches to the regenerated variant after save.
- **Module fonts: `phis module` does not write the fonts projection.** The Site scaffold writes
  `src/generated/site-modules-fonts.ts`, but `phis module add/del/sync` does not update it, and packages
  installed from a tarball are not added to `transpilePackages`.
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
