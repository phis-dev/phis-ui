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

- `PhiCollectionViewWidget` (`components/widgets/client/collection-view-widget.tsx`) is the one placeable
  CMS Collection View. It persists presentation, enabled features, source binding, and signal routes; it
  does not fetch domain endpoints or inspect Provider keys. Preview renders
  `PhiCollectionViewSkeletonControl` without a Binding.
- `usePhiCollectionViewBinding` resolves one Provider resource and owns its query/request lifecycle,
  cancellation, pagination, reload, and the open panel key. It returns a `PhiCollectionViewBindingModel`
  (`types/collection-provider.ts`).
- the **resource View** is the component the Provider Client registers for each resource. The Widget
  renders it with the Widget config, the Binding model, labels, and the Widget id. It owns the Collection
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

The Widget's `source` is a `PhiCollectionProviderDataSource`: the shared `PhiRuntimeDataProviderBinding`
(`providerKey`, optional `scopeKey`, optional `params`) plus `resourceKey`.

The executable Client is created with `createPhiCollectionProviderClient` from
`@phis/ui/runtime/data-provider-client`. Its registration supplies `query`, optional `action`, and one
`View` component per resource. A panel is not a Widget: it is a controlled part of the resource View and
shares the Binding's open panel state.

### Card presentation and resource-owned Views

Most resources show their items as cards. Such a resource registers `PhiCardCollectionViewBinding`
(exported from `@phis/ui/runtime/data-provider-client`) as its `View` and writes no presentation code.
Which item field fills which part of the card is Widget presentation, `presentation.card`:

```text
eyebrow, title, description, meta   dot paths into one item
imageUrl, iconUrl                   paths to a servable Media delivery path or URL
href, actionLabel, actionHref       paths for the card link and action
variant                             default | compact | featured
```

Only the card View reads `presentation.card`; another View ignores it. A resource whose items are not
cards registers its own View instead. The Media library (`PhiAssetCollectionViewBinding`,
`components/media/phi-asset-collection-view-binding.tsx`) is such a View.

Provider query results (`PhiCollectionProviderData`) contain `resourceKey`, `items`, authoritative
`total`, `loading`, `error`, and optional Provider-owned `meta`. Presentation config is never sent to the Provider. Filtering and pagination
always operate on stable query values, and a filter or search change resets `page` to `1`.

`PhiCollectionViewWidget` remains available in the Widget Picker even when no Collection Provider is
active. Insertion never opens a domain-specific selection flow. Its Inspector uses the normal Provider and
Resource selectors; active first- and third-party Modules contribute their descriptors to those selectors.
When exactly one compatible resource exists it may be selected automatically. With several compatible
resources, automatic selection is allowed only for one descriptor-declared generic default; Core must not
recognize an Asset Provider key or impose a domain ordering.

The selected binding remains persisted when its Module is disabled or uninstalled. The live view and
Authoring view render a `PhiAlertControl` diagnostic for the unavailable Provider/resource and never switch
to another Provider automatically. Restoring the Module therefore restores the same binding without
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
semantics without exposing that Create action.

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
listens  reload           reload/activate:none
```

The Widget itself handles `reload`. The resource View emits `selection` and `actionActivate` through the
Widget's routes; a View that has no selection or actions emits nothing. Search, filter, pagination, and
panel state are Binding state inside the View and are not signalled.

Signals coordinate the Widget with Controllers and external Controls; Provider reads and mutations remain
typed Binding calls and never gain a second signal transaction path. The action value contains the stable
`actionKey` and may carry the current Provider query as `query`; a Controller uses that context rather
than reading an unrelated domain-store snapshot.
