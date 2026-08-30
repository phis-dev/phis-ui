# Tree Contract (target v1)

This document is normative for every provider-backed hierarchical Tree rendered by Phi.

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

Self-contained tools follow the exact Collection Header contract in `TABLES.md`: optional strong title
plus description `(i)` tooltip on the left, binding fields/search in the flexible middle zone, and one
right-aligned compact Toolbar. Without a title, query Controls begin at the left edge. Built-in toolbar
order is Add, configured resource/selection actions, Reset, Reload. All Controls default to `small`.
Binding Controls may omit `label` when the surrounding context already names the value; omission removes
the label region rather than rendering an empty placeholder. Icon-only built-in tools expose their
localized description as a tooltip. A Binding Control may declare its token-compatible `width`; Search
uses the remaining Collection Header width with a `10rem` minimum and wraps only when that minimum no
longer fits beside the preceding Controls.
Actions select declared Provider capabilities but Widget config owns label, icon, display, mode,
confirmation text, placement, and order within the configured action segment.

Widget-level `presentation.title` and `presentation.description` use the shared Collection Header;
description is a tooltip beside a present title and is independent of
`presentation.node.descriptionFieldKey`. In external tools mode, title and tooltip may remain without
the integrated query/toolbar zones.
`presentation.bordered` applies only to the rendered Tree Control and never wraps the Widget header,
tools, diagnostics, or an external host. A bordered Tree uses the same global `borderRadiusLG` outer
radius as a bordered Table, clips its background and node presentation to that radius, and uses
`paddingSM` as its inner padding. An unbordered Tree adds no implicit inner padding.
`presentation.row.striped` alternates the currently visible, depth-first node order using the global Ant
Design fill token. Collapsing or expanding a branch recomputes presentation order without changing
Provider nodes or their hierarchy.

Provider and Widget action availability uses the same recursive runtime-condition expression as Tables
and Forms. Groups use `match: "all" | "any"`; Tree leaves may read the current node through `source:
"row"` or one concrete active Controller. `source: "form"` is valid only for a controlled field inside
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

The generic Tree capabilities are:

```text
search/change:string
search/clear:none
reload/activate:none
bindingParams/change:json
selection/change:string[]
checking/change:string[]
expansion/change:string[]
action/activate:json
state/change:json
mutation/change:json
```

All JSON values use centralized namespaced schemas. Controllers may coordinate these states, but direct
Provider transactions remain typed Binding calls rather than a parallel signal transaction path.

## Contract governance

Changing, extending, replacing, reinterpreting, or widening this contract requires explicit prior
operator approval after the exact gap and affected ABI have been presented. This contract must not be
bypassed through a parallel, shadow, local, Module-specific, Provider-specific, fallback, or compatibility
contract. If it cannot express a requirement, implementation stops and asks the operator first.
