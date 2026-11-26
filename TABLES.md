# Table and Table-Provider Contract

This document defines tables in `@phis/ui`. It applies to Core, every first-party Runtime Module,
third-party Modules, live rendering, Preview, and Builder Authoring. The generic signal contract (scopes,
addresses, routes, correlation) is in [SIGNALS.md](./SIGNALS.md); Forms are in [FORMS.md](./FORMS.md).

## One rendering path

All Provider-backed tabular output uses this dependency direction:

```text
PhiTableWidget or another generic host
        ↓ config, source binding, and host events
PhiTableBinding ← Table Provider descriptor and executable Client
        ↓ controlled rows, state, editors, and callbacks
PhiTableControl
        ↓
Ant Design Table and shared Phi Controls
```

- `PhiTableControl` is the presentation adapter over Ant Design. It has no CMS, provider, persistence,
  module, route, signal, or controller knowledge. It receives controlled values and state and reports
  user interactions through callbacks.
- Lines and sums whose amounts must stand in one column (a cart, an order) are not a Table: they are the
  display-only `PhiAmountListControl` ([THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md)).
- `PhiTableBinding` is the reusable, headless Core binding and state machine. It resolves one declared
  Provider/resource binding, owns normalized query and asynchronous request state, calls Provider reads
  and mutations, reconciles accepted or rejected edits, and exposes a controlled Table view model.
  Provider mutations are direct typed Binding calls; signals coordinate hosts and workflows but are not
  a second Provider transaction path.
- `PhiTableBinding` is a TypeScript/Core component, not an installable Runtime Module. It has no
  `ownerModuleId`, Area activation, preset, route, or independently selectable lifecycle.
- `PhiTableWidget` is the one placeable CMS Table Widget. It is a thin host adapter that owns persisted
  presentation, source binding, Widget addresses, and standard signal routing around
  `PhiTableBinding + PhiTableControl`.
- another generic host, including a Form field provider, picker, or Inspector editor, may reuse
  `PhiTableBinding + PhiTableControl` without mounting or emulating a CMS Widget. A domain host may
  supply placement and surrounding workflow only; it must not rebuild Table columns, editors, actions,
  query state, mutation reconciliation, or drag/drop behavior outside the Binding contract.
- a Table Provider owns resource identity, field semantics, query and mutation behavior, validation,
  authorization, business availability, and domain action capabilities. It does not own labels, icons,
  Button appearance, tool placement, or other runtime presentation.
- a Runtime Module owns its domain Provider, Forms, Controller, and preset wiring. It must not wrap the
  generic Table Widget merely to add a missing generic capability.

Immutable, already-resolved rows that are only read, such as native Markdown tables, render through
`PhiPlainTable` (`components/tables/phi-plain-table.tsx`): a plain `<table>` without hooks or a Client
directive, styled from Ant Design's CSS variables. Read-only preview data may render through
`PhiTableControl` directly. Neither exception has a query, asynchronous loading, editable cell,
row/selection/resource action, row or column reordering, drag/drop, optimistic state, Draft, persistence,
or Provider lifecycle. The first such capability makes the data a Table resource and requires
`PhiTableBinding` plus a declared Provider. A domain-owned state store is not an alternative
Binding and does not make mutable rows "static" or "transient".

The only mutable provider-free exception is a controlled compound value inside `PhiFormControl`. A Form
field provider may render `PhiTableControl` directly when the complete row collection is one atomic field
value owned by the surrounding Form. This mode may support local cell editing through Phi Controls,
add/remove, selection, collection validation, and local reorder/DnD. It requires stable local row keys and
must report every accepted local change through the controlled Form field callback.

The controlled Form-value mode has no Provider/resource identity, query, asynchronous loading, server
pagination, Provider action, independent persistence, optimistic server mutation, Published/Draft state,
or separate Controller store. Submit, reset, and discard apply to the complete Form record. If a row is an
independently addressable resource or needs any forbidden capability, the Table remains outside the Form
and uses `PhiTableWidget -> PhiTableBinding -> PhiTableControl`. Embedding `PhiTableWidget` in a Form or
wrapping a Provider resource as one Form value is forbidden.

Navigation Drafts are mutable persisted tree resources. Their schema, rows, parent identities, edit
capabilities, row actions, reordering, cross-resource drops, validation, CMS-id allocation, and
Draft/publish mutations belong to a Navigation Table Provider and its Controller. A preset places the
generic `PhiTableWidget`; an approved non-CMS host may compose the same `PhiTableBinding +
PhiTableControl`. A `NavigationTableWidget`, direct domain callbacks around `PhiTableControl`, or a
Navigation-local implementation of editable cells or drag/drop is forbidden.

Domain-named Table Widget aliases, provider-key branches in Core, direct-fetch fallbacks, and
module-specific Table render paths are forbidden.

## Presentation and content are separate

The persisted Table Widget config has four independent sections:

```text
presentation
├── title and description
├── ordered columns
├── density, border, header, and striped-row treatment
└── empty-state presentation

features
├── search and filters
├── sorting and pagination
├── row selection
├── Provider-backed row reordering
├── column reordering
├── flat or tree-table presentation
├── self-contained or external query tools
├── action presentation and ordering
├── binding-tool presentation
└── tree expander and DnD-handle placement

initialQuery

fixedFilters

source
└── providerKey + resourceKey + opaque provider params
```

`fixedFilters` are filters the Page sets and the reader does not -- what makes a listing the listing it
is, such as a thread Provider's `kind` pinned to Support. They are drawn nowhere and merged into every
query last, over the reader's filters, a reset and any signal that sets the query, with their values in
their own type. A `features.filters` entry is the reader's (drawn, changeable, reset to its default), and
`initialQuery.filters` is only where the query starts, which is why neither pins anything.

`signalRoutes` remains the normal shared Widget wiring contract. No presentation field may contain an
API URL, server action, controller address, receiver, handler function, provider implementation, or
domain fetch branch.

The source binding is exactly:

```ts
type PhiTableSourceBinding = {
  providerKey: PhiRuntimeDataProviderKey;
  resourceKey: string;
  params?: Record<string, unknown>;
};
```

`params` is serializable, provider-owned binding
configuration. The generic Widget and Builder treat it as opaque data validated and edited only through
the selected Provider descriptor.

A resource may declare typed `bindingFields` for mutable primitive entries in `params`. The Provider
descriptor owns the field key, semantic type, required/default state, options or Options Provider, and
an optional create-action capability. Widget config selects and orders those fields through
`features.tools.bindingFields` and owns only their presentation: label, placeholder, Control treatment,
and create-affordance label/icon/display. In self-contained mode they render on the left before filters
and search. Changing a binding field aborts requests and mutations for the previous binding, clears rows,
selection, and expansion, resets pagination, and queries the newly bound resource instance.

The binding value remains `string` or `enum` Provider data regardless of its Control. Besides Select and
Autocomplete presentation, a string-valued path may select the canonical `PhiCascaderControl`; separator,
root value, root availability, and raw/path normalization remain Widget presentation config. The Provider
continues to own option values and their semantic defaults; the binding tool may only replace display
labels for known values, for example with the active Preset label set. An Options
Provider may return a canonical value when another binding parameter changes. If the current value is no
longer among the resolved options, the generic binding adopts that canonical value before querying the
new resource instance. A Provider may mark its canonical value as `authoritative` when the binding mirrors
another owner such as the active Builder Area; the generic binding then adopts it even while its previous
value remains a valid option. Presentation may disable one binding Control while another binding field equals a
declared primitive value. The disabled Control continues to display the Provider's canonical mirrored
value; disabling it does not create a second state owner or prevent Controller-driven binding updates.

An enum binding field may use the normal Options Provider contract. If it permits creation, the Provider
references one declared string-valued resource action and the Widget supplies the corresponding generic
create presentation. The generic add affordance collects the candidate value, the Provider validates and
creates it, and an accepted canonical value becomes the active binding param. A
Controller may mirror that param into navigation or URL state through the standard Table binding-params
signal; it must not proxy the Provider operation.

Rows are never a top-level Table Widget config field. Fixed content uses the same provider binding as
remote content. The generic Widget must not inspect `providerKey` to reveal special fields.

Global query controls and domain actions are separate concepts:

- **query tools** change Table state, for example search, filter, reload, page, page size, sort, and
  expansion;
- **resource actions** operate on the complete bound resource or current query, for example deleting
  all translations for the selected target locale;
- **row actions** operate on exactly one stable row identity;
- **selection actions** operate on the current explicit row selection.

`features.tools.mode` is either `"self-contained"` or `"external"`:

- `self-contained` lets the Table host render the enabled search/filter/reload controls and resource
  action buttons in its generic tools area, row actions in the action column, selection actions in the
  selection area, and pagination in the Table footer;
- `external` suppresses only the global tools area. Ordinary Controls may drive the Binding through its
  controlled command API or drive a Widget through declared Table input signals. A Form is neither
  required nor preferred merely to host those Controls;
- row and selection action presentation remains owned by the Table unless a separate approved host
  contract explicitly assumes those scopes.

Row-action grouping is ordinary Widget presentation under `features.actions.rowLayout`. The closed
values are `spaced` and `compact`; omitted input resolves to `compact`. `compact` joins adjacent action
Controls into one visual group and is intended especially for icon-only row toolbars. It changes no
action ordering, visibility, confirmation, disabled reason, Provider capability, or execution behavior.

For `self-contained`, Table and Tree share one Collection Header contract. Its flexible zones are:

```text
[ optional title (i) ]  [ binding fields, filters, search ]  [ compact toolbar ]
```

- the optional title is strong; a configured description renders only as the `(i)` tooltip immediately
  beside that title and never as a persistent description row;
- a description without a title renders no isolated information icon;
- a filter may carry its own `description`, shown the way every Phi Control shows one: the `(i)` tooltip
  after the filter's label where the label is shown, the hover text of the Control itself where
  `labelPlacement` is `none`. It never becomes a persistent text row beside the filter;
- when the title is absent, the filter/query zone starts at the left edge;
- a binding Control may omit its visible `label` when the surrounding collection context already names
  the value; omission removes the label region and does not reserve an empty placeholder;
- the middle query zone grows and wraps according to the Collection Header's available container width;
- the right zone uses the canonical compact Toolbar presentation and remains right-aligned;
- built-in toolbar order is Add, configured resource/selection actions, Reset, Reload; unavailable tools
  leave no empty position;
- Reset is shown by default when query tools are present and may be disabled explicitly; Reload is shown
  only when enabled; selection actions remain visible but disabled without a selection; and
- every Control uses `presentation.controlSize`, which defaults to `small`; a Module must not resize or
  reorder these Controls through a domain wrapper, and action labels never wrap.

An icon-only binding-field Create tool uses its required `label` as its accessible name and may declare a
separate `description` as its tooltip. A missing description creates no tooltip implicitly.

The zones are flexible wrapping regions, not visible dividers and not browser-viewport breakpoints. The
shared `PhiCollectionHeaderControl` owns their container-responsive presentation. The owning Table/Tree
Widget supplies query Controls and a compact `PhiToolbarControl`; an embedded Form field uses the same
Controls and must not embed a CMS Widget inside `PhiFormControl`.

A self-contained Table separates its Collection Header from the Table Control by global `space.sm`.
Pagination uses the same `space.sm` separation below the Table and adds no outer block-end margin. A native
Table footer remains attached to the Table body and does not introduce another gap.

A select filter may declare static options or one normal Options Provider binding. Dynamic option
resolution uses the active Module provider registry exactly like other Phi choice Controls; the Table
must not fetch or branch on a domain Provider key to populate a filter.

A select filter asks its Options Provider as a Form field asks it (`usePhiTableFilterOptions` over
`usePhiControlOptionsProvider`, the same hook `PhiFormControl` uses), so a source that answers one page
of a longer list behaves the same in both places:

- the value the filter holds goes to the Provider as `selected`, so a chosen value that is on no page the
  Provider answers is still named rather than shown as its raw value, and the hook keeps the name a
  chosen value was last seen with while an answer leaves it out;
- where the binding declares `search` -- with `loadMode: "server"`, the Provider answers it -- the single
  select filter has a search box, debounced and held to `search.minChars` by the hook, and a Provider
  that answers the search is not narrowed again by the Select. A multiple select filter passes `selected`
  but has no Provider search, like the Form's multiple select field.

The filter holds an option's value as its source names it: static options are texts, and an Options
Provider may name its choices by number -- a category by its id -- which the query then carries as that
number.

Every self-contained query Control is controlled by the Binding's resolved query. A Widget must not keep
a second filter-value store beside the Binding. Initial filter defaults are merged into the Binding's
initial query, signal-driven query changes update the same state, and Provider-resolved defaults are
immediately reflected by the same generic Controls.

The two modes change placement only. They do not change Provider calls, action capabilities, query
normalization, validation, or authorization.

In `external` tools mode, the Widget does not render the integrated query/toolbar zones. An optional title
and its description tooltip remain Widget presentation metadata. `presentation.borders` applies only to the rendered Table Control; it never
wraps the Widget header, tools, diagnostics, or an external host. `presentation.row.striped` alternates
the currently rendered row order on the active page using the global Ant Design fill token. Sorting,
filtering, pagination, expansion, and Provider refreshes may therefore change which displayed rows carry
the alternate background without changing row data.

Table presentation may declare `presentation.row.mutedWhen` with one generic row or Controller condition
expression. A matching expression applies the Core muted-row treatment without changing Provider data,
editor mutability, selection, or action availability. Domain field names and meanings remain in the
Provider and preset; the Control receives only the resolved row style.

A Table without rows shows `presentation.emptyState`: its `title` (Core's "No rows found." where none is set)
and its `description` where one is set. Without a `description`, Core's generic hint ("Adjust the table
filters and try again.") shows only while the reader's query narrows the rows: a search text, or one of
the Table's own `features.filters` holding a value -- a `defaultValue` and a boolean `false` included,
since both narrow the query and the reader can change them. A key pinned by `fixedFilters` does not count,
and neither does a filter key a Controller or another Widget sets by signal that is none of
`features.filters` (a list narrowed to the row selected above it): there is nothing in the Table to
adjust. A Table whose emptiness says something of its own -- "Select a key to see its devices." -- says it
in its `title` or `description`.

### Surface

A Table's ground is said in the Surface vocabulary every box uses (`types/surface.ts`, LAYOUTING.md
"Surface"): `presentation.surface` on the Table Widget, `surface` on `PhiTableControl`, `surface` in a Form
table field's config. A Table draws the part of a Surface a table can carry -- its ground --
(`components/tables/phi-table-surface.ts`):

- left out, the Table's own ground: the Theme's container ground under the rows, the header and footer
  fills over it. The default, and what every Table without the key keeps;
- `null`, the Surface switch's None: no ground at all. The Table's box, its header, its footer, a summary
  row, a sticky header and a fixed column paint nothing, and the Table is its row lines on whatever it
  stands on;
- a Surface whose ground is one colour and that states nothing else -- no line, no depth, no mode, no
  ground per mode; `PHI_SURFACE_WASH` is one. The whole Table stands on that colour, header and footer
  included.

Row hover and row selection keep their fills: they answer the pointer and are not the ground. A line, a
shadow or a picture is a box around the Table, not its ground, and is refused as a config error; a Table
that wants one stands in a Layout or a Widget slot that draws it. The outer frame stays
`presentation.borders` (`bordered`), and neither key reaches the Widget's header or tools. A Table in an
inspector is lines only and takes the one template for it (BUILDER.md "Tables in an inspector"). There is
no Inspector field for the key yet: the Surface Control offers looks a Table cannot draw.

### Footer and summary

The header row and the footer bar stand one step of the padding scale shallower than the rows
(owner, 2026-11-26): a large Table's `base` is `sm` there, a medium one's `sm` is `xs`, a small one's `xs`
is `xxs`, each read from the Theme's spacing variables (`styles/controls.css`). The body rows keep Ant
Design's cell padding, which is why the step is taken on those two parts and never on the Table tokens
(`cellPaddingBlock*`), which pad a header, a footer and a row alike. Only the block axis changes, a
header cell with sort or reorder buttons grows to them, and the pagination below stands `xs` from the
Table.

Table footer and column summary are separate native Table presentation contracts:

- `presentation.footer` renders the full-width Ant Design Table footer below the Table body. It owns one
  translatable plain-text `template`, an ordered list of value bindings for `%1`, `%2`, and subsequent
  placeholders, and optional alignment. It is the Table's visual bottom edge when present. Optional
  `variants` say the line differently while one value holds: each names a `when` -- a footer value
  binding's source and `truthy` or `falsy` -- and its own template and values, and the first that holds
  replaces the declared line; an empty variant template clears the text while keeping the footer bar.
  A sentence that changes with the state ("3 of 5 left" against "Used up") is
  two templates rather than one with a condition inside, because the template fills placeholders and
  nothing else.
- `presentation.summary` renders column-bound Ant Design Summary rows. Every cell addresses stable
  `columnKey` endpoints; persisted numeric column indexes are forbidden. The Control resolves indexes and
  spans after selection, drag, action, hidden-column, and visitor column-order projections. Summary rows
  may remain at the body end or use the closed `sticky-top` and `sticky-bottom` placements.

Footer value bindings and Summary items reference either one
typed Provider `summaryFields` key or one closed Core Table-state key: `totalRows`, `pageRows`,
`selectedRows`, `page`, or `pageCount`. The Provider descriptor declares summary field names, titles, and
scalar types; the query result supplies their scalar values in `summary`. A Provider never receives or
interprets the footer template, alignment, columns, spans, or placement. The preset never counts
rows or renders either surface.

`totalRows` and `pageCount` are the count of the whole query, which only a Provider that counts can give.
Counting is a query of its own on a large table, so a paging resource answers `total` only where its
descriptor says `query.total: true`; a resource that does not page answers every row at once, and its
rows are its count. A Table bound to a paging resource without a count may not show `totalRows` or
`pageCount` -- the binding check refuses it -- and pages without one: back, the current page, next. An
offset-paged resource offers next while the page is full; a cursor-paged one while a `nextCursor` comes
back, and only then ("Paging", below). The rows of one page are never put in place of the count.

The Table receives an already locale-resolved template and only formats its values. A code-owned Preset
must resolve the complete template through its owner's global Label Set while building the Preset; a
site-authored template follows the normal CMS Site-translation ownership path before it reaches the generic
Table. Translation therefore occurs before placeholder replacement and may reorder placeholders. The Table
must never translate the template again or infer its source owner. Values are escaped scalar text and can
never inject HTML. Splitting a footer sentence into separately translated labels or persisting separator and
label-placement fragments is forbidden.

**A Table with a header ends in its footer.** A Table that shows its header row (`presentation.header`
not `false`) states `presentation.footer`: the line under its rows that says how many there are or which
page this is -- "%1 addresses", "%1 users of %2 total", "%1 on page %2" for a resource that pages without
a count -- its template the `%1 …` footer label of the Table's own Label Set, translated while the preset
is built. The bar also stands when no footer text was configured; this runtime default does not replace
the preset's obligation to declare its own line. A Table without a header draws no footer: it lays out
rows or aligns columns (a field and its value, side by side), and neither part has anything to say there; the missing header is the whole
exemption. Only a Table with a header and truly nothing to count leaves the footer out, and says why in
`presentation.footerOmitted`, a reason for the next reader of the preset that is never drawn and never
translated. A single setting is not such a Table: one value is set with an ordinary Form, one field and its
Save, never a one-row Table edited in its cell (owner, 2026-11-26; Admin -> Settings -> Customer data, the
retention). New Pages kept leaving the footer out; `checkPhiPresetTables` refuses such a preset Table
([Module and preset obligations](#module-and-preset-obligations)).

Footer and summary may coexist. Their persisted config cannot contain functions, JSX, actions, editors,
or arbitrary Ant Design properties. Trees have no matching native footer or summary contract; a tree-like
Table may use these Table contracts, while `PhiTreeControl` and `PhiTreeWidget` do not acquire them.

### Loading

While its rows load, a Table draws skeleton rows in their place: **three** unless it says otherwise
(`PHI_TABLE_LOADING_ROWS`, `constants/table-loading.ts`). Few on purpose: most Tables hold a handful of
rows, and a Table that loaded as a page of eight and then showed two shrank under the reader's eyes and
pulled the Page below it up. Three rows grow into what arrives, and growing is what a reader expects of a
list that fills. A Table known to fill its page -- a paged listing of many -- may state its own count in
`presentation.loadingRows`, a whole number from 1 to `PHI_TABLE_LOADING_ROWS_MAX` (25); the count is never
more than a page holds. It is presentation only: the Provider, the query and the page size do not change.

The width stays: the columns are the ones the rows will have, each skeleton as wide as its column's fixed
or minimum width, and a Table with row selection keeps its selection column while it loads, its controls
disabled and nothing chosen, so the columns do not move when the rows arrive; a column that sizes to its
content gets a skeleton a short word wide rather than collapsing. A sticky header row, a table of its own
whose widths Ant Design measures from the rows, keeps its titles' own widths while there are none to
measure (`phi-table-control--loading`, `styles/controls.css`), as it does while the Table is empty. The
header, the toolbar and the pagination stand as they are. The footer bar stays in place with empty
text while loading; its text and the summary come with the rows.

## Columns

Each column has one stable `key`. The `columns` array order is the canonical Authoring order; a second
numeric `sortOrder` is forbidden because it can disagree with array order. The generic Builder collection
editor must support insertion, deletion, and drag or explicit move reordering without a Widget-type or
Provider-key branch.

A column may declare presentation metadata such as:

- the selected Provider `fieldKey`
- `title`
- `titleIcon`, an icon ahead of the heading, and `titleDisplay: "icon"`, which makes the icon the whole
  heading: the title becomes its tooltip and accessible name, never dropped. For a column whose heading
  is wider than anything under it -- the Builder's Modules table heads its Area checkbox columns with the
  Area's icon and gives them one fixed width. `titleDisplay: "icon"` without `titleIcon` is refused.
- `description`, a hint shown as the `(i)` tooltip beside the heading, never as a second line
- a compatible read renderer
- an optional permitted inline-edit mode
- semantic `sizing`
- `align`
- `ellipsis`
- `hidden`
- `valueMap`
- `emptyText`, what the cell says where the row holds no value (below)
- `tagColorMap` using only Ant Design's closed Tag status values `default`, `success`, `processing`,
  `warning`, and `error`; its preset colors `magenta`, `red`, `volcano`, `orange`, `gold`, `lime`,
  `green`, `cyan`, `blue`, `geekblue`, and `purple`; or the explicit
  `{ kind: "custom", value: "<color>" }` exception
- `tagVariant` using `outlined`, `filled`, or `solid`; omitted values resolve to the Phi default
  `outlined`
- `sortable`
- the Provider field selected for sorting when it differs from the displayed field
- `iconFieldKey`, a declared `icon` field whose named icon stands ahead of the column's own value, and
  `imageFieldKey`, a declared `string` field whose picture stands there, drawn as the `image` renderer
  draws it (below): a name and the mark standing for it read as one thing, not as two adjacent columns.
  With both, the picture comes first, then the icon, then the value

The column does not redefine the Provider field's data type, mutability, validation, or option source.
A renderer is presentation only: badge, tag, link, code, or formatted text presentation cannot change
the underlying field type. A configured renderer or editor must be compatible with the selected field,
and an incompatibility is a contract error, refused where the config is made
([Checked where it is made](#checked-where-it-is-made)).

`valueMap` maps raw Provider values to localized display labels. `tagColorMap` independently maps raw
values to Ant Design's Tag status or preset colors and is used only by the `badge` and `tags` renderers.
Standard entries persist the Ant Design color name, not a copied theme value; an intentional custom
color uses only the explicit structured custom shape. `tagVariant` applies uniformly to every Tag in
the column rather than introducing per-value presentation branches.

`emptyText` is what a cell says where the row holds no value -- `null`, an empty text or an empty list
-- already in the reader's language: "Unlimited" in a `datetime` column whose expiry is open (owner,
2026-11-26). It is drawn as text in place of whatever the renderer would have drawn, for every renderer
alike, because no value is no renderer's to draw: a `datetime` has nothing to format and `valueMap` maps
values, not their absence. A value that is there -- `0`, `false` -- is drawn as before. Absent, the cell
stays empty. The parser reads it strictly: anything but a text is refused, and an empty text is absent.
It is translated the way the column's `title` is: a Preset writes it in the reader's language from its
Label Set, as it writes the title, and its Inspector field declares it a label (`text: "label"`), so the
Widget text pass counts it with the title wherever it reaches the column.

### Read renderers

`renderer` names how a value is drawn, from one closed vocabulary (`PhiTableValueRenderer`) that a
column and a `record` Widget field share; `renderPhiValueContent` is its single implementation. Each
renderer accepts only the Provider field types listed here, and anything else is a contract error:

| Renderer | Provider field type | What is drawn |
| --- | --- | --- |
| `text` (default) | any | the value as text, through `valueMap` |
| `email`, `link`, `code`, `badge` | `string`, `enum` | a mail link, a link, inline code, one Tag |
| `date`, `datetime` | the same type | the reader's locale, on the Site's time zone |
| `tags` | `enum[]`, `json` | one Tag per entry |
| `json` | `json` | inline code in a cell, indented in a record |
| `switch`, `checkbox` | `boolean` | a read-only mark |
| `icon` | `icon` | the named icon |
| `image` | `string` | a small picture from a Site-relative address |
| `money` | `json` | an amount of money in the reader's locale |
| `interval` | `json` | a period in Core's words |

`money` reads `{ currency, minor }`, the payment contract's `PhisPaymentMoney`, with `minor` an integer
string or a safe non-negative integer of minor units, in a currency `PHIS_PAYMENT_CURRENCY_EXPONENTS`
names -- or a price list as the `money` Form field holds one, minor units per currency code
(`{ CHF: "1990", GBP: "1590" }`), whose amounts stand side by side in the list's order, so one column
shows a product's prices in every currency it has one in. A list with an entry that is not an amount
draws nothing, as a value that is no amount does. It is written with `formatPhisMoney` (`@phis/contracts/payments`) in the reader's locale
(`usePhiIntlLocale`), with exactly the currency's own places -- two for the franc, none for the yen,
three for the dinar -- and no digit passes through a float. A Provider hands over the amount, never a
formatted string, so every Table, record and Module writes the same amount the same way.

`interval` reads `PhiIntervalValue`, `{ unit: "day" | "week" | "month" | "year", count }` with a whole
`count` of one or more, and says it with the words of Core's `value:interval` Label Set: "per month"
for one, "every 3 months" for several. The words come from the Label Set rather than from `Intl`'s unit
names, which say a length ("3 months") where a price needs a period, and which no translator can reach.
The Table and record Widgets read the set on the server in the page's language and hand it to their
Client half with their own labels.

`image` reads a Site-relative address the Provider answers ready to load: an image variant the server
built, with its cache revision in the query, never an Asset id that the browser would turn into an
address. For a list that is the Media library's `icon` variant (`PhiImageAssetVariantKey.Icon`, 64 x 64,
fitted whole on a transparent ground, so an app icon or a logo keeps its edges); phis-server builds such
addresses with `resolvePhiMediaVariantUrl`, as `imageListPath` and `iconListPath` of `GET
/api/site/products` do. Only an address on this Site is drawn (`readPhiInternalPath`); an absolute one,
another host or anything else draws nothing, so no Provider makes a list load pictures from elsewhere. It
is a plain `<img>` at a fixed 32 px square (`PHI_RENDERED_IMAGE_SIZE`), the same in a cell and in a record,
`object-fit: contain`, with the small corner of the scale (`borderRadiusSM`), `loading="lazy"` and
`decoding="async"`. It is not `next/image`: the variant already is the size it is shown at, and the
optimiser would fetch it again without the reader's session. The `alt` is empty, as for a decorative
picture: in a list it stands beside the name it belongs to -- ahead of it through `imageFieldKey`, or in a
column whose heading says what it is, with the row's name in a cell of its own -- and a screen reader
that read the name again would read every row twice. An empty value is an empty cell.

A value that is not of its renderer's shape draws nothing rather than its JSON.

A `badge` or `tags` Tag does not wrap, and it is never wider than the place it stands in: where a `fixed`
width, a `maxWidth`, `ellipsis` or a narrow record leaves less room than its word, the Tag ends at that
edge and the word in an ellipsis, said whole in the house tooltip. A `content` column still measures the
whole Tag. A column cut off at the right edge of a Table that scrolls sideways is not this: there the
sticky actions column covers the last data columns until the reader scrolls, and the remedy is a Table
that fits its place (fewer or narrower columns, a lower `minWidth` on a `fill` column).

### Provider field schema and cell editors

Every field exposed by a Provider resource has one stable `key` and one closed semantic `type`. The
field types and their default Core editors are:

| Provider field type | Canonical serialized value | Default editable Control |
| --- | --- | --- |
| `string` | string | `PhiTextControl` |
| `number` | finite number | `PhiNumberControl` |
| `boolean` | boolean | `PhiSwitchControl` |
| `date` | `YYYY-MM-DD` | `PhiDatePickerControl` with date precision |
| `datetime` | ISO 8601 timestamp with an explicit offset | `PhiDatePickerControl` with datetime precision |
| `color` | canonical Phi color string | `PhiColorControl` |
| `icon` | canonical Phi icon identity string | `PhiIconPickerControl` |
| `enum` | declared string or number option identity | `PhiSelectControl` |
| `enum[]` | ordered array of declared string or number option identities | `PhiMultiSelectControl` |
| `json` | serializable JSON value | no implicit inline editor |

The Provider type expresses value semantics; the column editor independently selects one compatible
Core presentation through the closed `editor.control` field:

The presence of the column `editor` object enables editing. Its Builder projection exposes
`editor.enabled` only to create or remove that object; `editor.enabled` is not a second runtime editing
mode. An omitted `editor.control` selects the semantic field type's default Core Control.

A number editor takes its unit from `editor.prefix` -- "days", "ms" -- already in the reader's language,
because the preset resolves it from its Label Set like the column title. The unit belongs to the value
and not to the title: a header saying "Window (days)" leaves the number unitless once it scrolls away.

| Provider field type | Allowed `editor.control` | Omitted default |
| --- | --- | --- |
| `boolean` | `switch`, `checkbox` | `switch` |
| `icon` | `icon-picker` | `icon-picker` |
| `enum` | `select`, `radio`, `segmented` | `select` |
| `enum[]` | `multi-select`, `checkbox-group` | `multi-select` |
| `string` | `textarea`; `select` with row options or the placement's own `editor.options` | single-line text input |

`textarea` edits a `string` field over several lines, for values longer than a column is wide -- a
translation, a description. The area is as tall as its text and wraps it; Enter commits as in every
other cell and Shift+Enter breaks the line. The value is the same string either way: the Control changes
how it is typed, never how it is stored, and a Provider that must not receive line breaks refuses them
in its own validation.

`boolean[]` is not a Provider field type. An array of positional truth values has no stable option
identity and must not be used to model a choice group. A scalar consent or enabled state remains
`boolean`, even when presented as one Checkbox. Exactly one selected choice is `enum`; zero or more
selected choices are `enum[]`. A one-option Checkbox group is valid `enum[]` when the resource semantics
are a selected-identity collection rather than a scalar truth value.

Radio, Segmented, Multi-select, and Checkbox-group presentations consume the same declared Options or
Options Provider as their semantic `enum`/`enum[]` field. Every option keeps its stable string or number
identity plus `label`, optional `description`, disabled state, and optional icon. Checkbox and Radio
presentations render the option label and expose a non-empty description as its Tooltip. Presentation
never changes cardinality, serialized values, validation, or mutation behavior.

Row options are for a choice that belongs to the row rather than to the field -- a Navigation container
choosing among its own children, say. A row that carries options is edited with a Select limited to
them, and the Binding refuses a value the row does not offer or offers disabled; a row that carries
`null` or nothing keeps the field's ordinary editor, so one column can be a Select on some rows and free
text on others. A column may state `control: "select"` for such a field. The reader drops an entry
without a string `value` and `label` instead of repairing it, and the Provider still validates every
mutation itself. Row options exist on `string` fields only, never together with `options` or an Options
Provider. A Tree resource may declare them the same way and the catalog validates the declaration, but
the Tree Binding does not enforce them and the Tree Control has no string-field editor that uses them.

Provider values and mutation payloads use those serialized forms. Ant Design objects such as Dayjs
instances and React nodes never cross the Control/Binding boundary. Email, URL, code, badge, tag, and
similar treatments are string or collection presentation/format constraints, not alternate storage
types.

A Provider field descriptor owns:

- its stable key, title, semantic type, nullability, and read availability;
- whether the field is mutable and which resource mutation capability accepts the change;
- optional row/controller `mutableWhen` business conditions. Widget conditions may further disable an
  editor but can never make a Provider-disabled field mutable;
- type-specific constraints such as number minimum/maximum/step/precision or date boundaries;
- validation metadata;
- for `enum` and `enum[]`, one consistent string or number identity type plus either serializable options
  or one declared Options Provider binding;
- for a `string` field whose choices differ from row to row, an optional `rowOptionsPath` naming a
  declared `json` field of the same row that holds `[{ value, label }]`;
- an optional default editor descriptor using a registered compatible Phi field/Control provider.

Core types resolve to the default Core editors above. A Module may declare a compatible field-provider
editor through the normal module/provider manifest; it must not send React components, Ant Design props,
import paths, or executable render callbacks in a field descriptor. Table configuration may disable
editing or select another declared compatible editor, but it cannot make a read-only field mutable or
weaken Provider validation and authorization.

Column sizing is a closed semantic contract rather than a transport for raw Ant Design column props:

```text
content
└── optional minWidth and maxWidth

fixed
└── required width

fill
└── optional minWidth and maxWidth, and a default floor when minWidth is omitted
```

- `content` keeps the column intrinsic and does not consume deliberate remaining width.
- `fixed` holds the configured CSS length. Numbers are pixels; the shared length units remain available.
- `fill` participates in the browser-distributed remaining Table width and grows with its container.
- several `fill` columns may share the remaining width; their exact ratio is intentionally not persisted.
- `minWidth` and `maxWidth` constrain `content` and `fill`; they are not alternate fixed widths.
- a `fill` column without `minWidth` still has one. `content` columns never yield, so a narrow container
  puts the whole shortfall on the `fill` columns, and an unfloored one can be squeezed past its own
  title: the title wraps, and the header row grows to the tallest cell in it. The generic Control
  therefore applies a default floor below every deliberately chosen `minWidth`, so an explicit one always
  wins. The floor keeps a column a column; a column that must be *read* still states its own width.
- omitted column sizing resolves to `content`; `fixed` requires an explicit width and `fill` must always
  be selected explicitly.

A visible data column may declare `sticky: "left" | "right"` as presentation when
`layout.overflowX` is `auto`. Sticky is independent from semantic sizing: for example, `content` plus a
`maxWidth` remains intrinsic up to that limit and then wraps, while `fixed` keeps an exact width. When a
left-sticky data or DnD column exists, the generic Control automatically keeps an enabled selection
checkbox/radio column in the same left-sticky group. This synthetic Control placement is not separate
Widget config. Sticky placement does not change column data, selection state, Provider calls, or
authorization.

Table presentation independently declares `layout.mode: "auto" | "fixed"` and
`layout.overflowX: "auto" | "visible"`. Auto layout permits content sizing. Fixed layout requires at
least one visible fill column so fixed columns do not silently absorb unassigned space. Ellipsis requires
fixed layout. Horizontal auto overflow scrolls only when the resulting minimum/fixed widths no longer fit
the Table container. Raw `tableLayout`, `scroll`, responsive breakpoints, Ant Design `minWidth`, and a
legacy top-level column `width` are not persisted ABI.

Column order, row sorting, visitor column reordering, and resource row ordering are separate contracts:

- **Authoring column order** is persisted as the ordered `columns` collection.
- **Row sorting** updates the normalized Table query and is executed by the Provider when the source is
  provider-backed.
- **Visitor column reordering** is optional transient presentation state. It emits the standard Table
  column-order signal and is persisted only by an explicitly wired preference owner.
- **Resource row ordering** changes Provider-owned data order through a typed row-move mutation. It never
  rewrites the Widget's column collection or normalized sort query.

Row sorting supports `none`, `single`, and `multiple`. The normalized query carries an ordered sort list
of stable column or Provider field keys plus `ascending` or `descending`; raw Ant Design sorter objects
and the Ant Design strings `ascend` and `descend` are implementation details, not public ABI.

Pagination is on unless `features.pagination.enabled` is `false`. `features.pagination.pageSizes` lists the
page sizes a reader may switch between; without it the Table offers no choice and keeps `pageSize`. The
header row shows unless `presentation.header` is `false`.

### Paging

The resource says how it pages (`query.pagination`), and the Binding turns the page accordingly
(`changePage(page, pageSize)`, what the pagination calls):

- **`offset`**: the query carries the page and the page size, `cursor: null`, and any page may be asked
  for by its number.
- **`cursor`**: the Provider reads on from where a page ended and cannot be asked for page 3 by its
  number -- every paged Add-on query of Core is of this kind. The Binding remembers the cursor each page
  was read with: page 1 none, page N+1 the `nextCursor` page N answered. Turning to a page hands the
  Provider that page's cursor, so back is read with the cursor the earlier page was read with, and next
  with the one the page shown answered. A page whose cursor is not known is no place in the list: the
  pagination offers back, the current page and next -- next only while a `nextCursor` came back -- and no
  page number beyond, also where the resource counts (a count says how many pages there are, not where
  page 7 begins), and `changePage` to such a page does nothing.

The remembered cursors belong to one list: the source with its binding params, the page size, the
search, the sorts and the filters -- the resolved query, whichever side set them (the Table's tools, a
signal, the host, `fixedFilters`). Any of them changing is another list, of which only page 1 is known
until it answers: the Binding offers none of the old list's cursors. The Table's search, sort, filter,
Reset and binding-param changes, and the `searchChange`, `searchClear`, `filtersChange` and
`bindingParamsChange` capabilities, start it at its first page (`page: 1, cursor: null`); a
`queryChange` value or a host's `externalQuery` that names a page names its cursor with it. Another page
size starts at page 1 as well. A reload -- the Reload tool, the `reload` capability after a Form saved, a
revalidation after a mutation -- reads the page shown again with its own cursor and stays on it.
Answering the page again, it says anew where the next one begins; the pages after that are read from
there.

### Row selection

Row selection uses the closed modes `none`, `single`, and `multiple`. Single selection exposes zero or
one stable row identity; multiple selection exposes an ordered set of unique stable row identities.
Selection state never stores complete rows. Selection actions receive exactly that identity set and are
available only when the selected Provider resource declares the matching `selection` action capability.

Pagination may preserve selected identities only when `preserveSelectedRowIdentities` is explicitly
enabled. Absence from the current page does not invalidate a preserved identity; the Binding removes it
only after an explicit clear or Provider-confirmed invalidation. It must never infer identity from a
visible row index.

`rowSelection.emitFields` names row fields `selectionChange` carries alongside the identities, as
`selectedRows: [{ rowIdentity, values }]`. It is for a receiver that has to know something about what was
chosen and should not ask the server for what the Table already holds -- Admin Groups disables the
membership `+` while a retired group is selected. Named fields only, primitive values only; a selected row
the Table has not loaded keeps what was last read of it, or is absent. When a reload changes those values
for the current selection, the Table emits `selectionChange` again with the same identities, so a
receiver must treat an unchanged identity set as a refresh, not as a new choice.

### Disabled conditions

Toolbar, bulk, row-selection, row-action, and inline-edit disablement use the shared `disabledWhen`
condition contract. `features.editing.disabledWhen` applies to every configured cell or row editor;
`column.editor.disabledWhen` additionally constrains only that column. Provider actions may declare
`visibleWhen` and `disabledWhen` as Provider-owned availability metadata. Each property is one shared
recursive runtime-condition expression. Groups use `match: "all" | "any"` and may nest groups and leaf
conditions, so mixed Boolean expressions do not create another Table-specific condition path. Every leaf
is evaluated against the current `row` where a row scope exists or state supplied by one concrete active
Controller and uses `truthy`, `falsy`, `equals`, or `contains`; the latter two compare string values.
`source: "form"` is invalid outside a Form. Controller conditions are fail-closed until state arrives.

Controller state is requested and returned only through explicit routes on the `conditionStateRequest`
emit capability (`reload:none`) and the `conditionStateChange` listen capability
(`condition/change:json<runtime-condition-state>`). The Widget emits the request when its routes name
condition Controllers. A request route may materialize a Page-demanded Controller owned by an
already active Module, but never activates a Module. The Table remains presentation and query state: it
does not interpret role names, derive permissions, or call a permission endpoint. Providers independently
enforce every mutation authorization.

### Provider-backed row reordering

A Provider resource advertises row ordering with the closed capability `none`, `flat`, or `tree`.
`features.rowReordering.enabled` may expose row movement only when that capability is compatible with the
configured Table structure:

- `flat` reorders rows within one flat resource order;
- `tree` reorders siblings and may also move a row to another declared parent;
- `none` forbids a drag handle, move controls, optimistic reordering, and row-move Provider calls.

Drag and drop is one `PhiTableControl` interaction for this capability, not its persistence contract.
The Control emits a row-move intent; `PhiTableBinding` performs the Provider mutation and reconciles the
accepted canonical order or restores the previous order on rejection. A keyboard-accessible move
interaction must expose the same intent. Ant Design's `Table.components` and any drag library remain
private implementation details and are never persisted config or Provider metadata.

The drag handle is the first fixed Table column and is the sole pointer activator. When row selection is
enabled, Ant Design's selection column follows the drag handle rather than being implicitly prepended.
Keyboard position controls share the fixed actions column when one is present; otherwise the Control
creates one fixed actions column. For tree Tables, Widget config declares `structure.expandColumnKey`;
when the resolved data contains expandable rows, the generic Control renders the tree indentation and
expand affordance immediately before that configured data column's content. Row actions remain fixed right. This ordering is invariant: drag handle, optional selection,
configured data columns with the expand affordance attached to the selected column, then actions. The
expand column must reserve enough width for indentation, the expander, and its content. The complete row
and displaced sibling rows animate during a sibling reorder. A `child` target
does not displace its container or unrelated rows. A child-capable row uses top `before`, middle `child`,
and bottom `after` thirds. Its container participates in normal sibling displacement in `before` and
`after`, but remains stable in `child`. Expanded child rows remain independent `before` and `after` targets
and visibly make room at the accepted insertion edge. The preview is an insertion gap, not a row swap:
the active row remains above its source slot, and every visible row beginning at the resolved insertion
index moves down by the active row height. The active row and all of its cells remain above every hovered
or displaced row in both drag directions. `after` and `child` start after the complete visible target
subtree. Only currently expanded rows participate in Sortable indexes. Non-container rows use equal
outer `before` and `after` thirds and a neutral middle third. A positional zone that would preserve an
active row's existing direct-sibling position is also neutral: `before` does not activate on its immediate
next sibling, and `after` does not activate on its immediate previous sibling. Container `child` remains
valid in the middle third. At a shared-parent boundary, `after(previous)` is normalized to the equivalent
stable `before(next)` anchor; it is never normalized across a parent boundary. Accepted targets are visibly
distinct. Feature modules must not add another drag or expand column or implement their own row animation
or drop-zone presentation.

A row-move request uses identities rather than display indexes:

```text
movedRowIdentity
targetParentRowIdentity or null
beforeRowIdentity or null
afterRowIdentity or null
binding params
concurrency token when supplied
AbortSignal
```

The before/after anchors refer to siblings in the target parent. They prevent pagination, concurrent
changes, or a stale client index from being interpreted as canonical data order. Moving into an empty
parent may use null for both anchors. A Provider validates cycles, parent compatibility, authorization,
concurrency, and canonical placement and returns the normal accepted/rejected mutation result.

Same-resource row reordering is disabled while an explicit row sort, search, or filter is active because
the visible order then is not the canonical Provider order. Pagination is not an identity or Provider
boundary: a UI may expose targets from additionally loaded pages, but it may accept a positional drop
only onto a currently resolved stable target/anchor identity. It must never synthesize an unloaded target
from a page-relative index.

### Cross-resource and cross-Provider drops

Cross-resource and cross-Provider drag/drop is part of the shared Phi DnD contract and is not forbidden
for Tables. It is distinct from same-resource row ordering:

- the source declares a namespaced semantic drag payload type and a stable source-object identity;
  Provider-backed sources additionally carry stable Provider/resource/row references;
- the target Provider resource explicitly declares the payload types and shared drop modes it accepts;
- the shared drop modes remain `before`, `after`, `child`, `replace`, and `append`;
- the `PhiTableControl` owns drag handles, resolved drop affordances, keyboard equivalents, and visual
  feedback only;
- Widget signals may coordinate drag lifecycle and the committed semantic drop between independently
  hosted sources and targets;
- the target `PhiTableBinding` validates the declared compatibility and sends a typed drop mutation to
  the target Provider using source identities plus stable target parent/neighbor identities;
- the Provider returns the normal accepted/rejected canonical result and invalidation scope.

A cross-Provider drop does not implicitly delete or reorder the source. By default it creates or updates
a target-owned reference or copy, as with dropping a Page source into a Navigation tree. A destructive
transfer that must mutate both Providers requires an explicitly declared server-owned transactional
transfer capability; the Client must not approximate it through two unrelated Provider calls.

DnD payloads carry semantic type and stable references, not complete row snapshots, API URLs, callbacks,
pointer coordinates, or Provider implementations. The Table contract reuses the shared Phi drag/drop
value schema and capability matching; it must not introduce a Table-local parallel DnD protocol.

## Provider descriptors and resources

Every Table Provider has one namespaced `providerKey`, one `ownerModuleId`, and `kind: "table"`. Its
serializable descriptor advertises:

- non-empty title and description;
- execution mode: `static` or `live`;
- Authoring mode: `none`, `read`, or `edit`;
- its non-empty set of stable resources;
- binding fields for opaque `params`;
- query capabilities;
- typed field schemas and compatible default editors;
- supported Provider action capabilities, intent, confirmation policy, and business availability;
- optional hierarchy capability;
- optional flat or tree row-ordering capability;
- optional shared DnD source and target payload capabilities;
- lazy live and, where permitted, Authoring implementation edges.

Execution mode and Authoring mode are independent:

- `executionMode: "static"` means deterministic, side-effect-free resource reads are available.
- `executionMode: "live"` may use authenticated API, DB, store, or subscription state.
- `authoringMode: "none"` exposes metadata and binding fields only.
- `authoringMode: "read"` permits side-effect-free Canvas reads.
- `authoringMode: "edit"` permits the generic Builder resource editor to create and mutate Draft data.

In the Builder's canvas a `none` Provider of the edited Area stands in with its declaration and an empty
answer (`plugins/runtime-modules/builder/clients/metadata-table-provider-stand-ins.tsx`): a Table bound to it
draws its columns, tools and binding fields as the author arranges them and reads nothing, where it used to
say the Provider was not available. A record read through the stand-in is refused.

A Provider resource descriptor owns content semantics:

```text
resourceKey
row identity path
typed field schema and mutation capability
query capabilities
resource, row, and selection action capabilities
optional parent identity path
optional declared boolean row field indicating which hierarchy rows accept children
optional flat or tree row-ordering capability
optional accepted/source DnD payload types and drop modes
optional Form record-read capability
```

Row identity therefore belongs to the Provider resource rather than Table appearance. Table columns
select and present Provider fields; they do not redefine the resource schema.

`recordRead: true` declares that the same resource may act as a generic Form read source. Its live
Provider Client must then implement a record read for `resourceKey + rowIdentity + params + AbortSignal`
and return only the field values for that identity. A modal Form receives the identity through the
standard Table action signal; complete row snapshots are still never sent through the signal bus.

The Builder obtains Provider resources, parameter fields, capabilities, and static resource authoring
from the active target-Area Module catalog. It must not branch on a first-party Provider key.

## Query, result, and mutation boundaries

The generic Widget sends a Provider only:

```text
resourceKey
opaque binding params
normalized query
locale and timeZone
AbortSignal
```

`locale` is the reader's language and `timeZone` the Site's (`usePhiIntlLocale`, `usePhiIntlTimeZone`),
filled by the binding from the page's Intl context on every query and every record read
(`PhiTableProviderQueryRequest`, `PhiTableProviderRecordRequest`). They are for a Provider that writes
words, amounts or dates into what it answers, and they are part of what makes a query new: when the
reader switches language live, the Table queries again and an open `record` Widget reads its record
again. A Form's record read carries them too but is not repeated on a switch, because its values are
what somebody is editing. A Provider that answers raw values -- an amount as `money`, a period as
`interval`, an instant as `datetime` -- needs neither, and that is the better shape: the renderer writes
them in the reader's language without a second request.

It must not send the complete Widget config. Providers cannot inspect titles, columns, layout,
presentation, signal routes, or other CMS state.

The normalized query may contain:

- page and page size;
- search text;
- an ordered sort list;
- typed filter values;
- optional expansion or cursor state declared by a Provider capability.

A query result contains only resource data and provider-neutral query metadata:

```text
rows
total or page information
optional declared facets
optional typed summary values declared by the resource
optional resolvedQuery patch
```

`resolvedQuery` contains only query values that the Provider defaulted or canonically resolved while
serving the request. The returned rows already correspond to the request query merged with this patch.
The Binding accepts the data and patch as one result, merges the patch into its internal normalized query,
and must not issue a redundant second request merely to display the accepted canonical query. Externally
controlled query values remain authoritative; a Provider must not use `resolvedQuery` to contradict an
explicit externally controlled value. A selected default locale, normalized page, or resolved cursor is
query state and belongs here rather than in a domain-specific Widget branch.

Facets remain auxiliary declared result data. A Widget must not interpret a domain facet such as
`selectedLocale` to repair its own query state; the Provider reports canonical query values through
`resolvedQuery` and the generic Binding performs reconciliation.

Summary values are aggregate or status scalars for generic footer and Summary presentation. Every
returned key must be declared by the selected resource's `summaryFields` and match its declared scalar
type. They are not facets, rows, business commands, or an alternate query-state channel.
An accepted mutation that changes an aggregate without invalidating the current view may return a typed
`summaryPatch`; the Binding validates and merges only declared summary keys. This preserves cell- or
row-local reconciliation without forcing a full query solely to refresh the footer. Rejected mutations
must not return a summary patch.

Loading is Binding state presented by its host. Provider failures are typed errors handled through the
Binding. `loading`, rendered error messages, translated labels, dialogs, and notification placement are
not Provider result data.
Arbitrary `meta` must not become a second Form bootstrap, domain-state, or mutation path; use a Form
read source, Options Provider, or Controller signal for those concerns.

An action mutation receives the resource, opaque action key, relevant row or selection identity,
declared primitive action value, current query, binding params, and abort signal. A field mutation
receives the resource, stable row identity, field key, original value or concurrency token, proposed
serialized value, binding params, and abort signal. Row-edit mode sends the equivalent normalized field
patch in one transaction. A row-move mutation receives the stable moved/parent/neighbor identities and
optional concurrency token defined by the row-reordering contract. A cross-resource drop mutation
receives the declared payload type, stable source-object reference, optional source binding/row
references, shared drop mode, and stable target parent/neighbor identities. These are separate
discriminated request kinds; inline edits, row moves, and drops must not be encoded as invented domain
action keys.

Every mutation result explicitly reports accepted or rejected, its stable error code when rejected, its
canonical value or row patch when accepted, and whether no data, the current view, or the complete
resource must be invalidated. Returning an artificial empty Table result after a successful mutation is
forbidden.

An accepted field or row mutation whose `canonicalValue` and `rowPatch` completely describe the visible
change must return `invalidation: "none"`. The Binding applies that canonical result to only the targeted
cell or row and must not issue another Provider query. `view` and `resource` invalidation are reserved for
changes whose visible consequences cannot be represented by the returned canonical patch, such as row
membership, ordering, totals, or data outside the current binding.

### A refused read

A read the Provider refuses for this reader on purpose -- the staff's customer file on the reader's own record,
which Core never opens -- is no failure of the source. The Provider throws `PhiTableProviderError` with the
code `refused` (`PHI_TABLE_PROVIDER_REFUSED_CODE`, `components/widgets/client/shared/phi-table-provider-refusal.ts`)
and the sentence the reader is told; the Table draws itself, live as in the Builder, with that sentence where
its rows would be, and keeps its tools, so the reader can ask for something else. Every other failed read
ends the Table as before: the cause in the Builder, nothing but the log live.

### Binding and inline-edit lifecycle

`PhiTableBinding` is the only generic layer that communicates with the executable Table Provider Client.
The Control never resolves a registry, opens a Provider, or interprets a Provider result. The Widget
never duplicates Binding query or mutation state.

For an inline field edit:

1. `PhiTableControl` renders the resolved compatible Phi Control and owns only its transient input draft.
   The column editor may select a canonical Phi Control `variant`; the default is `underlined`.
2. Blur, Enter, or an explicit save interaction emits a controlled cell-commit callback containing the
   row identity, field key, original value, and proposed serialized value. Enter commits and ends the
   active edit by default; a blur caused by that Enter must not emit a duplicate commit.
3. `PhiTableBinding` verifies the resource/field mutation capability and calls the Provider directly.
4. The Provider validates authorization, concurrency, field constraints, and domain rules and returns
   an explicit accepted or rejected result.
5. An accepted result supplies the canonical value or row patch and an invalidation scope. The Binding
   replaces the optimistic draft with that canonical result and refreshes only as declared.
6. A rejected result supplies a stable error code and optional field message. The Binding restores the
   original canonical value and exposes the rejection state to the Control.
7. An accepted result may also carry a `message`, and the Widget announces it once as application
   feedback. This is how an action whose purpose is to find something out reports the finding: a
   connection test, a reference check, anything whose answer is not already visible in the row it
   changed. The Provider decides whether there is anything to say, and an omitted `message` stays
   silent — a result the reader can already see does not need repeating. The announcement belongs to
   the mutation and never to a refresh that follows it; a Table that spoke whenever it refetched would
   say nothing worth reading.

Mutation pending state is target-scoped and is not Table query loading. A pending cell mutation may set
loading or disabled presentation only on that cell editor; it must not clear the resolved rows, render a
Table loading Skeleton, or block unrelated cells and rows. Row, action, move, and drop mutations follow
the same target-scoped principle.

Foreground query loading is rendered by `PhiTableControl` as Skeleton cells across every visible Table
column, including the actions and selection columns, while retaining the configured headers and sizing,
in three rows unless the Table states `presentation.loadingRows` ([Loading](#loading)). Tables never replace their body with an Alert, Typography loading label, Ant Design Spin, or a
single full-width Skeleton paragraph. Feature modules pass `loading`; they do not own loading presentation.

When an accepted local patch touches a field used by the active filter or sort, the Binding applies the
patch immediately and then revalidates the current view in the background. Background revalidation keeps
the current rows rendered and does not enter foreground Table loading. An explicit query change, initial
query, or user-requested reload remains foreground query loading. A failed background revalidation keeps
the last canonical rows visible and exposes the query error separately.

Transport failures and aborted or superseded requests are distinct from a Provider rejection. The
Binding assigns request identity and must ignore stale completions. Provider validation and
authorization are authoritative; neither Widget configuration nor a Control may bypass them.

Cell editing and row editing are the two generic presentation modes. Cell mode commits one field at a
time. Row mode stages compatible mutable fields and commits one normalized row patch through the same
Binding/Provider transaction contract. Ant Design's editable-cell examples are implementation guidance,
not public Phi ABI, and an internal Ant Design Form does not turn the Table into a `PhiFormWidget`.

## Actions and signaling

Provider actions are declared by the selected resource, not invented by the Table. A Provider action
capability owns:

- one opaque stable action key;
- one scope: `resource`, `row`, or `selection`;
- its accepted primitive action-value type;
- semantic intent: `read`, `write`, or `destructive`;
- confirmation policy: `none` or `required`;
- whether the mutation is `undoable` through the workspace history;
- Provider-owned business `visibleWhen` and `disabledWhen` availability metadata.

The Table does not know what `deleteLocale`, `restore`, or another domain key means. It renders the
Widget-declared action presentation, gathers only the scope identities and declared primitive value,
shows the generic confirmation UI when configured, and asks the Binding to execute the opaque key. The
Binding verifies the descriptor capability and calls the Provider. Confirmation is presentation policy,
not Provider business logic; the Provider must still authorize and validate every confirmed request.

Widget configuration owns each action's localized label/tooltip, icon, explicit
`display: icon | label | icon-label`, `mode: normal | primary | danger`, order, and confirmation text.
The generic confirmation overlay for a Table action uses `left` as its default placement.
Its confirmation presentation may additionally declare one `PhiAlertControl` level, localized title,
and optional localized description. The Alert is rendered inside the same confirmation surface and is
presentation only; it cannot replace the required confirmation, change Provider intent, or authorize
the action.
It may add presentation-level visibility or disablement, but cannot loosen Provider availability,
redefine scope/value type/intent, or remove a required confirmation. A destructive Provider capability
must require confirmation unless it declares itself `undoable`, and its Widget action must use danger
presentation either way. `undoable` is the Provider's promise that the workspace history takes the
mutation back; like the confirmation policy it is declared rather than verified, and a Widget may still
configure a confirmation for an undoable action. Icon and icon-label
display require a resolvable icon; a missing or unknown icon is a contract error rather than a blank
action, refused where the config is made ([Checked where it is made](#checked-where-it-is-made)).
Dynamic confirmation
values come from declared serializable Binding/action context and are inserted with the central
translation formatter after the current UI-language template has been resolved. Complete rows and
untranslated string concatenation are forbidden.

**A value shown once.** Some acts answer with something nobody can read again: a licence key's activation
code is stored as its hash and answered once. The Provider returns it as `revealValue` on the accepted
mutation (`PhiTableProviderMutationResult`), and the action that may receive one states `reveal: { title,
description? }`, in the reader's language like the confirmation's words. The Table then shows the value in
`PhiRevealOnceDialogControl` (`components/controls/phi-reveal-once-dialog-control.tsx`): the value in a code
box, Close, and "Copy and close", which writes it to the clipboard and closes -- where the browser refuses
the copy the Dialog stays open and says so, the value still selectable. The buttons' words are the Table
Label Set's (`reveal_copy_and_close`, `reveal_close`, `reveal_copy_failed`). The Table keeps the value only
while the Dialog is open and never sends it on a signal: `mutationChange` carries the result without it. A
`revealValue` answered for an action without `reveal` is not shown, and an action's `message` is announced
as before. It is the one result of an act the Table shows in a Dialog, so a Form result, a record action or
an Add-on page that must show a value once uses the same Control.

Non-Provider Table affordances select one of two execution classes:

- `signal`: emit a generic Table action intent through persisted `signalRoutes`;
- `link`: navigate through a declared URL or row value path.

Signal and link definitions may describe compatible presentation and generic row-value conditions. They
never contain an executable callback, endpoint, Provider implementation, controller address, or
module-specific payload parser. They must not masquerade as Provider mutations.

The closed generic Table input capabilities are:

```text
search/change:string
search/clear:none
query/change:json<table-query>
filters/change:json<table-filters>
bindingParams/change:json<table-binding-params>
reload/activate:none
selection/clear:none
columns/change:json<table-column-order>
expansion/change:json<table-expansion>
action/activate:json<table-action>
condition/change:json<runtime-condition-state>
```

The closed generic Table output capabilities are listed by capability id; the channel is chosen by each
route:

```text
queryChange            change:json<table-query>
selectionChange        change:json<table-selection>
actionActivate         activate:json<table-action>
bindingParamsChange    change:json<table-binding-params>
stateChange            change:json<table-state>
mutationChange         change:json<table-mutation>
columnsChange          change:json<table-column-order>
expansionChange        change:json<table-expansion>
conditionStateRequest  reload:none
```

`mutationChange` carries every Provider mutation result the Binding reconciled, accepted or rejected.

All JSON capabilities use the value schemas in `PHI_SIGNAL_VALUE_SCHEMAS` (`types/signals.ts`) and
strict readers; the declaration lives in `plugins/runtime-modules/core/widgets/table/config.ts`. Table state signals
contain query, binding params, total/page information, loading, a stable error code where applicable, selection, column
order, and expansion state. They do not broadcast complete rows. Table action signals carry action and
row identities, selection, and an optional declared primitive action value; complete row snapshots are
not the default signal payload.

The `action/activate` input exists for externally placed generic Controls. It carries only a declared
action key, optional primitive action value, and, where the action scope requires it, explicit row or
selection identities. The receiving Widget resolves presentation and confirmation from the selected
Widget config, verifies the Provider capability and confirmation policy, then delegates execution to its
Binding. An external Control must not duplicate the
Provider endpoint, mutation callback, complete Table query, or domain payload logic.

A Controller may coordinate query, selection, dialog state, and several Widgets. It is not a Table API
proxy: Provider Clients perform reads and mutations, while signals coordinate runtime state.

The ownership boundary is strict:

- the **Provider descriptor** declares serializable resource schema, field semantics, capabilities,
  action intent/confirmation policy, and business availability;
- the executable **Provider Client** reads and mutates domain data and is authoritative for validation,
  concurrency, and authorization;
- the **Binding** owns provider resolution, request lifecycle, normalized query state, optimistic drafts,
  Provider-resolved query reconciliation, and invalidation for one bound resource instance;
- the **Control** owns rendering and immediate user interaction only;
- the **Widget** owns persisted Table presentation and feature placement, then adds CMS addresses and
  signal routing around the Binding and Control;
- a Module **Controller** coordinates workflows spanning several bindings, widgets, forms, navigation,
  or dialogs. It must not become a second Table Provider, cache, validation owner, or mutation proxy.

Provider request/response is a typed asynchronous call through the Binding, not a signal protocol.
Signals remain appropriate for cross-object coordination where no accepted/rejected/canonical-value
transaction response is required.

### The record Widget

The `record` Widget (`plugins/runtime-modules/core/widgets/record/`) shows one row of a Table Provider
resource that declares `recordRead: true` as named values. It never learns which Table sent the row: a
row action's `action/activate:json<table-action>` arrives on its `recordOpen` input, it keeps the row
identity when the `actionKey` is its `openActionKey`, and reads that record through the Provider Client's
`readRecord`. Its fields are Table columns without the table (`PhiRecordFieldDefinition`), drawn by the
same `renderPhiValueContent`. `state/change:boolean` `false` on `close` forgets the record.

It can act on the record it shows, so a dialog opened by a row action can do that row's business without
a Controller. `actions` names Provider actions of its own source's resource, in the Table's vocabulary
without what drawing a button takes (`PhiRecordWidgetAction`):

| Key | Meaning |
| --- | --- |
| `key` | A Provider action of the resource, of scope `row`. |
| `mode` | `normal` (default) or `danger`; a capability of intent `destructive` requires `danger`. |
| `confirm` | Optional `{ title, description?, okText?, cancelText? }`, `%1` the record's identity: a question asked before it runs. |

The Widget draws no button. A press arrives on its `actionActivate` input, `action/activate:string`,
whose value is the action's key -- a string command channel whose receiver lists the words it answers
(SIGNALS.md, "Actions"): the keys in `actions`. A Command Toolbar button in the dialog's footer sends it
with `emits: [{ capabilityId, value: "<key>" }]` and a route on that channel; the button carries the
words and the icon. A key the Widget does not list, a press while no record is shown, and a second press
while the first is on its way do nothing. The run is the Table's Binding's request: the descriptor check
`checkPhiTableProviderActionRequest`, then `requestPhiTableProviderMutation` on the same Provider Client
with `{ kind: "action", actionKey, rowIdentity, selectedRowIdentities: [], query: {} }` -- the identity the
Widget holds, no query, because a record is not a view of rows.

`validatePhiRecordWidgetBinding` (`helpers/record-widget-binding.ts`) holds `actions` to the resource as
`validatePhiTableWidgetBinding` holds the Table's: each declared, of scope `row`, named once, a
destructive one in danger presentation. Like the Table's, it runs where the config is made
([Checked where it is made](#checked-where-it-is-made)), not in the browser. A confirmation the resource
requires (`confirmation: "required"`) is not asked again: the record on screen, named in the dialog's
title, and the press beside it are that confirmation, and a `confirm` would make it a second question.
`confirm` is for a press that is not answer enough.

What the Provider answers is said as the Table says it: a rejected mutation, or a failure on the way,
stands above the record in an error Alert until the next press or the next record; an accepted one with a
`message` is announced as an info message. On acceptance the Widget emits `actionSuccess` and reads the
record again.

A record dialog is named by its record: `titleFromRecord: { template, field }` takes a sentence with `%1`
exactly once, already in the reader's language like the field labels, and the field (dotted for a nested
one) whose value stands there. After every read the Widget announces the sentence on `recordTitle`, and an
empty one as a row is asked for and where the record has no text or number there; routed to the Overlay's
`title` input (OVERLAYS.md), an empty title is the Overlay's own. It is the Form's `titleFromRecord`
(FORMS.md) with the placement's sentence in place of a Form text (`helpers/record-title.ts` is the rule
both share), and the descriptor compiler checks it the same way: malformed, without a `source`, without a
`recordTitle` route, a route that is not `change`/`string`, or sent to an Overlay of the tree that does
not hear it on `title`.

Inputs (`runtimeSignals.listens`):

```text
recordOpen      action/activate:json<table-action>
close           state/change:boolean
actionActivate  action/activate:string
```

Outputs, the channel chosen by each route:

```text
actionSuccess   activate:json<table-action>   { actionKey, rowIdentity, selectedRowIdentities: [] }
recordTitle     change:string
```

A dialog that releases what it shows wires five routes beside the row action's two: the footer's button to
`actionActivate`, Cancel to the Overlay's `dialog/close:none`, `recordTitle` to the Overlay's
`title/change:string`, and `actionSuccess` twice, as `dialog/close:none` to the Overlay and as
`reload/activate:none` to the Table, routes that carry nothing of the value. The Accounting product
directory (`plugins/runtime-modules/accounting/trees/phi-default-accounting-products-page-tree.ts`) is the
shape to copy:

```ts
// The record, in the dialog's body:
actions: [{ key: "release" }],
titleFromRecord: { template: labels.terms.titleOf /* "Terms: %1" */, field: "id" },
signalRoutes: {
  emits: [
    { routeKey: "terms-title", capabilityId: "recordTitle", scope: "page", channel: "title", action: "change", valueType: "string", receiver: overlay },
    { routeKey: "terms-done", capabilityId: "actionSuccess", scope: "page", channel: "dialog", action: "close", valueType: "none", receiver: overlay },
    { routeKey: "terms-reload", capabilityId: "actionSuccess", scope: "page", channel: "reload", action: "activate", valueType: "none", receiver: table },
  ],
  listens: [/* recordOpen, close, and: */
    { routeKey: "terms-release-in", capabilityId: "actionActivate", scope: "page", channel: "action", action: "activate", valueType: "string", receiver: record },
  ],
},
// The footer's Release button: { key: "release", emits: [{ capabilityId: "release", value: "release" }], variant: "primary" },
// and its route: { routeKey: "terms-release", capabilityId: "release", scope: "page", channel: "action", action: "activate", valueType: "string", receiver: record }
```

## Editable static resources

The static Provider implementation is immutable package code. Authoring edits a concrete static Table
resource, never the Provider implementation.

An editable static resource has:

- stable resource and row identities;
- a versioned field schema;
- ordered rows;
- optional hierarchy through a parent row identity;
- one Working Draft, one Published revision, and archived Published history;
- a package-owned preset baseline and optional Site-owned override where applicable;
- explicit create, update, delete, move, and schema-edit capabilities declared by its Provider.

Core provides immutable static-resource querying plus a versioned static Provider factory. Live clients
resolve Published snapshots; Authoring clients resolve and mutate only Working Draft snapshots through an
injected owner store. A concrete Module or Add-on supplies persistence and optimistic concurrency; Core
never invents an endpoint or stores Draft rows in Widget config.

Builder Preview reads the Working Draft. Live runtime reads Published. Builder editing must never mutate
Published resource data directly. Shared resources keep the same identity when referenced by several
Widgets or Markdown embeds; publishing and deletion must validate all references.

The generic Builder resource editor uses `PhiTableBinding + PhiTableControl` for Provider-backed flat
data and the shared tree editor for hierarchical data. Provider descriptors supply field, editor, and
capability metadata. There is no provider-local Builder page or special Inspector branch.

## Tree tables and Tree Widgets

Ant Design supports both hierarchical Table rows and a standalone Tree. Phi keeps those use cases
separate:

- a **tree table** has columns and uses `PhiTableWidget` with `structure.mode: "tree"`;
- a **Tree Widget** represents hierarchy without tabular columns and uses `PhiTreeWidget`, defined in
  [TREES.md](./TREES.md).

The public tree-table contract uses semantic fields such as parent row identity, default expansion,
expand-on-row activation, and semantic indentation. It does not persist Ant Design's nested `children`
property name or raw expandable props. Providers return normalized rows; the shared Table adapter builds
the Ant Design hierarchy.

The shared Control also owns the expansion affordance supplied by the Ant Design Table tree adapter.
Feature modules must not add a parallel expand/collapse column or reproduce hierarchy indentation inside
their data-cell renderers.

Sorting and filtering a tree must preserve valid ancestry. A Provider that cannot satisfy hierarchical
query semantics must not advertise that capability. Dragging a row to another parent is a typed
Binding-to-Provider row-move operation, not a Table Widget mutation shortcut; a static resource persists
that move in its Working Draft.

## Markdown reuse

Native Markdown tables render their parsed rows through `PhiPlainTable`, which has no query, editing, or
Provider lifecycle.

Their columns follow three rules (`components/widgets/shared/markdown-render.ts`):

- Cells do not hyphenate. Running text's `hyphens: auto` stops at the table; a cell breaks between words,
  and a word longer than its column still breaks rather than running into the next.
- A column whose every text, heading included, is at most 24 characters long after translation stays on
  one line (`nowrap`), so it takes the width of its longest entry and leaves the row to the others.
- The lengths of the delimiter row's dashes are the columns' widths when they differ: `|---|---------|`
  is 25 % to 75 %, alignment colons not counted. GFM asks only for three dashes, so every other renderer
  still reads an ordinary table. Equal dashes state nothing and leave the widths to the browser. A table
  with widths keeps no column on one line: its author has decided.

### Tables in Markdown

A Module may offer a Provider-backed Table to Markdown. A text names it in a paragraph of its own, as a
Media picture standing alone becomes a figure:

```markdown
![Our prices in francs](phis:table/@acme/prices/table-embeds/price-list?currency=CHF&category=hosting)
```

Every other Markdown renderer shows the caption. Here the paragraph becomes a `table_embed` block, drawn by
the generic Table Widget's own path -- `PhiTableWidget`'s Render Client, `PhiTableBinding`, the Provider --
read-only. Markdown never names a Provider, a resource, a column or a URL: it names what a Module declared,
and sets nothing but the caption and the parameters that declaration allows.

**The declaration** is `embeddableTables` on the Module's definition (`types/table-embed.ts`):

```ts
embeddableTables: [{
  key: "@acme/prices/table-embeds/price-list", // <package>[/modules/<module>]/table-embeds/<name>, the Module's own
  title: "Price list",                         // for an author; not drawn
  source: { providerKey: "@acme/prices/tables/prices", resourceKey: "prices" }, // a table Provider of this Module
  presentation: { columns: [...], layout: { mode: "auto", overflowX: "auto" } }, // the Table Widget's own
  sorting: { mode: "single", defaultSorts: [...] }, // optional, as the Table Widget's
  fixedFilters: { active: true },              // optional, as the Table Widget's
  params: {                                    // what Markdown may set, by the name it writes
    currency: { binding: "currency" },         // a binding field the resource declares
    category: { filter: "category" },          // a filter field of the resource, held like a fixed filter
  },
  maxRows: 10,                                 // optional: one page of this size and no pager
  accessPolicy: PHI_VIEWER_ACCESS_AUTHENTICATED, // optional, owned like a node's accessPolicy
}]
```

`source`, `presentation`, `sorting` and `fixedFilters` are the Table Widget's config types, and the embed is
drawn with exactly that config: no search, filters, row selection, actions, tools, editing, reordering or
signal routes, so nothing an embed shows can change a row. A resource that does not page is drawn whole,
without a pager, as is the one page of `maxRows`.

**What refuses a declaration.** Compiling the catalog (`plugins/runtime-modules/contracts.ts`) refuses a key
that is not the declaring Module's, one key offered twice, a Provider that is not a `table` Provider of the
same Module, a resource that Provider does not declare, and an access policy of another role provider. The
rest needs the Table's own code and is checked where a Preset's Tables are (THIRD_PARTY_MODULES.md,
"Checking a Page preset"): `checkPhiEmbeddableTables(definition)` from `@phis/ui/module/page-check`, which a
package runs in its tests beside `checkPhiPresetTables`, and which `validate-module-descriptors` runs over the
first-party catalog. It reads the columns against the resource with `validatePhiTableWidgetBinding`, refuses
a column editor, a fixed filter or parameter that names no filter field or binding field of the resource, a
parameter that sets what the source or a fixed filter already fixes, a parameter whose field is not text, a
number, a yes or no, or a choice the parameter can check -- a choice list a Provider serves cannot be checked
-- `maxRows` on a resource that does not page or outside 1 to 100, and a required binding field neither fixed
nor settable. The browser does not check the binding again ([Checked where it is made](#checked-where-it-is-made)).

**Drawing one** is the Markdown Widget's: the parser rule is in `components/widgets/shared/markdown-render.ts`,
the resolution in the Widget's `table-embeds.server.ts`, asked once per text with every embed in it.

- The key is looked up among the Modules active in the Area; an unknown key, or one whose Module is not
  active there, is refused.
- The viewer is checked as for a Table Widget on that Page: the Table Widget's own access policy, then the
  embed's `accessPolicy`. The Provider still decides what its rows are, as it does for every Table.
- Each parameter must be declared and is read as its field takes it: a choice among the field's options, a
  number, `true` or `false`, a text of at most 200 characters. A name given twice, an undeclared name, a value
  the field does not take, and a required binding field left open refuse the embed.
- Only a lone image in a paragraph -- inside a quote or a list as well -- is an embed. In a sentence, a
  heading or a table cell the address is dropped and the caption stays as text.
- Only the Markdown Widget's own text, inline or from its Content record, draws a Table. A record field
  standing in for the text, an entry's body, a teaser and the search index have the caption alone.
- A refusal is the caption as a paragraph. Where the text is authored -- the Builder's preview, the Editor --
  the reason stands beneath it; live there is no reason, as a hidden node gives none.
- The caption is the Table's title. A Table that cannot draw -- live, a read that fails, such as a viewer
  the Provider refuses with `401` -- says so in its state (`errorCode`), and the caption then stands as a
  paragraph rather than going with it; a refused read the Provider explains draws the Table, title and all.
  It is the Site's words, translated with the rest of the text in the
  Site's store; the Module's title and column titles are a Preset's words, translated in the platform's
  store. The Table's own words are its Label Set's.

**Budget.** The Table's code is in no chunk of the Markdown Widget. The embed block hands its config to the
Table Widget's Render Client by type (`PhiRuntimeModuleRenderClientHost`), which the Area's Client manifest
loads with `next/dynamic` where one is drawn, so a page whose Markdown embeds nothing loads no Table code.
The page mounts the embed's Provider Client as for any Table: the Provider scan
(`collectPhiRuntimeDataProviderKeys`) reads the embed keys in a Markdown Widget's source -- a code sample
that quotes one mounts a Provider, never a Table.

## Module and preset obligations

- Modules expose domain data through Table Provider descriptors and scoped executable Clients.
- Presets place the generic Table Widget and persist only presentation, source binding, and signal routes.
- A preset Table that shows its header states its footer, the `%1 …` line from its Label Set
  ([Footer and summary](#footer-and-summary)); a Table without a header needs none, and a Table with a
  header and nothing to count says why in `presentation.footerOmitted`. `checkPhiPresetTables`
  (`@phis/ui/module/page-check`) refuses a Table that does neither, as it refuses a broken binding of a
  Table, a Tree or a record Widget: a package's tests run it over every tree its presets build, with
  every data Provider it ships.
- A normal record Form remains the correct host when the interaction is a Form submit/reset lifecycle.
  Inline Table editing uses the Table mutation lifecycle and must not be routed through a hidden Form.
- A Form field provider may use the controlled compound-value exception when the complete local row array
  is genuinely one submitted Form value. A Form, picker, or Inspector may instead reuse
  `PhiTableBinding + PhiTableControl` for a Provider resource, for example selecting Provider-owned row
  identities. In that case the Form value is only the declared selection value; Provider query/mutation
  behavior still belongs to the Binding and Provider rather than the Form Controller.
- External Table search, filter, reload, and action Controls communicate directly with the Binding host or
  through declared Table input signals. A preset must not introduce a Form solely as a Table toolbar,
  and a Table must never inject its controls or actions into a separate Form Widget.
- Domain-named wrappers are allowed only for genuinely different presentation or lifecycle approved as
  a new central contract. They are not allowed to hide source binding, signals, bootstrap reads, dialogs,
  or missing generic Table capabilities.
- Core, Builder, and presets must not compare a Provider key, Module id, route key, or Widget type to
  select Table behavior.
- Missing Provider, resource, capability, field, action, or signal compatibility is a contract error,
  refused where the config is made ([Checked where it is made](#checked-where-it-is-made)). No
  direct-fetch, local business-mutation, duplicated Form, or legacy Widget fallback is permitted.

### Checked where it is made

A Table's, a Tree's and a record Widget's config is checked against the resource its Provider declares
where the config is made, and only there (owner, 2026-11-24): columns, filters, sorting, the counted
footer, every Provider action in its scope with the confirmation and danger the resource asks for, binding
tools, a Tree's node fields, editors and drag and drop, and every icon the Table's actions and binding tools
name (`validatePhiTableWidgetBinding`, `validatePhiTreeWidgetBinding`, `validatePhiRecordWidgetBinding`,
run together by `checkPhiWidgetBinding` in `helpers/widget-binding-check.ts`). The places:

- a package's tests, `checkPhiPresetTables` from `@phis/ui/module/page-check` over every tree its presets
  build, and phis-ui's own over every first-party preset (`plugins/runtime-modules/preset-text-sources.test.ts`);
- `checkPhiEmbeddableTables` for the Tables a Module offers to Markdown;
- the Builder's save of a Page, an Area or an Overlay (`gateway/site-cms-write-validation.ts`), which
  answers 422 `invalid-config` with the Widget, the node and the cause, and stores nothing; it also refuses
  an icon `PhiIcon` does not know in any field a Widget's Inspector offers as an icon.

A live Table, Tree or record Widget trusts the config it is handed and ships no checker: the validators
are in no Client graph. What it still shows as a failure is runtime state -- a Provider the Area does not
offer (`bindingError`), a read that failed -- and a config stored before these checks; on a live page
that failure card is drawn for Staff and for nobody else (`PhiWidgetFailure`, `components/widgets/README.md`).
A Widget bound to a Provider no Module of the Area declares passes the save: that is the Area's state, not
the config's.

`scripts/validate-table-contracts.ts` and `scripts/validate-control-boundaries.mjs` reject direct Ant
Design Table imports outside `PhiTableControl` and domain Table Widget aliases.

