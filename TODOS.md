# Open work

Open work only, grouped by area. Binding contracts live in the contract documents; designs live in
[design/](./design/README.md). A contract extension named here still needs operator approval before it is
built. Remove an entry when it is done.

## At the next release

- **`checkPhiPagePresetLayout` and `PhiPageLayoutFinding` moved from `@phis/ui/helpers` to `@phis/ui/module/page-check`.** A package that runs the Page check in its tests changes its import when it moves to the release that carries this.
- **Released as `@phis/ui` 0.5.0 together with `@phis/server` 0.3.0** (both already in `package.json`). The
  Media management responses carry `focalRect` and `font` instead of `meta`, and the Asset PATCH takes
  `focalRect`: this `phis-ui` against an older Server reads no focal rectangles or font metrics, and an older
  `phis-ui` against the new Server loses them in the editor. Details in `phis-server/TODOS.md`, "At the next
  release". Packages that peer-depend on `workspace:^` pick up `^0.5.0` at their next publish.
- **Module graph budget raised by about 22 KiB** (`scripts/audit-module-graph.budget.json`, every
  `./cms/plugins/*` and `./next/areas/*` entry) for the Admin Media storage settings: their form, labels,
  settings reader and profile choices belong to the asset Module, whose definition every Area loads.

- **Accounting has a staff shell; stored Accounting shells must go.** The Accounting Area now composes the
  header bar and the sidebar on `accounting:sidebar` as the Admin does, with an "Admin" Area target at the
  end. A stored Area revision always wins over the preset, and both Sites on prod hold one (scopes 14 and
  18), so after deploying: clear each Site's Accounting shell back to its preset in the Builder's Revisions
  (the Area delete, `/api/site/cms/area/override`) and, where the Site's Accounting Modules differ from the defaults
  (`dashboard`, `threads`) -- phis.dev has the Shop on -- switch them on again in the Builder's Modules;
  that save stores the new shell. dev.phis.dev was reset on 14.11.2026.

## Code hygiene

- **Convert concrete preset builders to local-key templates.** Some first-party preset builders still
  return concrete trees with synthetic ids (for example
  `plugins/runtime-modules/phi-default-site-area-preset-tree.ts`), so the central instantiator is not
  yet the only node-construction authority.

## Layouts and Widgets

- **Control badge adoption from real use cases.** The badge contract exists for button and toolbar.
  Evaluate basket, support inbox, and similar domain buttons one by one; migrate only where the generic
  receiver contract fits without losing domain semantics.

## Regions and Overlays

- **A Header band's `offsetTop` reserves its room.** Today the offset is only the sticky `top`: a
  floating `header_main` at `offsetTop: 16` is pushed 16px down at rest but holds only its own height in the
  grid, so on a Page without a Hero the content starts under the bar (dev.phisys.com's login and reset
  pages, 2026-11-15). Until then a floating Header keeps its gap as Region padding (`paddingTop` plus the
  height grown by it, `offsetTop: 0`), as phisys does in Area revision #51. Reserving it touches, together:
  the Region root (a block-start margin of the offset, not for a `hover` band, which takes no room); the
  Header Chrome Pane (it spans the grown track and sticks at the offset, so its start and height have to
  leave the gap out, `resolvePhiShellChromePaneStickyTop` and the `header_top` reveal cases with their
  travel); the Hero rules in `styles/shell.css` (each band set down by its own offset too) and
  `use-phi-shell-header-bands.ts` (a band's room includes its offset); and the first-paint band rooms in
  `phi-cms-root-layout.tsx`. Check in a browser: a floating box and a full band with glass, each with and
  without a Hero, and with a `scroll-up` and a `hover` `header_top`.

- **Group headings in a dropdown navigation.** `mapPhiNavItems` (components/shell/menu-items.tsx) turns
  every entry with children into a submenu, so a third level opens sideways (Docs ▸ Architecture ▸
  Server). `PhiMenuControl` already draws antd's `type: "group"`; nothing maps to it. Wanted: inside a
  dropdown, an entry with children and no address of its own stands as a heading over its children
  instead. Decide whether that is the rule or a flag the navigation item states, and how the Sider (inline
  menu) and the mobile drawer show it. First user: the Docs entry of `@phis/dev`, which uses submenus until
  then. A first cut as an implicit rule (2026-11-13) was taken back: the Builder's
  navigation table did not show it, a user could steer it only by giving a container an address, and it
  changed existing headers unasked. The candidates now: a presentation flag on the entry (default
  submenu; the table edits it, a preset may set it, each menu decides what it does with it), or a switch
  on the Header Navigation Widget.

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

- **Record template pages.** Owner's decision (2026-11-15): a dynamic route preset (`/shop/p/:slug`,
  a content entry's detail page) gets a template that authors rebuild in the Builder and that serves every
  record, and any Module can provide one. Designed in [design/RECORD_TEMPLATES.md](./design/RECORD_TEMPLATES.md);
  its open points are to be decided before code. The shop's product page is the first one.
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
- **`Hidden` and `Collapsed` Folder flags have no reader and no control.** `Locked` is read and set
  (components/media/media-folder-lock.ts, the Media page's lock button). `Hidden` and `Collapsed` are
  display state Core does not enforce: the Folder list should leave a hidden Folder out unless asked to
  show it, and start a collapsed one collapsed; both need a control as well. The Folder filter is a
  Cascader, which has no collapsed state of its own -- say first what "collapsed" means there. Two lock
  refusals still arrive without Core's code and read as the server's English: moving an Asset
  (`PATCH /api/site/media/{id}`, plain `error` text) and the Folder Form (`/api/v1/forms/media-folder`,
  `ok: false` with text); the upload route says `folder_locked` where the others say
  `media_folder_locked`. Core change, then the Asset metadata and Folder Forms map it.
- **`inverse` has no ground of its own.** A Surface toned `inverse` paints the other mode's Chrome
  Overlay (`styles/shell.css`, the tone rules). A Theme whose Chrome is glass -- phis.dev's is 55 % white or
  ink -- gives an inverse box a near-transparent ground, and its inverted text sits on the page's own
  ground: light text on a light page. Seen on the phis.dev footer (2026-11-13), now a stated colour per
  mode instead. A Theme needs a way to say what an inverted box stands on -- an opaque ground per mode
  for `inverse`, or the rule that `inverse` never reads a translucent Chrome. Contract question.
- **Theme CSS variables lose the `ant-` prefix.** Owner's decision (2026-11-15): a Theme variable is
  not to carry Ant Design's name any more. Today `cssVar.prefix: "ant"`
  (`components/root/phi-root-theme-resolver.ts`) names every token variable `--ant-*`, the Theme's own
  tokens included (`phiPageMax` → `--ant-phi-page-max`). About 560 references in some 90 files of this
  repo read them, as do `antd-css-var-contract.ts` (`PHI_PAGE`, `PHI_SPACE`, …), `styles/*.css` and the
  packages. To settle first: the new prefix, and how it lives beside the variables Phis already sets
  under `--phi-*` (`--phi-font-source-*`, `--phi-shell-band-*`, the control-shape variables). A
  `phi` prefix with own keys still starting `phi` gives `--phi-phi-page-max`, so the own keys drop
  their `phi` then. The class prefix (`.ant-menu-item` and so on) is a separate setting and not part
  of this. Stored data names the variables as text: Region and Widget configs on prod hold
  `var(--ant-padding)` (site 1, Area revision #51, `header_main`). Sweep them per installation with
  the release, no fallback for the old names. The packages (shop, phisys, dev) move to the new names
  in the same round.
- **A Theme page gutter beside `pageMax`.** Owner's decision (2026-11-15): the left and right padding
  of a page's content column is a Theme setting, as its width is (`PHI_PAGE.max`, THEME.md "Page
  width"). The presets (login, password reset and the other Core pages) and the packages' pages read
  it, so a Site sets it once instead of overriding every preset page, which would cut those pages off
  from later preset changes. Open: the token name and default (first read what each preset pads with
  today), whether it changes at the 987 "wide" threshold, and its Brand Control field next to
  "Page Width".

## Threads

- **A thread lock refused mid-reply reads as Core's English.** The lock is shown and set (inbox row
  actions Lock/Unlock, the conversation's tag and notice in place of the Reply). A reply sent into a
  thread locked after its dialog opened is refused with `400 { error: "This thread is locked." }` -- no
  code, the same status as every other `PhisThreadError` -- so the Reply Form cannot read it as a lock.
  Core should answer a code (`thread_locked`, `409`), then the Form maps it. The open conversation is not
  told when a row action locks, archives or reopens it; a Table's provider action emits nothing a
  Controller could forward as `threadReload`. Add-ons have no capability method for the lock yet; that
  is a contract extension.
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

- **admin/locales: say where new translations are made.** The list shows only translations that exist
  (`listSiteTranslations` joins from `tr_site_lang`), so a locale without any -- English on a German-source
  Site -- shows "No site translations exist for this language yet." and nothing more. The empty state
  should say that new translations are entered in Editor > Translations and link there
  (components/widgets/label-sets/admin-locales.ts `empty_text`). The split stays: Admin manages, the
  Editor translates.
- **Last use of a text in the translation Tables.** The data exists -- do not build or measure it again:
  phis-server keeps the day a message was last read in `phis.tr_msg_usage` / `phis.tr_site_msg_usage`
  (`msg_id`, `last_used_on DATE`), written at most once per message and day by
  `src/db/translation-usage.ts` (`notePhiTranslationUse`, called from the lookups in
  `src/db/translations.ts`), reported by `phis translations usage` (TRANSLATIONS.md "When a message was
  last read"). Missing is only the display: `listSiteTranslations` and the Editor list query in
  phis-server `src/db/translations.ts` join `tr_site_msg_usage` and return `lastUsedOn`, and the
  admin/locales and Editor Translations Tables get a date column for it. No usage row means "not read since
  tracking began"; a text only ever shown in its source language is never counted as read.

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
- **Generated-output budget report** for the Skeleton's development build, separating Turbopack cache,
  source maps, server chunks, and browser chunks.

## Contracts

- **Machine-readable JSON schemas.** Signal `valueSchema` ids are enforced by TypeScript readers and
  emitters only. Add a runtime schema registry once the controller and Widget schema inventory is stable.

## Operations

- **Page title `display` sweep on each installation, with the release that brings it.** The Page title
  Widget is a heading (`h1`) unless its config says `display: "label"`, and stored Area revisions still
  hold the Shell header's title with `config: {}`: walk `site_area_revisions.tree_json` and give every
  `.../widgets/page-title` node without `display` the value `"label"`. Done on dev (9 revisions); prod
  `phis_prod` has 13 waiting. Remove this entry once prod is swept.

- **CMS backup/restore and portable transfer.** Exact backup/restore that preserves canonical CMS instance
  ids and DB sequences; portable export/import into a target Draft with central id allocation and atomic
  remapping of structural, signal-route, controller/form, and module-owned references. Define the transfer
  scope (media binaries, Site configuration, content records) first.
