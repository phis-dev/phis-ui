# Forms

This document defines the public form-building-block contract in `@phis/ui`.

## Purpose

- `components/forms/*` contains low-level reusable form building blocks.
- Forms are intended to be reusable by shared widgets, site widgets, and third-party plugin widgets.
- Forms are not CMS widgets.
- Forms are not site-aware orchestration layers.
- All CMS-facing form resolution, fallback, and submit dispatch logic must live in `@phis/ui`.
- Site repositories should expose only thin wrapper routes or pages when they need to hand control to shared form logic.

## Contract Boundaries

- `submit` is its own contract.
  - A Form definition selects a namespaced handler through `submitHandlerKey` or `confirmHandlerKey`.
  - The active module-owned handler Provider, resolved only on the Server, describes where the Form writes.
  - It owns `category`, `transport`, method, canonical target, CSRF metadata, and `credentialPolicy`.
  - It may also expose `previewHandlerKey` and `previewUpstreamPath` for token/bootstrap flows.
- `read` is its own contract.
  - It describes where a form loads preview, guard, lookup, or bootstrap data.
  - It uses the shared `PhiDataSource` contract.
  - It is separate from submit dispatch.
- `translation` is its own contract.
  - It describes how label sets and free text are translated.
  - It uses `tr`, `trBulk`, and the label-set helpers.
  - It is separate from both submit and read.

## Contract

- Public form components must be usable without CMS runtime knowledge.
- Public form components must not fetch site config, theme config, labels, or runtime state on their own.
- Public form components must not choose API endpoints or own site-specific business routing.
- Public form components may own transient orchestration such as submitting, success, error, guard,
  bootstrap, and draft UI state. Field rendering, validation, and placement always come from one
  `PhiFormDescriptor` rendered by `PhiFormControl`.
- Public form components must receive labels, submit handlers, and guard tokens through props.
- Form plugins may follow a server-wrapper/client-inner split:
  - the wrapper collects runtime data and translation keys
  - the wrapper uses `trBulk` with a plugin-defined source locale
  - the client inner renders the actual form UI
- Token-driven bootstrap flows, such as confirm forms, may add a preview/bootstrap phase before the submit phase; that state belongs to the form definition and renderer contract, not to the widget shell
- `PhiFormWidget` always resolves a complete versioned descriptor. An optional code renderer may wrap
  that same descriptor for domain orchestration, but it must not define a second field tree.
- `PhiFormWidget.execution.mode` is a closed choice:
  - `handler` executes the resolved server submit handler and requires `submitHandlerKey`.
  - `signal` keeps the Form local and emits its submitted or reset values through the declared
    `formValues` signal route. It is intended for query/filter/control Forms coordinated by a Module
    controller and must not perform a gateway request.
- A signal-mode Form may omit `submitHandlerKey`. Its standard `submit` input is the apply boundary;
  `reset` restores its initial values and emits them. Descriptors never contain callbacks or controller
  addresses.
- Visible submit, apply, save, reset, cancel, and close actions are never part of `PhiFormDescriptor` or
  `PhiFormWidget`. They are ordinary Phi Button Widgets in a sibling Layout or Overlay Footer Layout and
  communicate with the owning Controller through declared routes.
- Every Form Widget listens to the standard `submit` and `reset` inputs. Submit always calls the mounted
  Ant Design Form instance and therefore runs the normal client validation before handler or signal-mode
  execution. Reset restores the resolved initial record through the same runtime Form lifecycle.
- A Form emits correlated `submitting`, `validationFailed`, `submitSuccess`, `submitError`, `stateChange`,
  and `resetComplete` feedback. `stateChange` contains only `{ dirty, valid }`; complete values remain on
  the existing explicit Form-value capabilities. A Controller closes an Overlay only after the matching
  submit-success signal, never on the original Save click.
- The same external action path applies to inline and Overlay Forms. Forms do not detect Overlay ancestry,
  inject buttons into Layout or Overlay chrome, or expose a second callback submit path. A Form-internal
  Button is permitted only as a field-local command Control; it cannot submit, reset, close an Overlay, or
  execute an independent business transaction.
- `formKind` and hybrid/rendered fallback modes are not part of the v1 ABI. The complete namespaced
  `formId` in the shape `<npm-package>/forms/<form-key>` is the only Form identity.
- Shared remote data loading should use the same normalized data-source contract as widgets when a form needs bootstrap reads or lookup data.
- Site-side form resolution lives in the gateway layer:
  - `fetchFormRegistry(...)` loads Published DB-backed override revisions
  - `getResolvedFormDefinition({ ..., presetDefinitions })` merges one override with the explicit active
    module preset catalog
  - `listResolvedFormDefinitions({ ..., presetDefinitions })` exposes the merged active catalog for a Site
- Preset Forms are explicit `forms` entries of their owner Runtime Module's server Area contribution.
  The active target-Area module set is the only preset catalog; global registration and import-side-effect
  discovery are forbidden.
- A Form's `ownerModuleId` records lifecycle ownership but does not form a second identity with `formId`.
- The DB stores Published Site overrides for an active module-owned preset. Runtime resolution never exposes
  Working Draft rows. Status `0` is reserved for one future Working Draft, `1` is Published, and `2` archives
  an older Published revision, so later Draft APIs require no table change.
- `submitHandlerKey` is the logical handler name for a handler-mode Form. Execution metadata does not live
  in the visual Form descriptor or editable Site config; it comes from the selected active module-owned
  `PhiFormHandlerProviderDescriptor`.
- Forms with a confirm or token preview step may expose `previewHandlerKey` and `previewUpstreamPath` in their form definition; this is still part of the form contract, not a separate widget contract.
- submit dispatch happens through a site-local dispatcher contract:
  - the browser never calls `phi-server` directly
  - the Browser request contains only `formId`, the closed handler phase (`submit` or `confirm`), and values
  - the Site dispatcher resolves the Published Form from the active target-Area module catalog, then resolves
    its handler key to the immutable active module-owned handler Provider
  - the Server constructs `category`, `transport`, method, canonical `upstreamPath` or `endpointKey`, CSRF
    metadata, and credential handling; Client-carried copies are never execution authority
  - `previewHandlerKey` and `previewUpstreamPath` are optional and only used when the form has a preview/bootstrap phase
  - the dispatcher then selects a concrete category target such as `phi-server:/api/auth/route.ts` or `site:/api/site/forms/route.ts`
  - it rejects inactive owners, unknown Forms, missing Providers, owner mismatches, and any Client attempt
    to select or override execution metadata
- Every handler Provider declares one mandatory closed `credentialPolicy`:
  - `none` strips all Browser cookies
  - `site-session` forwards only the canonical `phis_session`
  - `auth-link` forwards only `phis_auth_link` and is reserved for the closed Core link workflow
- `none` is for anonymous Site-scoped handlers such as login, registration, password reset, or a public
  contact Form. It does not bypass the Site gateway: trusted Site identity/internal headers, CSRF where
  declared, server validation, abuse controls, and endpoint policy still apply. `site-session` merely
  makes an existing user identity available; the endpoint decides whether it is required and which roles
  are sufficient.
- Arbitrary cookie names and credential requests in Form definitions, Site overrides, Widget config,
  signals, or request payloads are forbidden. A new mode is a contract extension requiring operator
  approval. Third-party Modules may use `none` or `site-session`; they cannot claim Core-only credentials.
- Credential forwarding establishes identity only. The destination Site or Add-on handler must always
  revalidate values and enforce internal-token, Site, session, enabled membership, role/access policy,
  rate-limit, and domain authorization. Presentation and client validation never authorize a mutation.
- The shared resolver primitive is `resolvePhiFormDefinition({ presetDefinition, overrideDefinition })`.
- Resolver output should carry the resolved source, the effective definition, and a render target key.
- When both preset and override exist, the override wins, while config objects are merged.
- Module-owned handler Providers express immutable upstream target and CSRF details. Editable Form config
  may select a registered handler key but cannot change that Provider's target or security policy.
- Forms that need remote bootstrap data should describe that fetch through the shared data-source contract instead of adding ad hoc request logic in the renderer.
- Label loading stays on the translation contract and must not be folded into `PhiDataSource`.
- Public form styling must use Ant Design components and theme tokens by default.
- Bespoke colors or visual tuning belong only behind explicit operator request.

## Controller contract

Runtime forms, form authoring, and Builder inspector forms must stay separate.

- Runtime form execution uses the generic multi-instance controller address `controller:@phis/ui/form:<instance-key>`.
  - It owns values, field changes, validity, touched, dirty, submitting, submit, confirm, reset, clear, result, and error signaling for an executed form instance.
  - It executes resolved form definitions through the submit, preview, guard, and descriptor contracts.
  - Third-party forms may reuse this controller when they follow the same lifecycle.
- Generic Form primitives and orchestration belong to Platform Core and are not persisted in Area
  `runtimeModules`. Concrete multi-instance form controllers are materialized only from CMS trees that use them.
  - Shell-owned form widgets materialize area-scoped form controller instances.
  - Page-owned form widgets materialize page-scoped form controller instances.
  - Form widgets route signals to the materialized controller address, but must not mount the controller directly.
  - A `default` form controller instance is optional convenience only; independent forms must use independent instance keys.
- Handler keys are not part of the controller address.
  - `submitHandlerKey`, `confirmHandlerKey`, and `previewHandlerKey` belong to the Form definition;
    transport, target, CSRF, and credential details belong to the selected server-side handler Provider.
  - Changing a handler must not change a form controller signal address.
- Form definition authoring belongs to a separate Form Builder module whose one controller uses
  `controller:@phis/ui/form-builder:default`.
  - It owns creating and editing form definitions, fields, field ordering, field types, handler selection, validation rules, previews, and definition persistence.
  - It operates on definitions, not on public runtime submissions.
- Builder inspector setting forms belong to the Builder module whose one controller uses
  `controller:@phis/ui/builder:default`.
  - It owns Layout, Widget, Region, and object settings inside the Builder Inspector.
  - Inspector section Widgets and services are internal Builder contributions, not a separately
    selectable module or controller.
  - It must not route CMS node configuration through the public runtime form controller.
- Media inspector flows belong to the Asset controller.
- Third-party packages integrate through registries/providers for form definitions, field types, validation rules, and handlers.
- Options Providers referenced by fields of a placed Form are part of that Form's runtime demand. The
  generic resolver collects them from the active Form descriptor; unused Form descriptors do not load
  their Providers.
  - They add custom modules with one controller only for different lifecycles such as checkout,
    payment, signing, server-state wizards, or configurators.

## Descriptor and provider contract

- `PhiFormDescriptor` is the serializable visual, field, and validation contract. It does not
  carry executable components, route targets, callbacks, CSRF switches, or guard implementations.
- Provider keys use the namespaced `<npm-package>/<provider-key>` form. A module owns each field type,
  validation rule, and handler provider exactly once.
- A runtime module exposes serializable provider metadata through `formProviders.fieldTypes`,
  `formProviders.validationRules`, and `formProviders.handlers`. Catalog construction rejects invalid
  namespaces, owner mismatches, and duplicate keys; the active module resolver exposes only providers
  from the active module set.
- A handler Provider is immutable Server catalog authority for `handlerKey`, phase, category, transport,
  method, canonical target, CSRF metadata, and the closed credential policy. Those execution fields are
  not part of the editable visual Form revision.
- Executable field and validation providers live in an explicitly composed `PhiFormProviderRegistry`.
  There is no global mutable registry, import-side-effect registration, or missing-provider fallback.
- `PhiFormControl` resolves the immutable provider registry from an explicit prop or the
  nearest `PhiFormProviderRegistryProvider`. Platform Core supplies the base registry; a module UI
  provider composes its field and validation providers only around that module's render subtree.
  Global mutable registration and import-side-effect discovery remain forbidden.
- Every persisted descriptor carries `schemaVersion: 1` and is validated at registry, gateway, and
  server persistence boundaries. The DB stores the descriptor as one atomic JSON document; execution,
  endpoint, CSRF, guard, status, and flag metadata stay outside it.
- `labelSetKey` is resolved by `resolvePhiFormLabels`. Code-owned and third-party definitions that use a
  label set must provide its server loader; a missing loader is a contract error. Literal-only forms do
  not require one.
- The Form Builder module is optional, client-only, and Area-mounted at
  `controller:@phis/ui/form-builder:default`. Its current headless lifecycle intentionally has
  no persistence signal capabilities. A visual Form Builder is deferred to P2 and is intentionally not
  inferred from the Runtime Form controller or required for module-owned Preset Forms.
- Confirm and reset-password keep their domain result/bootstrap state, but their editable fields and
  validation use `PhiFormControl`; their visible actions use the same external Controller route as every
  other Form.

The complete third-party authoring guide is in
[PRESET_FORMS_HOWTO.md](./PRESET_FORMS_HOWTO.md).

### Descriptor shape

The descriptor has three independent layers:

- `layout` defines the responsive field grid and the default label/control split.
- `fields` select field and validation providers and may override their own placement.
- `labelSetKey` identifies the namespaced label set used by `kind: "label"` text descriptors.

Field provider selection uses `fieldProviderKey`; the old generic `type` property is not part of the v1
descriptor ABI. Required state is expressed only through the required validation provider and is not
duplicated as a field boolean.

Text is always explicit:

```ts
type PhiFormTextDescriptor =
  | { kind: "literal"; value: string }
  | { kind: "label"; key: string; fallback: string };
```

- Site-authored literal text uses `kind: "literal"`.
- Code-owned presets use a namespaced `labelSetKey` and `kind: "label"` references.
- The server wrapper resolves the label set and passes the resulting string map to the renderer.
- A missing translated key uses its descriptor fallback; it must not trigger a client fetch.
- Field labels, placeholders, descriptions, static option labels, static
  option descriptions, and custom validation messages all use this same text descriptor.
- A field `description` is rendered as an accessible question-mark tooltip next to its label. Persistent
  validation/help output remains owned by validation and must not reuse the description tooltip.

### Responsive layout and placement

Forms use one 24-unit logical grid and the stable Phi breakpoint names `compact`, `medium`, and `wide`.
The Control resolves those modes from its own available inline size, never from the browser viewport.
`compact` ends at the active Ant Design `screenSM` threshold, `medium` ends at `screenLG`, and `wide`
starts at `screenLG`. This makes the same descriptor respond correctly inside a Page, Modal, Drawer,
Inspector, or narrow Layout slot without persisting Ant Design breakpoint property names.

`layout.columns` remains configurable from one through four for every responsive profile, but it declares
the maximum desired column count rather than an unconditional count. Core applies the profile safety
ceilings `compact: 1`, `medium: 2`, and `wide: 4`; the effective count is the lower value. When the
available Form container becomes narrower, the complete Form falls back to the narrower profile so its
column count, field placement, gap, and label/control grid change together. Individual fields and domain
Controls must not implement a second viewport- or media-query-driven Form grid.

Responsive values cascade from the nearest explicitly configured smaller breakpoint. Unspecified
descriptor sections use the complete defaults rather than collapsing all breakpoints to the compact
value.

`layout.gap` uses only the shared Phi spacing names `none`, `xxs`, `xs`, `sm`, `base`, `md`, `lg`, `xl`,
and `xxl`. It controls the row gap and the gap between two or more effective field columns, and follows
the same responsive cascade. A one-column profile has no horizontal gutter, so its label/control grid
keeps the exact same 24-unit inline reference as an external Grid action slot. Its default is `sm` for
compact and `base` for medium and wide. The Control neutralizes implicit `Form.Item` bottom margins so
this gap remains the only field-grid spacing owner. External action spacing belongs to the Layout that
contains those Button Widgets.

The generic Form root is always a CSS Grid. It contains only Form fields; there is no implicit action row.

A Form descriptor has no padding, width, or maximum-width field. `PhiFormWidget` and `PhiFormControl`
fill the available inline size of their slot. Padding and optional readable-width limits belong to the
explicit containing Layout or to generic Widget geometry; a Form must not detect whether it is rendered
inside a Page, Modal, Drawer, or Inspector.

```ts
layout: {
  columns: {
    compact: 1,
    medium: 2,
    wide: 4,
  },
  gap: {
    compact: "sm",
    medium: "base",
    wide: "base",
  },
  labelPlacement: "side",
  labelAlign: "start",
  labelGrid: {
    compact: { span: 24, offset: 0 },
    medium: { span: 8, offset: 0 },
    wide: { span: 6, offset: 0 },
  },
  controlGrid: {
    compact: { span: 24, offset: 0 },
    medium: { span: 16, offset: 0 },
    wide: { span: 18, offset: 0 },
  },
}
```

There are two distinct grids:

- `field.placement.cell` places the complete field in the outer form row. Without an override, its span
  is derived from `layout.columns`: one, two, three, and four columns resolve to spans 24, 12, 8, and 6.
- `field.placement.label` and `field.placement.control` override the inner `Form.Item` split. Without an
  override, `layout.labelGrid` and `layout.controlGrid` apply.

Every grid placement may contain `span`, `offset`, and `order`. `span` is an integer from 1 to 24,
`offset` is an integer from 0 to 23, `order` is an integer, and `span + offset` must not exceed 24.

`labelPlacement: "top"` renders labels above their controls and defaults both to the complete field
width. `labelPlacement: "side"` renders a logical label/control pair. The default side layout is already
responsive: compact uses a wrapped 24/24 pair and therefore displays the label above the input, while
medium uses 8/16 and wide uses 6/18. Side placement is logical, so RTL displays the label on the right.

Placement and alignment are logical:

- `side` means before the control, not physically left.
- `labelAlign: "start" | "end"` maps to Ant Design's logical start/end styles.
- Grid offsets use Ant Design's inline-start implementation.
- The same descriptor therefore renders labels on the left in LTR and on the right in RTL without a
  persisted direction-specific override.

### Fields and validation

Fields and field-local command Controls may declare `visibleWhen` and `disabledWhen`. Both use the shared
recursive runtime-condition expression. A leaf declares `source`, `valuePath`, and one of `truthy`,
`falsy`, `equals`, or `contains`; `equals` and `contains` compare string values. A group declares
`match: "all" | "any"` and one or more nested leaf or group expressions, so mixed expressions such as
`(A OR B) AND C` need no second condition path.

Form conditions may read `source: "form"` from the current values of the same concrete Form instance or
`source: "controller"` from one named active Controller. `source: "row"` remains valid for Table and Tree
conditions but is rejected by Form descriptors. Conditions never query an endpoint, role implementation,
or Module-private store. An unavailable Controller value is a distinct evaluation result: `visibleWhen`
hides the field and `disabledWhen` disables it until the state arrives.

```ts
visibleWhen: {
  match: "any",
  conditions: [
    { source: "form", valuePath: "type", operator: "equals", value: "rotate" },
    {
      match: "all",
      conditions: [
        { source: "form", valuePath: "type", operator: "equals", value: "slide" },
        { source: "form", valuePath: "mode", operator: "equals", value: "in" },
      ],
    },
  ],
}
```

The Form Widget requests that state through an explicit `conditionStateRequest` route and accepts it only
through its configured `conditionStateChange` route. The request route also materializes the referenced
active Controller as a Page-demanded instance; it never activates a Module.

Authorization remains server-owned. Controller condition state controls presentation only, and the Form
handler or Provider must independently reject unauthorized mutations.

Field presentation and validation remain independent provider selections. For example, an URL control may
use the Core URL field provider and URL validation provider, while a plain text control may opt into the
same URL validation. The same applies to email and telephone values.

- Core supplies text, email, password, textarea, checkbox, select, hidden, honeypot, URL, and telephone
  field providers plus a numeric `InputNumber` provider.
- Core supplies required, email, URL, telephone, number, pattern, minimum-length, maximum-length,
  exact-length, and matching-field validation providers. Numeric validation supports minimum, maximum,
  step, precision, and integer-only constraints.
- Provider-specific settings use the provider descriptor's declarative `settingsFields`.
- The persisted form never carries executable validators, regular-expression functions, or React
  components.
- Server handlers remain authoritative and must revalidate submitted values; client providers exist for
  interaction and early feedback, not as a security boundary.

Core validation providers create native Ant Design rules internally in `PhiFormControl`:

- required uses `{ required: true }`
- email, URL, telephone, and number use the matching Ant Design `type`
- string length uses Ant Design `min`, `max`, and `len`; numeric ranges use `min` and `max`, while the
  numeric Provider validates step, precision, and integer-only constraints
- custom patterns compile serializable `source` plus safe `flags` into the runtime `RegExp`
- cross-field and domain rules use provider-owned Ant Design `validator` functions

When a rule has no explicit `message`, Ant Design uses `defaultValidateMessages` from the active
`ConfigProvider` locale. The renderer supplies the resolved plain label through `messageVariables.label`
even when the visible label contains a tooltip element. Standard required, type, range, length, whitespace,
and pattern messages therefore do not need duplicate Phi translations.

An explicit validation message is reserved for domain-specific wording and for rule types not translated by
the installed Ant Design locale. Ant Design 6.5.1 validates `type: "tel"` but its locale bundles do not yet
include `types.tel`; telephone rules must therefore provide a translated Phi message instead of falling back
to English.

### External actions, keyboard, and execution

`PhiFormDescriptor` has no visible action list, action-grid config, or inline/external presentation mode.
The Form exposes correlated standard inputs and lifecycle outputs. Ordinary Phi Button Widgets send
submit/reset/discard commands to the owning Controller, and that Controller targets the concrete Form
address. A successful submit returns the accepted values; validation and execution failure keep the
owning workflow open.

Button labels, icons, placement, pending presentation, confirmation, and access state therefore belong to
the Button Widget and its containing Layout. Raw Ant Design button props are not Form ABI. An internal
field provider may compose a `PhiButtonControl` for a field-local command, but that command cannot be a
Form transaction boundary.

Keyboard behavior is part of `PhiFormControl`, not a browser or Ant Design accident:

- Enter in a single-line field requests the same standard submit lifecycle as an external Save button.
- Enter in textarea and rich-text Controls inserts content. During IME composition it never submits.
- An active popup, Table cell editor, or Tree node editor consumes Enter/Escape before the outer Form.
- Escape first cancels the innermost editor or popup. If unconsumed, it reaches the owning Overlay as an
  explicit discard request; a standalone Form does not invent a close target.
- Header close, mask close, and Escape are business-neutral dismissal requests and never submit a Form.
  Save/Apply remains an explicit Button Widget command routed through the owning Controller.

Handler selection, `category`, `transport`, `method`, endpoint resolution, and CSRF requirements belong
to the resolved execution/submit contract outside `PhiFormDescriptor`. Form authoring must not expose a
visual setting that disables CSRF or replaces those server-resolved execution properties.

Guard/bootstrap reads use the shared `PhiDataSource` contract and are resolved by the server wrapper before
`PhiFormControl` mounts. Guard tokens are supplied as hidden initial values. Honeypots use a
provider whose presentation is `honeypot`; the renderer keeps it focus-inaccessible and visually outside
the layout, while the resolved server handler remains authoritative and rejects a populated honeypot.

### Rendering and authoring

The generic rendering stack is:

```text
PhiFormWidget
└── PhiFormControl
    ├── Ant Design Form/Form.Item and grid adapter internally
    ├── injected Phi field providers
    ├── injected Phi validation providers
    └── Phi*Control field primitives
```

Modules and persisted descriptors depend only on Phi provider keys and descriptor types. Ant Design is an
implementation detail of Platform Core and of the default Phi providers.

Reusable controls keep the same layering outside forms. The presentation-only input family lives under
`components/controls/*`; each Control owns its direct Ant Design primitive and is shared by CMS Widgets,
Form field providers, and Inspector. Placeable Widgets are separate adapters over those Controls and add
CMS config, controlled or local state, options-provider resolution where applicable, runtime signals,
definitions, and Runtime/Preview/Authoring registration. Form providers must forward the controlled
`value`, `checked`, and `onChange` properties injected by `Form.Item` rather than owning a second
field-value state.

A Form composes Controls only. It never mounts a CMS Widget or Layout inside its field tree. Direct Ant
Design `Form`, `Form.Item`, Table, Tree, and field primitives are restricted to their canonical Phi Control
adapters; feature, Module, Widget, and Form-provider code must not import them as an alternate path.

### Compound Table and Tree values

A Form field provider may render `PhiTableControl` or `PhiTreeControl` directly when the entire collection
is one controlled value in the submitted Form record:

```text
PhiFormWidget
└── PhiFormControl
    └── Form field provider
        └── PhiTableControl or PhiTreeControl
```

This is a bounded controlled-value mode, not a hidden Widget, Binding, or Provider resource. It permits:

- local cell/node editing through compatible Phi Controls;
- local add/remove, selection/checking, validation, and local reorder/DnD;
- stable local row/node keys; and
- atomic submit/reset/discard of the complete collection with the surrounding Form record.

The generic controlled Table field config owns only local presentation and value editing:

- `rowIdentityPath` selects the stable local key;
- `columns` declare `key`, optional `fieldPath`, title, sizing, and a normal Phi Table cell `editor`;
- `add: { enabled, label, defaultRow }` appends a cloned local value and allocates its local key;
- optional `add.sourceFields` maps row paths to ordinary sibling Form-field keys, so draft Controls stay
  declarative Form fields while the Table appends their current values; optional `add.resetFields` resets
  only those draft fields after append;
- `remove: { enabled, label }` renders the generic row removal action;
- `reorder`, `bordered`, `striped`, `emptyText`, and `layout` reuse canonical Table Control behavior.

The controlled Table must remain within the Form cell assigned by the normal placement contract. Its
descriptor decides which columns are editable, whether DnD/add/remove are present, which grid spans it
occupies, and whether horizontal overflow scrolls inside the Table viewport. None of those presentation
choices is imposed on every Form Table. Its Form-field heading and self-contained tools use the shared
`PhiCollectionHeaderControl`: strong title plus description `(i)` tooltip, flexible middle Controls, and
one right-aligned compact `PhiToolbarControl`. A Form provider composes these Controls directly and never
embeds the CMS Toolbar Widget. Column sizing follows the canonical Table default of intrinsic `content`
unless the descriptor explicitly selects `fixed` or `fill`.

The adapter reports the complete changed array through the surrounding controlled Form field. A Module
must not create an aggregate domain field provider merely to arrange otherwise standard Form fields or
to hide a controlled Table value.

The Builder Effects workflow is one concrete use case, not an additional generic restriction. It uses
three ordinary Form Widgets in a Stack; its appearance fields, transition fields/Table, and viewport
fields/Table are descriptor content rather than one `PhiEffectsControl` or an `effects` Form-field
provider. Its draft Controls create new rows, only selected non-structural values of existing rows receive
inline editors, its DnD handle and actions stay fixed at the respective edges, and its Table fields occupy
`cell`, `label`, and `control` span `24/24` in every responsive profile. Other Forms may choose different
Table columns, editors, tools, overflow behavior, and grid placements through their descriptors.

It forbids Provider queries, asynchronous resource loading, server pagination, Provider actions,
independent row/node persistence, optimistic server mutations, and an independent Draft lifecycle. A
collection with resource identity or any of those capabilities remains an external `PhiTableWidget` or
`PhiTreeWidget` using its Binding and Provider; it is coordinated with the Form only through explicit
Controller signals. A Widget must never be embedded as a Form field.

When the P2 Form Builder is implemented, it and Inspector editors must use the same
`compact`/`medium`/`wide`, grid, text, field, and validation types:

- choice values use Phi choice/select/segmented controls
- spans and offsets use the Phi numeric control constrained to the 24-unit grid
- inherited defaults remain visible, but only explicit overrides are persisted
- clearing an editor value removes the override and restores inheritance
- edits go through the owning Builder or Form Builder controller and the shared Phi signal bus so draft
  state and Undo/Redo stay coherent

The renderer keeps active input values in Ant Design Form local state. It must not broadcast every
keystroke globally. Cross-widget lifecycle events such as submit, reset, result, and error use the
multi-instance runtime Form controller and its declared Phi signal capabilities. A form needing a
different lifecycle requires a module-owned controller rather than descriptor-local callbacks or channels.

## Shared prop shapes

- `PhiFormControlProps`
  - resolved `descriptor` and provider registry
  - controlled initial/current record and lifecycle callbacks
  - `disabled?: boolean`
  - `readOnly?: boolean`
- `PhiFormGuardProps`
  - `issuedAt: string`
  - `formToken: string`
- `PhiSubmitFormProps<TValues, TLabels>`
  - `labels: TLabels`
  - `onSubmit(values): Promise<void>`
  - plus `disabled` / `readOnly`

## Current public forms

- `RegistrationForm`
- `ContactForm`
- `LoginForm`
- `HoneypotField`

## Contract governance

Changing, extending, replacing, reinterpreting, or widening this contract requires explicit prior
operator approval after the exact gap and affected ABI have been presented. This contract must not be
bypassed through a parallel, shadow, local, Module-specific, Provider-specific, fallback, or compatibility
contract. If it cannot express a requirement, implementation stops and asks the operator first.
