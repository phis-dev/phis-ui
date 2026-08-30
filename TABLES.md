# Table and Table-Provider Contract

This document defines the normative target v1 ABI for tables in `@phis/ui`. It applies to
Core, every first-party Runtime Module, third-party Modules, live rendering, Preview, and Builder
Authoring.

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

Only immutable, already-resolved static rows, including native Markdown table rows and read-only preview
data, may render through `PhiTableControl` directly. This exception has no query, asynchronous loading,
editable cell, row/selection/resource action, row or column reordering, drag/drop, optimistic state,
Draft, persistence, or Provider lifecycle. The first such capability makes the data a Table resource and
requires `PhiTableBinding` plus a declared Provider. A domain-owned state store is not an alternative
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
module-specific Table render paths are not part of v1. If a Module requirement cannot be expressed by
this contract, implementation stops until the operator approves a central contract extension.

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

source
└── providerKey + resourceKey + opaque provider params
```

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

`resourceKey` replaces the Table-only term `tableKey`. `params` is serializable, provider-owned binding
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

Every self-contained query Control is controlled by the Binding's resolved query. A Widget must not keep
a second filter-value store beside the Binding. Initial filter defaults are merged into the Binding's
initial query, signal-driven query changes update the same state, and Provider-resolved defaults are
immediately reflected by the same generic Controls.

The two modes change placement only. They do not change Provider calls, action capabilities, query
normalization, validation, or authorization.

In `external` tools mode, the Widget does not render the integrated query/toolbar zones. An optional title
and its description tooltip remain Widget presentation metadata. `presentation.bordered` applies only to the rendered Table Control; it never
wraps the Widget header, tools, diagnostics, or an external host. `presentation.row.striped` alternates
the currently rendered row order on the active page using the global Ant Design fill token. Sorting,
filtering, pagination, expansion, and Provider refreshes may therefore change which displayed rows carry
the alternate background without changing row data.

Table presentation may declare `presentation.row.mutedWhen` with one generic row or Controller condition
expression. A matching expression applies the Core muted-row treatment without changing Provider data,
editor mutability, selection, or action availability. Domain field names and meanings remain in the
Provider and preset; the Control receives only the resolved row style.

### Footer and summary

Table footer and column summary are separate native Table presentation contracts:

- `presentation.footer` renders the full-width Ant Design Table footer below the Table body. It owns one
  translatable plain-text `template`, an ordered list of value bindings for `%1`, `%2`, and subsequent
  placeholders, and optional alignment. It is the Table's visual bottom edge when present.
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

The Table receives an already locale-resolved template and only formats its values. A code-owned Preset
must resolve the complete template through its owner's global Label Set while building the Preset; a
site-authored template follows the normal CMS Site-translation ownership path before it reaches the generic
Table. Translation therefore occurs before placeholder replacement and may reorder placeholders. The Table
must never translate the template again or infer its source owner. Values are escaped scalar text and can
never inject HTML. Splitting a footer sentence into separately translated labels or persisting separator and
label-placement fragments is forbidden.

Footer and summary may coexist. Their persisted config cannot contain functions, JSX, actions, editors,
or arbitrary Ant Design properties. Trees have no matching native footer or summary contract; a tree-like
Table may use these Table contracts, while `PhiTreeControl` and `PhiTreeWidget` do not acquire them.

## Columns

Each column has one stable `key`. The `columns` array order is the canonical Authoring order; a second
numeric `sortOrder` is forbidden because it can disagree with array order. The generic Builder collection
editor must support insertion, deletion, and drag or explicit move reordering without a Widget-type or
Provider-key branch.

A column may declare presentation metadata such as:

- the selected Provider `fieldKey`
- `title`
- a compatible read renderer
- an optional permitted inline-edit mode
- semantic `sizing`
- `align`
- `ellipsis`
- `hidden`
- `valueMap`
- `tagColorMap` using only Ant Design's closed Tag status values `default`, `success`, `processing`,
  `warning`, and `error`; its preset colors `magenta`, `red`, `volcano`, `orange`, `gold`, `lime`,
  `green`, `cyan`, `blue`, `geekblue`, and `purple`; or the explicit
  `{ kind: "custom", value: "<color>" }` exception
- `tagVariant` using `outlined`, `filled`, or `solid`; omitted values resolve to the Phi default
  `outlined`
- `sortable`
- the Provider field selected for sorting when it differs from the displayed field

The column does not redefine the Provider field's data type, mutability, validation, or option source.
A renderer is presentation only: badge, tag, link, code, or formatted text presentation cannot change
the underlying field type. A configured renderer or editor must be compatible with the selected field,
and an incompatibility is a visible contract error.

`valueMap` maps raw Provider values to localized display labels. `tagColorMap` independently maps raw
values to Ant Design's Tag status or preset colors and is used only by the `badge` and `tags` renderers.
Standard entries persist the Ant Design color name, not a copied theme value; an intentional custom
color uses only the explicit structured custom shape. `tagVariant` applies uniformly to every Tag in
the column rather than introducing per-value presentation branches.

### Provider field schema and cell editors

Every field exposed by a Provider resource has one stable `key` and one closed semantic `type`. The v1
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

| Provider field type | Allowed `editor.control` | Omitted default |
| --- | --- | --- |
| `boolean` | `switch`, `checkbox` | `switch` |
| `icon` | `icon-picker` | `icon-picker` |
| `enum` | `select`, `radio`, `segmented` | `select` |
| `enum[]` | `multi-select`, `checkbox-group` | `multi-select` |

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
└── optional minWidth and maxWidth
```

- `content` keeps the column intrinsic and does not consume deliberate remaining width.
- `fixed` holds the configured CSS length. Numbers are pixels; the shared length units remain available.
- `fill` participates in the browser-distributed remaining Table width and grows with its container.
- several `fill` columns may share the remaining width; their exact ratio is intentionally not persisted.
- `minWidth` and `maxWidth` constrain `content` and `fill`; they are not alternate fixed widths.
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

### Row selection

Row selection uses the closed modes `none`, `single`, and `multiple`. Single selection exposes zero or
one stable row identity; multiple selection exposes an ordered set of unique stable row identities.
Selection state never stores complete rows. Selection actions receive exactly that identity set and are
available only when the selected Provider resource declares the matching `selection` action capability.

Pagination may preserve selected identities only when `preserveSelectedRowIdentities` is explicitly
enabled. Absence from the current page does not invalidate a preserved identity; the Binding removes it
only after an explicit clear or Provider-confirmed invalidation. It must never infer identity from a
visible row index.

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

Controller state is requested and returned only through explicit `conditionStateRequest` and
`conditionStateChange` routes. A request route may materialize a Page-demanded Controller owned by an
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
AbortSignal
```

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

Mutation pending state is target-scoped and is not Table query loading. A pending cell mutation may set
loading or disabled presentation only on that cell editor; it must not clear the resolved rows, render a
Table loading Skeleton, or block unrelated cells and rows. Row, action, move, and drop mutations follow
the same target-scoped principle.

Foreground query loading is rendered by `PhiTableControl` as Skeleton cells across every visible Table
column, including the actions column, while retaining the configured headers, sizing, and a representative
row count. Tables never replace their body with an Alert, Typography loading label, Ant Design Spin, or a
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
must require confirmation and its Widget action must use danger presentation. Icon and icon-label
display require a resolvable icon; a missing icon is a contract error rather than a blank action.
Dynamic confirmation
values come from declared serializable Binding/action context and are inserted with the central
translation formatter after the current UI-language template has been resolved. Complete rows and
untranslated string concatenation are forbidden.

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
action/activate:json<table-action-request>
```

The closed generic Table output capabilities are:

```text
query/change:json<table-query>
bindingParams/change:json<table-binding-params>
selection/change:json<table-selection>
action/activate:json<table-action>
state/change:json<table-state>
columns/change:json<table-column-order>
expansion/change:json<table-expansion>
```

All JSON capabilities use centralized namespaced value schemas and strict readers. Table state signals
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
- a **Tree Widget** represents hierarchy without tabular columns and requires its own generic Widget
  contract before use.

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

Native Markdown tables render their parsed rows through `PhiTableControl`; they do not introduce a
second visual Table implementation.

A reusable Provider-backed Table embedded in Markdown uses a closed Phi embed descriptor containing a
validated Provider/resource reference plus approved presentation data. Markdown must not execute
arbitrary Provider keys, URLs, callbacks, React components, or module code. The embed is resolved through
the same active Module registry, access checks, Provider contract, and Table renderer as a normal
`PhiTableWidget`.

## Module and preset obligations

- Modules expose domain data through Table Provider descriptors and scoped executable Clients.
- Presets place the generic Table Widget and persist only presentation, source binding, and signal routes.
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
- Missing Provider, resource, capability, field, action, or signal compatibility is a visible contract
  error. No direct-fetch, local business-mutation, duplicated Form, or legacy Widget fallback is permitted.

## Current migration boundary

The generic runtime now follows the documented `PhiTableWidget -> PhiTableBinding -> PhiTableControl`
path. The Binding owns Provider and editor-option resolution, normalized query/loading/error state,
accepted/rejected mutation reconciliation, optimistic field/row edits, and identity-based row movement.
The provider-free Control renders typed cell/row editors and accessible drag/move interactions. Columns
select required Provider `fieldKey` values and use presentation-only renderers; the former `valuePath`,
`valueType`, and cell-action column ABI is removed.

Admin Locales, Admin Logs, Admin Users, Editor Translations, Builder Revisions, Builder Signal Wiring,
Navigation Drafts, editable Effects, and editable Static Options use the same Provider/Binding path.
Immutable signal-capability metadata, read-only Brand preview data, and native Markdown tables may use
provider-free `PhiTableControl` only while they satisfy the strict immutable static-row exception above.
The contract audit rejects direct Ant Design Table imports outside `PhiTableControl`, domain Table Widget
aliases, Provider-identity branches in generic Table hosts, and mutable domain hosts that call
`PhiTableControl` without `PhiTableBinding` unless they are the explicit controlled compound-value Form
field adapter defined above.

Core provides immutable static-resource querying plus a versioned static Provider factory. Live clients
resolve Published snapshots; Authoring clients resolve and mutate only Working Draft snapshots through an
injected owner store. The generic Authoring resource editor composes the canonical Table path and remains
Provider-neutral. A concrete Module/Add-on supplies persistence and optimistic concurrency; Core never
invents an endpoint or stores Draft rows in Widget config.

Native Markdown tables use `PhiTableControl`. Provider-backed Markdown embeds remain unavailable until a
concrete embed parser supplies the closed descriptor documented above early enough for normal active-module
demand resolution. Arbitrary JSON/code-fence Provider discovery is intentionally rejected rather than kept as
a compatibility or late-loading path.

## Contract governance

Changing, extending, replacing, reinterpreting, or widening this contract requires explicit prior
operator approval after the exact gap and affected ABI have been presented. This contract must not be
bypassed through a parallel, shadow, local, Module-specific, Provider-specific, fallback, or compatibility
contract. If it cannot express a requirement, implementation stops and asks the operator first.
