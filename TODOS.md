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

- **Control badge adoption from real use cases.** The badge contract exists for button and toolbar.
  Evaluate basket, support inbox, and similar domain buttons one by one; migrate only where the generic
  receiver contract fits without losing domain semantics.
- **Dashboard Cards hint with the browser's `title`, not a Tooltip.** On the Admin Dashboard the Cards
  show their hints as native `title` attributes -- the browser's delayed, unstyled bubble, unreachable
  by touch and outside the Theme. The house has a Tooltip (`PhiDescriptionTooltipIcon` and the antd
  Tooltip behind it, inside `components/controls/`); the Cards' hints move onto it, and no Card or
  card Control sets a native `title` on an element. Find the sites by rendering the Dashboard, not by
  grep alone: the attribute may come from a Control's ellipsis or from antd. Noted 2026-11-09 for the
  next release.

## Regions and Overlays

- **Group headings in a dropdown navigation.** `mapPhiNavItems` (components/shell/menu-items.tsx) turns
  every entry with children into a submenu, so a third level opens sideways (Docs ▸ Architecture ▸
  Server). `PhiMenuControl` already draws antd's `type: "group"`; nothing maps to it. Wanted: inside a
  dropdown, an entry with children and no address of its own stands as a heading over its children
  instead. Decide whether that is the rule or a flag the navigation item states, and how the Sider (inline
  menu) and the mobile drawer show it. First user: the Docs entry of `@phis/dev`, which uses submenus until
  then.

- **Parameterized Region shape dividers.** One Region-edge contract for optional top and bottom
  decorations, rendered centrally by the Region container. Scope: `header_bottom.bottom`, `hero.top`,
  `hero.bottom`, `footer_top.top`. Closed shape catalog (wave, layered wave, zigzag, curve, slope) with
  validated ids and bounded parameters, never raw SVG or path data. Static inline SVG outside Region layout
  metrics; optional transform-only, reduced-motion-safe animation that a static Region never loads.
- **An Overlay is a block, and should be sized like one.** Responsive block geometry is built
  (design/RESPONSIVE_BLOCK_GEOMETRY.md). Remaining: `PhiCmsOverlayConfig` adopts `size`/`minSize`/`maxSize`
  from the block contract (a Modal states its viewport limit as `maxSize` in `vw`), the presets restate
  their 400-720px widths and the auth floor as `minSize`, and then `width` goes -- with it the viewport
  `{xs, md, lg}` / `PHI_MODAL_RESPONSIVE_MIN_WIDTH` handed to antd, the Drawer's single-length `size`
  and its bare-number `maxSize`. `controlSize` stays.

- **What the Shell is on a phone.** The Sider becomes a drawer below 768px (`MobileDrawer`, SHELL.md);
  other Regions are still only hidden by `viewportFlags`. Idea, not design: gather the navigation items
  header, sider and footer contribute into one menu. To decide first: which Regions contribute, what
  orders them, and who collects without becoming the one place that knows every Area's presets
  (NEXT_INTEGRATION.md forbids that).

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
- **Folder flags have no reader and no control.** `PhiMediaFolderFlags` travels in the Folder payload and
  nothing here reads it. Core now enforces `Locked` (2026-11-10): a locked Folder is not renamed, moved
  or deleted, and nothing is created in it, uploaded into it, moved into or out of it or deleted from it;
  the request answers `409` with `media_folder_locked`. The Media workspace needs a control that sets and
  clears the lock, has to show a locked Folder as locked and keep its own actions from being offered on
  it, and has to say why when Core refuses. `Hidden` and `Collapsed` are display state Core does not
  enforce: the Folder tree should leave a hidden Folder out unless asked to show it, and start a
  collapsed one collapsed; both need a control as well.
- **`inverse` has no ground of its own.** A Surface toned `inverse` paints the other mode's Chrome
  Overlay (`styles/shell.css`, the tone rules). A Theme whose Chrome is glass -- phis.dev's is 55 % white or
  ink -- gives an inverse box a near-transparent ground, and its inverted text sits on the page's own
  ground: light text on a light page. Seen on the phis.dev footer (2026-11-13), now a stated colour per
  mode instead. A Theme needs a way to say what an inverted box stands on -- an opaque ground per mode
  for `inverse`, or the rule that `inverse` never reads a translucent Chrome. Contract question.

## Threads

- **A locked thread looks like any other.** Core refuses every new message into a thread that carries
  `PhisThreadFlag.Locked` (2026-11-10) and takes `locked` on `PATCH /api/site/threads/{id}` from whoever
  may change the status. The Threads Module needs the control that sets and clears it, has to show the
  state in the conversation and its list, and has to put the composer out of use instead of letting a
  message be written and then refused. Add-ons have no capability method for the lock yet; that is a
  contract extension.
- **`Muted` waits on thread notifications.** A participant's `Muted` flag is reserved in Core: nothing
  notifies a participant of a thread message today, so there is nothing to silence and no setter. The
  control belongs with the notifications when they are built.

## Translations and preferences

- **Count-aware plural translation.** Add one plural contract to the central translation and placeholder
  formatter before Widgets branch on singular/plural locally -- two already do (`count_one` in
  components/widgets/label-sets/search-results.ts, `configuredPlural` in
  components/widgets/label-types/effects.ts). Providers keep returning scalar counts.
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
- **Module distribution.** Local and resolved install via `phis module add|del|sync` exists. Still
  missing: acquisition from a source (a list with version, digest, minimum `phisVersion`), two-half
  packages, provenance (resolved version, lockfile integrity, stated digest) and update checks. Designed
  in [design/MODULE_DISTRIBUTION.md](./design/MODULE_DISTRIBUTION.md) and phis-server design/DISTRIBUTION.md.
- **Say what a Site loses before it switches a Module off.** The Module's own blocks are reported
  (module-usage, in the Builder and in `phis module del`; a failed read refuses). Still missing: its
  item renderers named by Collection Views, signal routes to its receivers, data-provider bindings to
  its resources, and the same check again on publish. Not a fallback: the block still refuses to draw
  something other than what was chosen.

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
  endpoint and operator approval.

- **The Builder got heavier and nobody said why.** Measured against production builds two weeks apart,
  between 2026-09-09 and 2026-09-24, the Builder gained **18 scripts, 169 kB over the wire and 479 kB
  decoded** on a cold load of `/builder/phis/ui/dashboard`. In the same fortnight
  Public and the landing page each *lost* around 180 kB over the wire and 600 kB decoded.

  The Builder is the surface with the smallest audience and the largest load, so a rise there is the one
  that should be argued for rather than noticed later. Find what joined its graph and either justify it
  here or move it out.

- **The Public bundle drifts upward unremarked.** 2026-09-21 to 2026-09-24: **+5,320 raw and +1,457
  gzip**, same script count, measured against a production server. Small, but it has only
  ever gone one way, and the guard reports contents rather than size, so nothing fails when it grows.
  `TODOS.md` already carries "freeze the module-graph audit"; a size budget belongs beside it, set from
  the figures above.

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
