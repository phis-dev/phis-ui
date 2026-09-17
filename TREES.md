# Tree Contract

This document is normative for every provider-backed hierarchical Tree rendered by Phi. Trees share the
Collection Header, action presentation, and condition contracts with Tables; those are defined once in
[TABLES.md](./TABLES.md) and only Tree-specific differences are stated here. The generic signal contract
is in [SIGNALS.md](./SIGNALS.md).

## Ownership

The single runtime path is:

```text
PhiTreeWidget -> PhiTreeBinding -> PhiTreeControl -> Ant Design Tree/shared Phi Controls
```

- `PhiTreeControl` is provider-free presentation. It renders resolved nodes, selection, checking,
  expansion, inline Core editors, actions, loading, and optional Ant Design Tree drag handles.
- `PhiTreeBinding` resolves one active `kind: "tree"` Provider resource and owns query, loading,
  optimistic field edits, actions, selection, checking, expansion, and mutation reconciliation.
- `PhiTreeWidget` owns persisted presentation, feature placement, the Provider binding, and standard
  signal routes. It never fetches domain data or branches on a Provider key.
- the Tree Provider owns node identity, parent identity, semantic fields, query behavior, validation,
  action capabilities, authorization, external drag payload identity, and optional node reordering.
- a Module Controller may coordinate several Widgets or workflows through signals. It is not a second
  Tree Provider and must not proxy Provider reads or mutations.

Domain-named Tree wrappers are forbidden when a Provider plus the generic Tree Widget can express the
feature. Direct Ant Design Tree use is restricted to immutable Core/Inspector metadata that has no
Provider, loading, editing, actions, DnD, persistence, or CMS lifecycle.

The only mutable provider-free exception is a controlled compound value inside `PhiFormControl`. A Form
field provider may render `PhiTreeControl` directly when the complete node collection is one atomic Form
field value. This mode may support local node editing through Phi Controls, add/remove, selection/checking,
collection validation, and local reorder/DnD. It requires stable local node keys and rejects duplicate
keys, missing parents, cycles, and invalid moves before reporting the controlled value change.

The controlled Form-value mode has no Provider/resource identity, query, asynchronous loading, Provider
action, independent persistence, optimistic server mutation, Published/Draft state, or separate Controller
store. Submit, reset, and discard apply to the complete Form record. A Tree with independently addressable
nodes or any Provider lifecycle remains outside the Form and follows
`PhiTreeWidget -> PhiTreeBinding -> PhiTreeControl`. Embedding `PhiTreeWidget` in a Form or wrapping a
Provider resource as one Form value is forbidden.

## Provider resource

A Tree descriptor declares `kind: "tree"`, a namespaced Provider key, and one or more resources. A
resource declares:

```text
resourceKey and title
nodeIdentityPath
parentNodeIdentityPath
titleFieldKey
optional descriptionFieldKey and iconFieldKey
typed field schema
query capabilities
optional binding fields
resource, node, and selection action capabilities
optional node ordering
optional external drag sources and drop targets
```

Provider queries return a flat node list. The generic Binding/Control builds the hierarchy exclusively
from the declared identity and parent paths. Missing identities, duplicate identities, cycles, and
unknown parents are contract errors. Complete Widget presentation config is never sent to a Provider.

Tree fields reuse the Core structured-field semantics and compatible Phi Controls used by Tables:
string, number, boolean, date, datetime, color, icon, enum, enum array, and JSON. `icon` edits use
`PhiIconPickerControl`; text edits use the configured Core input variant and commit on Enter or blur.
The Provider remains authoritative and rejected edits restore the original value.

## Widget configuration

Widget config contains only:

- `source: { providerKey, resourceKey, params? }`;
- presentation: Widget title and description, width constraints, border, striped rows, block-node,
  line/icon visibility, virtualization, and declarative node title/description/icon field presentation;
- features: self-contained or external tools, search, binding fields, selection, checking, expansion,
  editing, actions, and DnD;
- initial query/selection/expansion/check state;
- standard signal routes.

Self-contained tools use the Collection Header defined in
[TABLES.md](./TABLES.md#presentation-and-content-are-separate). Tree-specific: a Binding Control may
declare its token-compatible `width`, and Search takes the remaining header width with a `10rem` minimum.
Actions and their confirmation follow [TABLES.md](./TABLES.md#actions-and-signaling). Widget-level
`presentation.description` is independent of `presentation.node.descriptionFieldKey`.

Inline editing (`features.editing.enabled`) edits the node title field and, when
`presentation.node.iconEditor.enabled` is set, the icon field. A Tree renders no other field editor, so
row options declared on a Tree resource (`rowOptionsPath`) are validated by the catalog but not used.

`presentation.bordered` applies only to the rendered Tree Control. A bordered Tree uses the same global `borderRadiusLG` outer
radius as a bordered Table, clips its background and node presentation to that radius, and uses
`paddingSM` as its inner padding. An unbordered Tree adds no implicit inner padding.
`presentation.row.striped` alternates the currently visible, depth-first node order using the global Ant
Design fill token. Collapsing or expanding a branch recomputes presentation order without changing
Provider nodes or their hierarchy.

Provider and Widget action availability uses the runtime-condition expression defined in
[TABLES.md](./TABLES.md#disabled-conditions); Tree leaves read the current node through `source: "row"` or
one concrete active Controller. `source: "form"` is valid only for a controlled field inside
`PhiFormControl`, never for a provider-backed `PhiTreeWidget`. Unavailable Controller state is fail-closed.

## Selection, checking, and expansion

Selection (`none | single | multiple`) and checking are independent controlled states. Check strictness
is explicit. Expansion is controlled by the Binding; `defaultExpandAll` is resolved once from the first
successful node snapshot. Selection/check/expansion signals carry identities only, never complete nodes.

## Drag and drop

DnD modes are `none`, `source`, `reorder`, or `source-reorder`.

- source mode writes one declared namespaced payload type and Provider-supplied source object identity
  to the shared Phi data-transfer payload; the target interprets it through its own Provider contract;
- reorder mode uses Ant Design Tree's draggable handle and emits an identity-based Provider move with
  parent, before, and after identities;
- the Provider validates cycles, allowed parents, authorization, and canonical ordering;
- the Binding applies an optimistic move and restores it on rejection.

Ant Design event objects, positional strings, and node snapshots are private Control implementation
details and are never persisted or sent as Provider business data.

## Standard signals

Declared in `plugins/runtime-modules/core/widgets/tree/config.ts`. Inputs:

```text
search/change:string
search/clear:none
reload/activate:none
bindingParams/change:json<tree-binding-params>
selection/change:string[]
checking/change:string[]
expansion/change:string[]
action/activate:json<tree-action>
```

Outputs, by capability id (the channel is chosen by each route):

```text
selectionChange      change:string[]
checkingChange       change:string[]
expansionChange      change:string[]
actionActivate       activate:json<tree-action>
bindingParamsChange  change:json<tree-binding-params>
stateChange          change:json<tree-state>
mutationChange       change:json<tree-mutation>
```

A Tree has no condition-state request capability. Controllers may coordinate these states, but direct
Provider transactions remain typed Binding calls rather than a parallel signal transaction path.

