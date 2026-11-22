# Collection View and Collection Provider Contract

This document defines provider-backed visual collections in `@phis/ui`. It applies to Core, first-party
Runtime Modules, third-party Modules, live rendering, Preview, and Builder Authoring. The generic signal
contract is in [SIGNALS.md](./SIGNALS.md).

## One rendering path

Every mutable or asynchronously loaded visual collection uses this dependency direction:

```text
PhiCollectionViewWidget
        ↓ persisted presentation, features, source, and signal routes
usePhiCollectionViewBinding ← Collection Provider descriptor and registered Provider Client
        ↓ PhiCollectionViewBindingModel (query, data, loading, error, open panel, reload, activate)
resource View (registered by the Provider Client for its resource)
        ↓
PhiCollectionViewControl and other Phi Controls
```

- `PhiCollectionViewWidget` (`plugins/runtime-modules/core/widgets/collection-view/client.tsx`) is the one placeable
  CMS Collection View. It persists presentation, enabled features, source binding, and signal routes; it
  does not fetch domain endpoints or inspect Provider keys. Preview renders
  `PhiCollectionViewSkeletonControl` without a Binding.
- `usePhiCollectionViewBinding` resolves one Provider resource and owns its query/request lifecycle,
  cancellation, pagination, reload, and the open panel key. It returns a `PhiCollectionViewBindingModel`
  (`types/collection-provider.ts`).
- the **resource View** is the Render Client the resource names (`itemRendererKey`), or the one a
  placement names instead. The Widget renders it with the Widget config, the Binding model, labels, the
  Widget id, the render mode, and `resource`: the resource's declaration as the Area's registry holds it
  (`PhiCollectionProviderResourceDescriptor`, read on the Server; `null` where the Area declares none), so
  the View offers the tools the resource declares and no others. It owns the Collection
  Header, filters, toolbar, item presentation, and panels of that resource, and composes
  `PhiCollectionViewControl` (`components/controls/phi-collection-view-control.tsx`), which lays out items
  and pagination and has no CMS, route, persistence, Provider-key, or domain knowledge.
- a Collection Provider owns resource identity, stable item identity, query semantics, validation,
  authorization, and domain actions. Item presentation and domain panels therefore remain in the
  Provider's Runtime Module instead of entering Core.
- a Runtime Module Controller may coordinate the Binding with other module workflows and signals. It is
  not a second data Provider and does not proxy Provider requests.

Domain-named collection Widgets, direct endpoint branches in Core, nested CMS Widgets inside a
Collection View, and loose preset Controls that duplicate a self-contained Collection View are forbidden.

### One Collection View for every source, shipped renderers first

A Collection View is meant for **any** Provider: the Media library's Assets, a Dashboard's cards, a
Module's gallery of references to Assets. What differs between them is the Provider -- what it reads,
which actions it has -- not the View. So a Module that shows a collection of things the house already
draws reuses the shipped renderer and writes a Provider, never a renderer of its own:

- **Media library Assets** (a gallery, an attachment list, a Module's own pictures): the Media renderer,
  `PHI_MEDIA_LIBRARY_ITEM_RENDERER_KEY` (`@phis/ui/constants`). The resource names it as its
  `itemRendererKey` and answers its items in the Media tile shape -- see
  [The Media renderer](#the-media-renderer).
- **Cards** (a list of records with a title, a picture, a figure, a plan): `PhiCardCollectionViewBinding`
  with `presentation.card` ([Card presentation](#card-presentation-and-resource-owned-views)).

A Module registers a renderer of its own only for items no shipped renderer draws, and it states why in
its own documentation. A Module renderer that draws `PhiMediaAssetTileControl`s, a confirm dialog and an
empty state for a collection of Assets is a copy of the Media renderer with fewer tools and its own words:
it drifts from the Media library the first time either changes (THIRD_PARTY_MODULES.md, failure guide,
"An own renderer duplicating a shipped one").

## Provider resource

A `kind: "collection"` Provider descriptor declares one or more resources
(`PhiCollectionProviderResourceDescriptor`, `types/collection-provider.ts`):

```text
resourceKey, title, optional description
itemIdentityPath
namespaced itemRendererKey
query: search, filterFields (key, title, type string | enum | enum[] | path), pagination
actions: key, title, scope resource | item | selection, optional panelKey
panels: key, title
defaultForWidget (at most one per Provider)
```

The Widget's `source` is a `PhiProviderResourceSource` (`types/runtime-data-provider.ts`): the shared `PhiRuntimeDataProviderBinding`
(`providerKey`, optional `scopeKey`, optional `params`) plus `resourceKey`.

The executable Client is created with `createPhiCollectionProviderClient` from
`@phis/ui/runtime/data-provider-client`. Its registration supplies `query`, optional `action`, and one
`View` component per resource. A panel is not a Widget: it is a controlled part of the resource View and
shares the Binding's open panel state.

A query (`PhiCollectionProviderQueryRequest`) carries `resourceKey`, the binding's `params`, the
normalized query, the `AbortSignal`, and `locale` and `timeZone`: the reader's language and the Site's
time zone, which the Binding fills from the page's Intl context (`usePhiIntlLocale`,
`usePhiIntlTimeZone`) for a Provider that writes words, amounts or dates into its items. Both are part
of the Binding's request key, so a live language switch queries again
([TABLES.md](./TABLES.md#query-result-and-mutation-boundaries)). An action request does not carry them.

### Card presentation and resource-owned Views

Most resources show their items as cards. Such a resource registers `PhiCardCollectionViewBinding`
(exported from `@phis/ui/runtime/data-provider-client`) as its `View` and writes no presentation code.
Which item field fills which part of the card is Widget presentation, `presentation.card`:

```text
eyebrow, title, description, meta   dot paths into one item
imageUrl                            path to a servable Media delivery path or URL (the cover)
icon                                path to an icon name, or to a Site path drawn as an `asset:` icon
value                               path to the figure of a `stat` card
href, actionLabel, actionHref       paths for the card link and action
highlight                           path to a field whose truth highlights the card
badge                               path to the words on the card's band
price, pricePeriod                  paths to a `plan` card's monthly price and its period
priceYearly, pricePeriodYearly      paths to its yearly price and period
features                            path to a list of `{ text, state? }` entries (`PhiBulletListEntry`)
billingPeriod                       monthly | yearly, which price every plan card shows (not a path)
variant                             default | compact | featured
body                                text | stat | plan, for every card of the View
```

A provider that knows the reader's country answers each row with that country's price; the card draws
what the row says and decides nothing about currency.

The cards are the Card Widget's own (`PhiCardWidgetClient`) with its default Surface. Without a mapping
the View falls back to the item fields `name`/`title`, `description`, `coverUrl`/`imageUrl` and `icon`. A
mark at a foreign address is not drawn: the house draws marks by name, and a picture a provider wants
shown as a mark is served from the Site.

Only the card View reads `presentation.card`; another View ignores it. A resource whose items are not
cards names another View. The Media renderer (`PhiAssetCollectionViewBinding`,
`plugins/runtime-modules/core/widgets/collection-view/asset-binding.tsx`) is such a View, for any
resource whose items are Assets.

### The Media renderer

`PHI_MEDIA_LIBRARY_ITEM_RENDERER_KEY` draws the items of a Collection as Media tiles
(`PhiMediaAssetTileControl`), whichever Provider answers them: the Media library's own Collection
(`PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.collection`, the Builder's Media page) and any other resource
that names it, on the resource (`itemRendererKey`) or on the placement. The Media library's own resource
is stated once in the Foundation (`PHI_MEDIA_LIBRARY_ASSET_RESOURCE`,
`components/media/media-library-resource.ts`): the Asset Module declares it, and the Media preview grid
(`PhiAssetPreviewGridWidget`), which renders without a page's registry, hands it to the renderer. What it
needs from the resource:

- **Items** in the shape `PhiMediaCollectionItem` (`@phis/ui/types`): what a tile reads of an Asset
  (`PhiMediaAssetTileControlAsset` -- `id`, `kind`, `originalName`, `title`, `altText`, `contentType`,
  `deliveryUrl`, `thumbnailUrl`, `previewUrl`, `deliveryPolicy`, `lifecycleStatus`, `width`, `height`,
  `blurDataUrl`) and, where an item has one, its `folderId`. `id` is the Asset id and the item's identity,
  so `itemIdentityPath` is `"id"`. They are read strictly (`readPhiMediaCollectionItems`,
  `components/media/phi-image-preview-data.ts`): a missing required field or one of the wrong type is a
  failure naming the field. `deliveryUrl` may be empty for a reference whose Asset the library no longer
  answers; the tile then shows the kind's icon. `kind` is `resolvePhiMediaKindFromContentType` of the
  type, and a picture a visitor is served is `deliveryPolicy: Public` and `lifecycleStatus: Ready`.
- **Actions** the renderer calls by these keys, offered only where the resource declares them:
  - `delete` (scope `item`, `itemKey` the Asset id): each tile's delete button. For the Media library it
    deletes the file; for a Collection of references it takes the item out (a gallery releases it).
  - `add` (scope `resource`, `itemKeys` the Asset ids, `PhiCollectionProviderActionRequest.itemKeys`):
    Assets of the Media library joined to the resource -- what an upload made, and what the toolbar's
    "Choose from Media library" picked. The Provider answers the collection as it now stands, which is
    shown at once; then the Collection is read again.
  - `upload` (scope `resource`, `panelKey: "upload"`, and a panel `upload`): the toolbar's upload opens
    the Media library's multi-upload wall (`PhiAreaUploadBinding`) between the header and the tiles.
  - `reorder`: the Collection View's drag reordering ([Drag reordering](#drag-reordering)), around the
    tiles.
  - `createFolder`, `lockFolder` with `unlockFolder`, and the filters `kind`, `presentationFlags` and
    `folderId`: the Media library's own tools.
- **Tools** are what the placement names, and each one must be declared by the resource: a toolbar
  action `upload` or `add`, a filter or a Folder companion action the resource does not declare, or one
  the renderer has no control for, is a failure of the Widget (`readPhiMediaRendererToolFailure`,
  `asset-binding-tools.ts`) -- an error card in the Builder, nothing live -- never a control that does
  nothing. A tile's delete is shown where the resource declares `delete`. The toolbar action `add` is the
  Media library's picker (`PhiMediaPickerControl`, the Site Space only).
- **Placement settings** (`features.media`, read by this renderer only, strictly):
  - `folderPath`: the Folder of the Site Space an upload goes into (the missing Folders created) and the
    picker opens on (the deepest part that is there), by its path of names. A `{param}` is the binding
    param `param` -- `source.params` with what `bindingParamsChange` laid over them -- filled by the
    `media-asset` field's rules (`resolvePhiMediaFolderPathTemplate`): a text or a number, trimmed, a `/`
    in it a `-`, a name whose placeholder has no value left out whole. Absent: the open Folder for the
    Media library's own Collection, the Site Space's root for any other.
  - `mediaType`: the one kind the upload takes and the picker lists (absent: the upload takes every kind,
    the picker lists images).
- **Uploads.** For the Media library's own Collection a finished upload stays in the wall as a tile, with
  its delete, and the listing is read again. For a resource that declares `add`, each Asset that arrived
  is added and leaves the wall -- the wall shows only what is on its way or failed -- so nothing shows
  twice. For any other the Collection is read again, for a Provider that lists the Folder it uploads into.
  An upload into another Collection than the Media library goes into the Site Space.
- **Labels** are the Media Label Set (`widget:media`, `getPhiMediaWidgetLabels`), loaded on the Server
  for every Collection View this renderer draws -- by renderer, not by Provider -- and laid over key by key
  by the placement's `presentation.labels` (`tool`, `upload`, `grid`, `picker`, `space`). A Collection of
  references says its delete in its own words there: `grid.deleteLabel` ("Remove from gallery"),
  `grid.deleteSuccessTemplate` (`%1` the Asset's title or name), `grid.deleteFailedText`; the toolbar's
  `add` says `tool.chooseFromLibraryLabel` unless its action names a label; a refused `add` says the
  Provider's words, else `grid.addFailedText`.
- **The Asset Controller's store** (the selection the Inspector reads, the Spaces a viewer may switch
  between) is fed by the Media library's own Collection only. A tile of another Collection is not
  selected, and no Space selector is drawn for it.

A Page with a Collection View this renderer draws mounts the Media library's Provider for its picker and
upload wall (`collectPhiRuntimeDataProviderKeys`), where a Module of the Area serves it.

Provider query results (`PhiCollectionProviderData`) contain `resourceKey`, `items`, authoritative
`total`, `loading`, `error`, and optional Provider-owned `meta`. Presentation config is never sent to the Provider. Filtering and pagination
always operate on stable query values, and a filter or search change resets `page` to `1`.

`PhiCollectionViewWidget` remains available in the Widget Picker even when no Collection Provider is
active. Insertion never opens a domain-specific selection flow. Its Inspector uses the normal Provider and
Resource selectors; active first- and third-party Modules contribute their descriptors to those selectors.
When exactly one compatible resource exists it may be selected automatically. With several compatible
resources, automatic selection is allowed only for one descriptor-declared generic default; Core must not
recognize an Asset Provider key or impose a domain ordering.

The selected binding remains persisted when its Module is disabled or uninstalled, and the Widget never
switches to another Provider automatically. What it shows for the unavailable Provider/resource depends on
who is looking: in the Builder it renders an error card (`PhiAlertControl`) naming the cause, because the
author can rebind it; on a live page, a revision preview included, it renders nothing, because a visitor
cannot, and an error or an empty frame would read as a broken Site. Both log a `cms.widget.unavailable`
warning. The split is one shared piece, `components/widgets/shared/widget-failure.tsx`, in two variants:
`PhiWidgetFailureServer` for a failure found during the server render and `PhiWidgetFailure` for one found
in the browser. A Module package's own Widgets use the same pieces from `@phis/ui/module/records` (Server)
and `@phis/ui/runtime/data-provider-client` (Client); see [MODULES.md](./MODULES.md). Restoring the Module therefore restores the same binding without
rewriting Widget config. A module-owned preset may persist its own concrete binding directly.

## Widget configuration

The persisted Widget config (`PhiCmsCollectionViewWidgetConfig`,
`plugins/runtime-modules/core/widgets/collection-view/config.ts`) has four sections:

```text
presentation
├── optional title and description
├── optional card presentation
├── mode: grid, masonry, or stack
├── gap and minColumnWidth
├── controlSize
├── emptyDescription
└── optional resource labels

features
├── tools: mode, reload, reset
├── search
├── ordered filters (key, control select | multi-select | cascader, widths, companion actions)
├── ordered toolbar action presentation
├── reorder: enabled, optional actionKey (default "reorder")
├── media: folderPath, mediaType (the Media renderer's, see above)
└── pagination

initialQuery

source
└── PhiCollectionProviderDataSource
```

`features.tools.mode` is `"self-contained"` or `"external"`. Self-contained mode renders the shared
Collection Header with optional title/description on the left, flexible ordered filters and Search in the
middle, and exactly one compact Toolbar on the right. Without a title, filters start at the left edge.
Controls default to `small`. Toolbar order is configured domain actions followed by Reset when enabled and
Reload when enabled. The Collection Header is the one defined in
[TABLES.md](./TABLES.md#presentation-and-content-are-separate). Pagination is part of the Collection View
and is placed bottom-right; it is never a separate preset Widget.

A Filter may declare ordered companion actions from the same Provider action catalog. The Binding renders
them in one compact `PhiToolbarControl` with that Filter; it must not invent a domain action or bypass the
Collection action signal. This supports compound interactions such as an Asset Folder Cascader followed
by one Create Folder Button while retaining one Provider-owned action contract. A preset that omits the
companion action renders the Filter alone.

The Provider owns available filter keys and action/panel capabilities. Widget config selects and orders
those capabilities and owns labels, descriptions, icons, Control choice, widths, Button mode, and
visibility. An unknown filter, action, renderer, or panel capability is a contract error, not a fallback.
Module presets may persist a translated, serializable resource-label object under presentation; the
generic Widget passes it to the selected resource adapter as opaque presentation and never interprets its
domain keys. An absent label object resolves to module-owned English source fallbacks.

## Drag reordering

`features.reorder` (`{ enabled: boolean; actionKey?: string }`) lets a reader drag the items into another
order, and the bound Provider store it. The Widget stores nothing about order: the Provider's order is
the order, before and after.

- **Where.** In `grid` and `stack`, never `masonry`, and only while the items shown are the whole
  collection, because a drop has to name all of them: no search text, no filter apart from the ones
  the Widget's own `initialQuery` sets (those are what the collection is), every item on the one page
  (`total` no more than the items answered, so pagination with a second page turns it off), and every
  item with a key of its own at the resource's `itemIdentityPath` (a string or a number, no two the
  same). The key path is read from the resource's declaration on the Server and handed to the Widget's
  Client; a render without the Area's registry offers no reordering. Pure rules:
  `resolvePhiCollectionReorderKeys` (`components/widgets/client/shared/phi-collection-reorder.ts`).
- **A drop** calls the Provider action through the Binding:
  `activate({ actionKey, itemKeys })`, `actionKey` the configured one or `"reorder"`, `itemKeys` every
  item key in the new order (`PhiCollectionProviderActionRequest.itemKeys`). The new order is shown at
  once -- the renderer is handed the Binding with its items in that order -- and nothing is dragged
  until the Provider answers. Its answer is the collection as it now stands and takes the dropped
  order's place. A refusal (the action throws, or answers `error`) puts the Provider's order back by
  reading again, and is said the way a Collection's other refused actions are: an application message
  (`usePhiApplicationFeedback`), the Provider's words where it gave some, else the Widget's
  `widget:collection-view` text. A Provider that offers reordering declares the action
  (`scope: "resource"`) and checks the keys it receives: the whole collection, each once.
- **The handles** are drawn by `PhiCollectionViewControl` around whatever the resource View draws: the
  Widget offers the reordering through `PhiCollectionReorderContext`
  (`components/controls/phi-collection-reorder-context.ts`), and the Control, where the View's items are
  one per key and it draws no `body` of its own in their place, puts a drag handle on each item
  (`phi-collection-sortable-layout-control.tsx`, loaded only then). `@dnd-kit` with pointer and keyboard,
  as the Table Control sorts rows: only the handle starts a drag, so an item's own click, links and
  buttons stay its own. A View that lays its items out some other way offers no reordering. An item that
  draws a Collection of its own does not hand that one the reordering.

## Integrated tool panels

A toolbar action may open one declared integrated panel, such as an Asset upload area. The View Binding or
its module Controller owns the panel's open state. Activating the action opens or toggles that state;
closing the panel does not create or destroy a CMS node. Successful panel mutations invalidate or refresh
the same Collection query through the Binding.

The panel renders between the Collection Header and item body. It receives the current Provider query and
relevant Provider metadata so uploads or other mutations use the visible collection context. It must use a
module-owned Binding plus Phi Controls; mounting a Widget, Form Widget, arbitrary preset subtree, or direct
Ant Design input inside another Widget is forbidden.

The Asset Module applies this contract as follows: Kind, Flags, Folder, and Search are ordered
self-contained filters; Upload and Reload are the right Toolbar; Upload opens the controller-owned upload
area inside the Collection View; the Folder Filter may pair its Cascader with the Provider-declared Create
Folder action; and pagination remains bottom-right. The Asset Inspector reuses the selectable Folder
semantics without exposing that Create action. A Collection of references to Assets in another Module (a
Shop listing's gallery) uses the same upload area through the Media renderer: Upload and "Choose from
Media library" are its Toolbar, and what arrives is added to its resource ([The Media
renderer](#the-media-renderer)).

The trusted Asset Provider context owns the active Media Space. Builder and Editor presets are pinned to
the Site Space; App collections may expose only the User or Group Spaces returned as accessible by the
server. Widget `source.params`, filters, signals, and persisted presentation cannot claim Space ownership
or widen access. Upload inherits the trusted active Space and selected Folder, not arbitrary presentation
filters. Asset quota, ownership, Folder isolation, delivery policy, signed URLs, and Storage selection are
governed exclusively by `phis-server/GROUPS_AND_STORAGE.md` and are not implied by this view contract.

## Loading and signals

Loading preserves the selected item layout and renders item skeletons rather than a spinner. Existing
items may remain visible only when the Binding explicitly supports stale-while-refresh behavior.

The Widget declares exactly these capabilities:

```text
emits    selection        change:json<media-asset-selection>
emits    actionActivate   activate:json<collection-action>
listens  reload               reload/activate:none
listens  bindingParamsChange  bindingParams/change:json<table-binding-params>
```

The Widget itself handles `reload` and `bindingParamsChange`. The second is the Table's
([TABLES.md](./TABLES.md)): a received `{ params }` is laid over the configured `source.params` and the
Provider is asked with the result as `source.params` -- the query, the actions (a reorder's included) and
the `config.source` the resource View is handed. A new set starts the list over: the initial query, the
first page, no item of the old answer shown, and no reordering until the new answer is there. The chosen
set belongs to the configuration it was laid over; a Builder edit of `source.params` starts from that
again. A Controller that opens a Collection for one record -- a dialog with a listing's pictures -- sends
`{ params: { id } }` on the route a placement declares with `capabilityId: "bindingParamsChange"`. The resource View emits `selection` and `actionActivate` through the
Widget's routes; a View that has no selection or actions emits nothing. Search, filter, pagination, and
panel state are Binding state inside the View and are not signalled.

Signals coordinate the Widget with Controllers and external Controls; Provider reads and mutations remain
typed Binding calls and never gain a second signal transaction path. The action value contains the stable
`actionKey` and may carry the current Provider query as `query`; a Controller uses that context rather
than reading an unrelated domain-store snapshot.
