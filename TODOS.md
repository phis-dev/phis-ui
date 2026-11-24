# Open work

Open work only, grouped by area. Binding contracts live in the contract documents; designs live in
[design/](./design/README.md). A contract extension named here still needs operator approval before it is
built. Remove an entry when it is done. An entry that asks for a Widget or a Form field type that does not
exist yet names it on a line of its own -- `` Wants: Widget `<typeKey>` ``, `` Wants: form field `<key>` `` --
and `scripts/validate-todos-wants.ts` refuses the entry once the catalog has one by that key.

## At the next release

- **`users:v1` in the UI** (phis-server 0.6.0 routes): the App Profile page's telephone numbers
  (`PATCH /api/v1/auth/profile/phone`, `viewer.profile.phone`/`mobile`) and the account's addresses
  (`/api/site/account/addresses`, its own Table Provider and two Forms); Admin -> Settings -> People data
  (`/api/site/admin/users-access`: background grants, retention, the access log); staff's customer file in
  Accounting (`GET /api/site/members/{userId}/file`, THREADS.md section 10). The relay fills a handler's path
  from a field (FORMS.md, "Request shape"). **Needs
  `@phis/server` 0.6.0**; an older Server answers 404 on every one of these routes. Left open:
  - The customer file reads the route once per Table, so one choice of a member is three requests and three
    access log entries; one read shared by the three Tables (or one resource answering the person and their
    addresses) is the follow-up, and a cache only with the owner's agreement.
  - The access log filters take a subject and an Add-on id as typed; a picker of the Site's people by subject
    and of the Add-ons that read people would be options Providers of their own.
  - A grant gives an Add-on everything it asks in the background; granting a part of it (the route takes
    any non-empty part) has no dialog yet.
  - A Maintainer opening Settings -> People data by its address sees the Tables' refusals; the page does not
    yet answer that inside itself, as the customer file does.

- **Small pictures in Tables and records** (TABLES.md, "Read renderers"): the read renderer `image` (a
  `string` field holding a Site-relative address the server built -- for a list the Media library's `icon`
  variant -- drawn as a plain lazy `<img>` in a fixed 32 px square, `PHI_RENDERED_IMAGE_SIZE`, fitted whole,
  decorative `alt=""`; anything but an address on this Site draws nothing), for Table columns and `record`
  fields, and the Table column's `imageFieldKey`, a picture ahead of the column's value as `iconFieldKey`
  puts an icon there (`renderPhiValueWithLead` in `phi-rendered-value.tsx`, which now draws both). The
  Inspector offers both keys as "Icon Field" and "Image Field". The Accounting product directory shows the
  picture as a column and the icon ahead of the title, **from phis-server's `imageListPath` and
  `iconListPath`** of `GET /api/site/products`, which an older Server does not answer (the column stays
  empty, the title bare).

- **The product directory releases the version it shows**: the Accounting Provider keeps the version of
  each product as the terms dialog last read it and sends it as `expectedVersion` with
  `POST /api/site/products/{id}/release`; a release without a read record is refused before it is sent, and
  Core's `409` for a product that moved on since stands above the record. Needs the phis-server release that
  reads the body; an older Server ignores it and releases unchecked.

- **An Add-on's Media limits are applied in its Module's Media fields** (FORMS.md, `media-asset` and
  `media-assets`): the capability snapshot reader takes `PhiCapabilityProvider.media` (`@phis/contracts`
  0.8.9) strictly (`gateway/capability-media-limits.ts`), the Form Widget hands the limits of the Add-on its
  Form's Module is bound to to every field as `mediaLimits`, and the fields refuse a file too large or of a
  kind not taken before it is sent and cap `max` at `maxPerField`. **Needs the phis-server release that
  fills `media` in the snapshot**; an older Server states none, and the fields apply no limits of the
  Add-on's.

- **Core's Site member picker** (FORMS.md, "Fields"): the options Provider
  `PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.siteMembers` offers the Site's members by user id (as text) and name
  to any Module's Form, searched on the server. **Needs the phis-server release with
  `GET /api/site/members`** (for the holders of the Site access `accounting` or `support`); an older Server
  answers 404 and the field warns and offers nothing. It names no held value off the page it answers (the
  route takes no ids), so a Form that opens with a person already chosen shows the id until it is found;
  the one Form that uses it so far (`@phis/licenses`' grant) opens empty.

- **The `record` Widget acts on the record it shows** (TABLES.md, "The record Widget"): `actions` (Provider
  row actions of its source: `key`, `mode` normal/danger, optional `confirm`), the input `actionActivate`
  (`action/activate:string`, the action's key), the outputs `actionSuccess` (`activate:json<table-action>`)
  and `recordTitle` (`change:string`, from the new `titleFromRecord { template, field }`). A
  `confirmation: "required"` capability is confirmed by the dialog that shows the record; `confirm` is a
  second question for where it is not. The Accounting product directory releases from its terms dialog
  ("Terms: <id>", footer Release and Cancel); the Compare terms row action and the release's own question
  are gone. Graph budgets raised by what this adds (`pnpm audit:graph --update-budget`): every Area Client
  and Client manifest by about 19.5 KiB (the Widget's action run and title, `helpers/record-widget.ts`,
  `helpers/record-title.ts`, the request helpers shared with the Table's Binding), the Area server graphs
  by about 10.6 KiB (the definition's fields and readers) and the Accounting ones by 15 KiB (the dialog's
  footer and routes), the Builder's by 16.6 KiB, and the shared entries by 2 to 7 KiB
  (`checkPhiTableProviderActionRequest` in `types/table-widget.ts`, the preset check's Record titles).

- **0.7.4: the `media-assets` Form field** (FORMS.md, "Field and validation Providers"): several Assets of
  the Media library as an ordered list of ids (`valueType: "json"`, `[]` for none), owned by the Asset
  Module (`PHI_MEDIA_ASSETS_FORM_FIELD_PROVIDER_KEY`), config `mediaType`, `folderPath` (`{key}` from the
  Form's values), `max` (1 to 100, `PHI_MEDIA_ASSETS_FIELD_MOST`), Label Set keys
  `PHI_FORM_MEDIA_ASSETS_LABEL_KEYS` and the new picker key `mediaAssetPickerChooseFromLibrary`. It reads
  its tiles in one request with the Media list's `id` repeated (`filters.id` of the Media collection
  Provider), so it **needs the phis-server release whose `GET /api/site/media` takes `id`**; an older
  Server answers its ordinary first page instead, and the value's tiles show as unavailable. `PhiAreaUploadBinding` gained
  `refuseFile`. `@phis/shop` moves its product gallery from the Collection View onto this field. Graph
  budgets of the area Clients and the Client manifests raised by 26 KiB: the field's control (loaded when
  such a field first renders, as `media-asset`'s is), its config reader and the label and picker helpers it
  shares with `media-asset` and the Media renderer; `./widgets` and `./media` by under 2 KiB (the shared
  picker hook, `refuseFile`).

- **The Media renderer draws any Provider's collection of Assets** (COLLECTIONS.md, "The Media
  renderer"). A resource names `PHI_MEDIA_LIBRARY_ITEM_RENDERER_KEY`, answers `PhiMediaCollectionItem`s and
  declares `add` (`itemKeys`, Asset ids), `delete`, `reorder`, `upload` (`panelKey: "upload"`); the
  placement's new `features.media` (`folderPath` with `{param}` from the binding params, `mediaType`) and
  toolbar action `add` ("Choose from Media library") go with it; the renderer receives
  the resource's declaration as `resource`, labels are loaded by renderer. A tool the resource does not
  declare is now a Widget failure. `PhiMediaPickerControl` lost `onUpload`, `uploadAccept` and
  `uploadProgress` for `uploadPanel` (the Media library's upload surface, `PhiAreaUploadBinding`, which
  gained `acceptance`, `showFinished`, `onAssetUploaded`, `onUploadingChange`, `siteSpaceOnly`); the
  `media-asset` field lost its `mediaAssetPublicOnlyHint` sentence. `@phis/shop` moves its gallery onto
  it and peer-depends on `^0.7.4`.

- **`checkPhiPresetTreeContract` in `@phis/ui/module/page-check`**: the rules the descriptor compiler holds
  every preset tree to (ids, parents, roots, the dialog's body, actions and width) as findings, the same
  code the compiler throws from (`helpers/preset-tree-contract-check.ts`). A Module runs it in its tests with
  its own Forms (THIRD_PARTY_MODULES.md, "Checking a Page preset"); `@phis/shop` does. Graph budget of
  `./module/page-check` raised by about 77 KiB: the door now carries the contract and what it reads (the
  dialog configs and the Form column reading, the base page layout node and the preset node factories,
  the Layout and Widget type keys); it is verify-time and never loaded by a Site.

- **0.5.7: a floated Markdown picture has a width step, an Overlay's ink is a colour or a gradient with a
  direction, and a field edits an Overlay alone.** `imageFloatWidth` on the Markdown Widget and `width=` in
  a picture's address take `small`, `medium`, `large` (the default, as before) or `xlarge` (LAYOUTING.md).
  A Module's Widget offers a `PhiBackgroundOverlay` of its own in the Inspector with a field of type
  `background-overlay` (BUILDER.md); the Card does so for `imageOverlay`. Nothing stored changes.

- **0.5.6: presets ask for their package's pictures** (THIRD_PARTY_MODULES.md, "Pictures a Module
  ships"). Every preset loader's context carries `media`, so a Module package that calls its own
  `loadTree` in a test or check script passes one: `createPhiDeclaredMediaResolver` from
  `@phis/ui/module/page-check`, with the keys its `package.json` declares under `phis.media`. A caller of
  `instantiatePhiCmsRoutePreset`, `instantiatePhiCmsAreaShellPreset` or
  `composePhiCmsActiveAreaOverlayPresets` passes `loadModuleMedia`. The pictures reach the library through
  `phis module media sync` / `phis update`, which need Core 0.3.6; against an older Core every name
  answers `null`. The Card has `iconSize` (`default`, `large`, `xlarge`) and `iconFramed`.

- **0.5.5: Widget config text is translated by the renderer** (TRANSLATIONS.md, "Widget config text").
  A Module's Preset states `textSource: "preset"` (or `"site"`) on every Widget with text and runs
  `checkPhiPresetTextSources` in its tests; text read from a Label Set keeps `NoTranslate` on the node.
  `@phis/support` and `@phis/marketplace` did. Controls lost the `NoTranslate` switch -- only Markdown,
  HTML, Simple Text and Description keep it. Config text now translates under "Web UI label" / "Web UI
  message" instead of context 0, so each installation translates it once more; the old context-0 rows are
  left for the unused-text cleanup. `PhiCardWidget` lost its `translate` prop, `PhiQuickLinksWidget` its
  `translate` and `textSource` props: their texts arrive translated.

- **0.5.4: data-Provider requests carry `locale` and `timeZone`.** Table, collection and tree query/record
  requests and the options-provider context require them now. A package that calls a Provider itself
  (`@phis/calendar` did, `src/client/calendar.tsx`) passes them and is rebuilt on 0.5.4; the shop moved its
  money to `formatPhisMoney` and the `money`/`interval` renderers in the same round. Needs
  `@phis/contracts` 0.7.9. Dialogs: a one-column Form in a full-width dialog is refused by the descriptor
  compiler, so a package's dialogs state `PHI_DIALOG_WIDTH_SINGLE_COLUMN` or hand their Form over as
  `body.form` (`@phis/support` and `@phis/shop` did).
- **0.5.3 renames every Theme variable from `--ant-*` to `--phi-*`.** Stored configs that name a variable as
  text keep the old name until they are swept, per installation, with the release:
  `UPDATE phis.site_area_revisions SET tree_json = replace(replace(tree_json::text, '--ant-phi-', '--phi-'), '--ant-', '--phi-')::jsonb WHERE tree_json::text LIKE '%--ant-%';`
  and the same for `phis.site_page_revisions`. Packages that wrote a variable literally are rebuilt on
  0.5.3 (`@phis/releases`, `@phis/phisys`). The own tokens drop their `phi` (`pageMax`, `gradient1`,
  `custom1`, `primaryButtonGradient...`); no stored Theme names them (checked 15.11.2026).
- **Remove the Ant Design 6.7 Form context patch** once Ant Design imports `FormProvider` directly
  (`antd/es/form/context.js`). The patch (`next/antd-form-context-loader.mjs`, the rule in
  `readPhiAntdFormContextPatchRule`, the `./next/antd-form-context-loader` export, THEME.md) keeps the Form
  engine and `async-validator` off every page with a Button: on the landing about 40 kB raw, 17 kB gzip
  and 43 modules less (Turbopack analyzer, 15.11.2026). It applies to 6.7.x only and warns from 6.8 on.
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

- **Module routes nest only as a list's entries** (THIRD_PARTY_MODULES.md, "Addresses and folders",
  2026-11-16). Checked at verify time (`checkPhiRouteAddresses`): phis-ui's own routes keep it, and so do
  `@phis/phisys` and `@phis/shop` (catalogue moved to `/shop/products`). Next: run it over the other
  first-party packages' routes, then make it part of compiling the catalog, so an installed package that
  breaks it is refused, and extend it to the Public addresses a Site assigns at activation (`public-route-collisions.ts` compares equality only, so a reassigned route can still land
  beneath a Site Page or another Module's route).
- **A container's title as a link, later.** Owner's idea (2026-11-16): a container with a folder target
  could lead there when its title is clicked, the chevron still opening it. Today every menu draws an
  entry with children as an opener only (`components/shell/menu-items.tsx`). Not before the owner asks;
  the overview as the first child does the job meanwhile.
- **A Page with Pages beneath it stays out** (2026-11-16, decided against for now): it would need a link
  with children in every menu, the Navigation table, the breadcrumb, subtree moves and the server's
  `path_nested` rule. Revisit only with the clickable container title above.

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
- **`inverse` has no ground of its own.** A Surface toned `inverse` paints the other mode's Chrome
  Overlay (`styles/shell.css`, the tone rules). A Theme whose Chrome is glass -- phis.dev's is 55 % white or
  ink -- gives an inverse box a near-transparent ground, and its inverted text sits on the page's own
  ground: light text on a light page. Seen on the phis.dev footer (2026-11-13), now a stated colour per
  mode instead. A Theme needs a way to say what an inverted box stands on -- an opaque ground per mode
  for `inverse`, or the rule that `inverse` never reads a translucent Chrome. Contract question.

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
