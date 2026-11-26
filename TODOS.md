# Open work

Open work only, grouped by area. Binding contracts live in the contract documents; designs live in
[design/](./design/README.md). A contract extension named here still needs operator approval before it is
built. Remove an entry when it is done. An entry that asks for a Widget or a Form field type that does not
exist yet names it on a line of its own -- `` Wants: Widget `<typeKey>` ``, `` Wants: form field `<key>` `` --
and `scripts/validate-todos-wants.ts` refuses the entry once the catalog has one by that key.

## At the next release

- **Link previews need the next contracts and Core release (2026-11-24).** `@phis/ui` names the share
  variant (`PhiImageAssetVariantKey.Share`, `PhiImageAssetVariantSpec.flags`) from `@phis/contracts/media`,
  and only a Core that renders variant 11 serves the picture; an older Core answers 404 for it, and a
  preview shows the title and description without a picture. Release contracts, then Core, then `@phis/ui`.

- **`sanitize-html` 2.18.2 reaches Sites with this release.** A fresh Site's `npm audit` listed moderate
  advisories fixed in 2.18.0 (GHSA-x3q4-9hxx-gx8m, GHSA-374f-7chj-9948, GHSA-cv27-6wvh-8x7j) against the
  2.17.7 pin; this package and `@phis/server` pin 2.18.2 since package update round 1 (2026-11-25).
- **`phis.testedWith` reaches Sites with this release.** The peer range of `next` is `^16.4.6` now, and
  `package.json#phis.testedWith` ships in the manifest; 0.8.1 has neither, so until a release carries the
  field `phis init` pins a new Site to the set phis-server recorded when its CLI was built. A Server
  release builds its fallback set from the newest `@phis/ui` of its line on the registry, so this package
  is released before the next Server (contracts, then `@phis/ui`, then Core).

Steps an installation takes with a release stand under [Operations](#operations).

## People data (`users:v1`)

What the App profile's numbers and addresses, Admin -> Settings -> People data and the Accounting customer
file (THREADS.md section 10) leave open:

- The access log filters take a subject and an Add-on id as typed; a picker of the Site's people by subject
  and of the Add-ons that read people would be options Providers of their own.
- A grant gives an Add-on everything it asks in the background; granting a part of it (the route takes any
  non-empty part) has no dialog yet.
- A Maintainer opening Settings -> People data by its address is refused while the page is built (the
  retention Form's read is the Admin route); the page does not yet answer that inside itself, as the
  customer file does.
- Core's Site member picker (`PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.siteMembers`) names no held value off the
  page it answers (the route takes no ids), so a Form that opens with a person already chosen shows the id
  until it is found.

## Code hygiene

- **Remove the Ant Design 6.7 Form context patch** once Ant Design imports `FormProvider` directly
  (`antd/es/form/context.js`). The patch (`next/antd-form-context-loader.mjs`, the rule in
  `readPhiAntdFormContextPatchRule`, the `./next/antd-form-context-loader` export, THEME.md) keeps the Form
  engine and `async-validator` off every page with a Button: on the landing about 40 kB raw, 17 kB gzip
  and 43 modules less (Turbopack analyzer, 15.11.2026). It applies to 6.7.x only and warns from 6.8 on.
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
- **What the Shell is on a phone.** The Sider becomes a drawer below 768px (`MobileDrawer`, SHELL.md);
  other Regions are still only hidden by `viewportFlags`. Idea, not design: gather the navigation items
  header, sider and footer contribute into one menu. To decide first: which Regions contribute, what
  orders them, and who collects without becoming the one place that knows every Area's presets
  (NEXT_INTEGRATION.md forbids that).

- **Overlay authoring in Builder.** Designed in [design/OVERLAY_AUTHORING.md](./design/OVERLAY_AUTHORING.md).

## Builder

- **A container's title as a link, later.** Owner's idea (2026-11-16): a container with a folder target
  could lead there when its title is clicked, the chevron still opening it. Today every menu draws an
  entry with children as an opener only (`components/shell/menu-items.tsx`). Not before the owner asks;
  the overview as the first child does the job meanwhile.
- **A Page with Pages beneath it stays out** (2026-11-16, decided against for now): it would need a link
  with children in every menu, the Navigation table, the breadcrumb, subtree moves and the server's
  `path_nested` rule. Revisit only with the clickable container title above.

- **Record template pages: what is left.** Template pages for dynamic route presets are built
  ([design/RECORD_TEMPLATES.md](./design/RECORD_TEMPLATES.md), parts 1-3), the shop's product page with them.
  Left: the sample picker (which record the Builder shows a template with), sample values on the canvas,
  and Core Widgets for a record's `list` and `tag` fields.
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

- **A picker outside a Form has no public binding (found by @phis/shop, 2026-11-17).** A Form chooses an
  Asset with the Asset Module's `media-asset` field (FORMS.md). `PhiMediaPickerControl` is public and fully
  controlled; what feeds it -- the provider query, folders, Spaces, paging
  (`components/media/phi-media-picker-binding.tsx`) -- is reachable from inside only, so a Module's own
  Widget cannot open the library. Wanted, if asked for: the binding as a public door, restrictable to the
  Site's Space and to publicly delivered Assets. A collection a picker adds to is the Media renderer's
  (its toolbar action `add`), which needs no door.
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

- **Link previews: what is left (2026-11-24, NEXT_INTEGRATION.md "Link previews").** The Page's own share
  picture (`page.layoutConfig.shareImage`) has no field in the Builder's page-meta dialog yet ("first only
  for AI"); the dialog draft already carries it (`PhiDeveloperBuilderPageMetaDraft.shareImage`), so a field
  only has to edit it. A record picture is shown only when it is a public Asset of the Site Space: the
  reference projection answers no other Space, so a product picture in a supplier's Add-on Space gives no
  preview picture. `@phis/shop`'s product Provider marks no share fields yet (`record.share`: title,
  summary, cover would be the obvious three), and Core's content entry Provider declares no record fields
  at all, so neither record page has a record preview today.

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

- **Count labels in locales with more plural forms.** A count label (TRANSLATIONS.md, "Count labels")
  whose English source gives `one` and `other` reads `other` for Polish or Russian `few` and `many`;
  requesting the missing forms from the translator under their own `plural category` context would close it.
- **User-profile Tooltip preference.** A per-user setting to disable optional Tooltips, resolved centrally
  and applied through the Phi Control adapters; essential validation, warning, confirmation, and
  accessibility text stays available.

- **Last use of a text in the translation Tables.** The data exists -- do not build or measure it again:
  phis-server keeps the day a message was last read in `phis.tr_msg_usage` / `phis.tr_site_msg_usage`
  (`msg_id`, `last_used_on DATE`), written at most once per message and day by
  `src/db/translation-usage.ts` (`notePhiTranslationUse`, called from the lookups in
  `src/db/translations.ts`), reported by `phis translations usage` (TRANSLATIONS.md "When a message was
  last read"). Missing is only the display: `listSiteTranslations` and the Editor list query in
  phis-server `src/db/translations.ts` join `tr_site_msg_usage` and return `lastUsedOn`, and the
  admin/locales and Editor Translations Tables get a date column for it. No usage row means "not read since
  tracking began"; a text only ever shown in its source language is never counted as read.
- **Table texts in the renderer's pass.** An author's Table texts -- column titles, filter and option
  labels, the empty state, footer and summary labels -- stay untranslated: the Table's fields are dotted
  paths (`presentation.columns`, `features.filters`, `presentation.emptyState...`) and
  `collectPhiConfigTexts` (helpers/config-text-fields.ts) reads `config[field.key]` only, and the Table
  translates nothing itself. Module Tables are fine today because they place Label Set text that is
  already translated. Order: (1) let `checkPhiPresetTextSources` (helpers/preset-text-source-check.ts)
  look into nested objects and mark every Module Table that places Label Set text `NoTranslate` --
  `@phis/support`'s conversations and inbox Tables (`src/route-tree.ts`, `flags: 0`) are such cases;
  (2) teach the collector and `writePhiConfigTexts` dotted field paths. Doing (2) first sends German
  Label Set titles to the translator a second time.

## Tables and Markdown

- **`@phis/products`' own product table has no list pictures.** The `image` renderer and `imageFieldKey`
  draw a server's variant address (TABLES.md, "Read renderers"), and the Accounting directory gets
  `imageListPath`/`iconListPath` from `GET /api/site/products`; `products:v1` hands an Add-on only
  `imagePath`/`iconPath`, the originals. Its table needs the `icon` variant's address in the capability
  first (phis-server), not a renderer of a Module's own.
- **The supplier filter of the product directory is a text field.** Choosing a supplier from a list needs
  an Options Provider over the Site's suppliers, and no Core route answers them (`GET /api/site/products`
  answers rows, not their distinct suppliers).

- **A wide Table's pinned Actions column covers the columns before it.** The licence rules Table
  (`@phis/licenses`, ten columns) needs about 1,100 px and gets about 1,000 at a 1,280 px window, so it scrolls
  sideways and the Actions column pinned at the right edge covers State; Admin -> Users shows the same with
  "Last login". Either the package's preset fits its space (Parts without `minWidth: 200`, the code columns
  capped) or phis-ui gives the scroll a stronger cue or stops pinning Actions -- a decision for the owner.
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

- **What is left of moving contract checks out of the browser (owner, 2026-11-24).** Bindings, icons and the
  Form field rules are checked where a config is made (TABLES.md and FORMS.md, "Checked where it is made";
  `checkPhiPresetTables`, `checkPhiPresetForms`, the Builder's save in `gateway/site-cms-write-validation.ts`)
  and no live Client checks them; a Widget that still fails shows its card to Staff on a live page. Open:
  - a failure found in the browser is written to the browser console only (`cms.widget.unavailable`); no
    existing path carries a browser report to the Site's log, and building one needs an endpoint;
  - the card of a failure the server decides (`PhiWidgetFailureServer`, the renderer's diagnostic) is drawn
    by the browser, which alone knows the viewer is Staff, so its text is in a visitor's page too, undrawn;
    deciding it on the server needs the viewer in the failure's props (a change of `PhiWidgetFailureProps`);
  - the Builder canvas does not show a binding that does not hold while the author works; the save refuses it
    and says why.

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

## Contracts

- **Machine-readable JSON schemas.** Signal `valueSchema` ids are enforced by TypeScript readers and
  emitters only. Add a runtime schema registry once the controller and Widget schema inventory is stable.

## Operations

- **Overlay geometry sweep, per installation.** An Overlay is sized like a block (OVERLAYS.md, "Geometry"):
  stored `overlays[].config.width`, and a Drawer's scalar `size`/`maxSize`, are read by nothing and refused
  in presets. Run `scripts/sweeps/overlay-geometry.sql` (one transaction over `phis.site_area_revisions`
  and `phis.site_page_revisions`, ending with a check that should answer 0 for both) on each installation
  with the release. dev.phis.dev stores no Overlay (dry run 2026-11-24, 0 rows); a swept auth dialog gets no
  400 px floor, which only the preset carries.

- **Theme variables `--ant-*` became `--phi-*` (0.5.3), per installation.** Stored configs that name a
  variable as text keep the old name until swept:
  `UPDATE phis.site_area_revisions SET tree_json = replace(replace(tree_json::text, '--ant-phi-', '--phi-'), '--ant-', '--phi-')::jsonb WHERE tree_json::text LIKE '%--ant-%';`
  and the same for `phis.site_page_revisions`. Remove once every installation is swept.

- **Stored Accounting shells must go, per installation.** The Accounting Area composes the header bar and
  the sidebar on `accounting:sidebar` as the Admin does, and a stored Area revision always wins over the
  preset; both Sites on prod hold one (scopes 14 and 18). Clear each Site's Accounting shell back to its
  preset in the Builder's Revisions (the Area delete, `/api/site/cms/area/override`) and, where the Site's
  Accounting Modules differ from the defaults (`dashboard`, `threads`) -- phis.dev has the Shop on -- switch
  them on again in the Builder's Modules; that save stores the new shell. dev.phis.dev was reset on
  14.11.2026.

- **Card `variantVersion` sweep, per installation.** The Inspector's `image` field no longer writes
  `variantVersion` (the Card draws the resolved Asset's own), and the Card no longer parses it. Stored
  values are harmless and read by nothing: walk `site_area_revisions.tree_json` and
  `site_page_revisions.tree_json` and drop `variantVersion` from the `config` of every
  `.../widgets/card` node.

- **Page title `display` sweep on each installation, with the release that brings it.** The Page title
  Widget is a heading (`h1`) unless its config says `display: "label"`, and stored Area revisions still
  hold the Shell header's title with `config: {}`: walk `site_area_revisions.tree_json` and give every
  `.../widgets/page-title` node without `display` the value `"label"`. Done on dev (9 revisions); prod
  `phis_prod` has 13 waiting. Remove this entry once prod is swept.

- **CMS backup/restore and portable transfer.** Exact backup/restore that preserves canonical CMS instance
  ids and DB sequences; portable export/import into a target Draft with central id allocation and atomic
  remapping of structural, signal-route, controller/form, and module-owned references. Define the transfer
  scope (media binaries, Site configuration, content records) first.
