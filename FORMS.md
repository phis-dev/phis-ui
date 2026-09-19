# Forms

A Form is a versioned, Module-owned definition rendered by the one generic Form Widget. The definition
carries a serializable descriptor for fields, validation, and placement; execution metadata lives in a
handler Provider the Site resolves on the Server. This document owns the Form contract. The step-by-step
guide for a Module author is [components/forms/PRESET_FORMS_HOWTO.md](./components/forms/PRESET_FORMS_HOWTO.md).

Signals in general (scopes, addresses, routes, correlation) are defined in [SIGNALS.md](./SIGNALS.md);
this document lists only what Forms emit and accept.

## Registry and identity

- A Form's only identity is its `formId`, `<owner module id>/forms/<form key>`
  (`types/form-id.ts`). The owner Module id already carries the package, so a Form of
  `@acme/support/modules/requests` is `@acme/support/modules/requests/forms/<key>`. First-party
  examples: `@phis/ui/modules/auth/forms/login`, `@phis/ui/modules/public/forms/contact`.
- The form key may have several segments (`@phis/ui/modules/builder/forms/effects/appearance`). Ids are
  normalized to lower case.
- Catalog construction rejects a Form whose id prefix is not exactly its `ownerModuleId`
  (`plugins/runtime-modules/contracts.ts`). Bare ids such as `login`, numeric ids, and
  `pluginKey/typeKey` identities are not Form ids.
- `createPhiFormId(packageOrModuleId, formKey)` from `@phis/ui/forms` composes an id. For `@phis/ui` it
  looks up the owning first-party Module; any other caller passes its own Module id.
- Preset Forms are the `forms` entries of their owner Module's Server contribution
  (`catalogEntry.forms`). The Forms of the Modules active in the target Area are the only catalog; there
  is no global Form registry, mutable registration, or discovery through imports.
- A Site may store a Published override for an active preset in phis-server. Resolution
  (`gateway/form-registry.ts`) is:
  - a preset from the active Module set is required; a stored row without an active preset resolves to
    nothing;
  - if a Published row exists for the same `formId`, it wins; its `ownerModuleId` must equal the
    preset's, otherwise resolution throws;
  - `resolvePhiFormDefinition({ presetDefinition, overrideDefinition })` merges them: the override's
    descriptor replaces the preset's, `defaultConfig` and `config` are deep-merged, and the result
    carries `source` (`shared` or `db`), `definition`, `renderTarget`, and `effectiveConfig`.
- `fetchFormRegistry`, `getResolvedFormDefinition({ ..., formId, presetDefinitions })`, and
  `listResolvedFormDefinitions({ ..., presetDefinitions })` are the Site-side readers; callers pass the
  active Area's preset definitions explicitly.
- Stored rows use status `0` Working Draft, `1` Published, `2` archived Published. Runtime reads only
  Published rows. There is no Draft API yet; the status slot exists so one needs no schema change.

## Definition

A definition is created with `definePhiRuntimeModuleForm(...)` (`components/forms/form-registry.ts`) and
kept in a Server entry. Fields:

| Field | Meaning |
| --- | --- |
| `ownerModuleId` | The Module that owns the Form. |
| `areas` | Non-empty list of Area keys the Form belongs to, each within the Module's `eligibleAreas`. An Area's projection of the contribution keeps only the Forms that name it. |
| `formId` | See above; `descriptor.key` must be identical. |
| `version` | Positive integer. |
| `flags`, `title`, `description`, `category`, `tags` | Catalog metadata. |
| `descriptor` | The `PhiFormDescriptor`, parsed on definition. |
| `submitHandlerKey`, `confirmHandlerKey`, `previewHandlerKey` | Logical handler names such as `auth.login`, or `null`. |
| `defaultConfig`, `config`, `variant` | Placement configuration merged with a Site override. |
| `previewUpstreamPath` | Carried on the definition; the relay does not read it (see [Relay](#relay)). |
| `loadLabels` | Optional Server loader for the descriptor's `labelSetKey`. |
| `loadInitialValues` | Optional Server loader for values the Form needs before it can be filled in. |

- A handler key names behavior, not a Provider key and not a Controller address. Catalog construction
  rejects a Form whose submit, confirm, or preview key has no handler Provider of the same phase owned by
  the same Module.
- A descriptor with a `labelSetKey` requires `loadLabels`; `resolvePhiFormLabels` throws without it.
  Literal-only Forms need no loader.
- A definition has no render callback. Everything a Form shows comes from its descriptor; everything a
  Form does around it (submit, links, success) comes from the Form Widget.
- The active Module set rejects a Form whose field or validation Provider keys are not declared by an
  active Module (`plugins/runtime-modules/resolver.ts`).

## Descriptor

`PhiFormDescriptor` (`types/form-descriptor.ts`) is serializable. It carries no components, callbacks,
route targets, CSRF switches, credential policy, or guard implementation. It is parsed with
`parsePhiFormDescriptor` at definition, gateway, and registry boundaries and stored as one JSON document.

```ts
type PhiFormDescriptor = {
  schemaVersion: 1;
  key: string;                       // equals formId
  labelSetKey?: `${string}/${string}`;
  fields: readonly PhiFormFieldDescriptor[];
  layout?: PhiFormLayoutDescriptor;
  success?: { title: PhiFormTextDescriptor; text?: PhiFormTextDescriptor; reset?: boolean };
  persistDraft?: boolean;
  guard?: boolean;
};
```

- A descriptor with `actions` or `presentation` is rejected. Submit, reset, cancel, and close are not
  part of a descriptor.
- `success` is what the Form shows when a submit is accepted; `reset: true` returns the fields to their
  initial values. Without `success` the Form shows nothing of its own, which is right when a Controller
  closes an Overlay or the page moves on.
- `persistDraft: true` keeps typed values in session storage for the tab, keyed by `descriptor.key`, and
  clears them when a submit is accepted.
- `guard: true` makes the Form carry a guard token; see [Guard](#guard).

### Text

```ts
type PhiFormTextDescriptor =
  | { kind: "literal"; value: string }
  | { kind: "label"; key: string; fallback: string }
  | { kind: "config"; key: string; fallback: string };
```

- `literal` is the text itself. `label` is a key into the Form's label set, resolved on the Server and
  passed to the client as a string map; a missing key uses `fallback` and never triggers a client fetch.
  `config` reads a string from the placed Widget's `formConfig` (for example a terms link that differs per
  placement) and falls back to `fallback`.
- Field labels, control labels, placeholders, descriptions, option labels and descriptions, custom
  validation messages, and success text all use this type.
- A field `description` renders as a tooltip icon beside the label.

### Fields

`PhiFormFieldDescriptor` has `key` (unique within the Form), `fieldProviderKey`, and optional `label`,
`controlLabel`, `description`, `placeholder`, `autoComplete`, `initialValue`, `options`,
`optionsProvider`, `validation`, `visibleWhen`, `disabledWhen`, `placement`, and `config`
(provider-specific settings).

- Required state is the `required` validation rule; there is no `required` boolean on a field.
- Static `options` and an `optionsProvider` follow the options contract of the Controls. A field whose
  options depend on another value declares `optionsProvider.dependencies`.
- Options resolution reads the field's own `config` with the placement's `formConfig` layered over it,
  the placement winning where both name a key. A descriptor is registered once and reads the same on
  every Site; a list that varies by Site is what the placement knows, and it belongs there. Because this
  resolves during the render, a provider fed this way answers in the HTML the Server sends, while one
  that asks a route answers after hydration.
- The Options Providers named anywhere in the descriptor of a placed Form are part of that page's data
  Provider demand (`collectPhiRuntimeDataProviderKeys`); a Form that is not placed loads none.

### Conditions

`visibleWhen` and `disabledWhen` use the shared runtime-condition expression (`types/runtime-condition.ts`).
A leaf names `source`, `valuePath`, and `operator` (`truthy`, `falsy`, `equals`, `contains`, the last two
with a string `value`); a group names `match: "all" | "any"` and nested `conditions`.

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

- A Form descriptor accepts only `source: "form"` (values of the same Form instance) and
  `source: "controller"` with a `controllerAddress` (state of that Controller). Any other source is
  rejected.
- The Form Widget asks for Controller state with its `conditionStateRequest` output and accepts the
  answer on `conditionStateChange`; naming a Controller in a condition adds that Controller to the Widget's
  demanded Controllers. It never activates a Module.
- Until the Controller answers, the condition is unavailable: `visibleWhen` hides and `disabledWhen`
  disables unless the leaf sets `whenUnavailable`.
- Conditions are presentation. The handler still authorizes every mutation.

### Layout and placement

A Form is one CSS grid of 24 tracks. Placements are ranges written like CSS grid lines: `start` is the
first line (1-24) and `end` the line the element stops before (2-25).

```ts
type PhiFormLayoutDescriptor = {
  gap?: { compact?: PhiSpacingToken; medium?: PhiSpacingToken; wide?: PhiSpacingToken };
  labelAlign?: "start" | "end";
  label?: PhiFormResponsiveGridRange;
  control?: PhiFormResponsiveGridRange;
};
type PhiFormFieldPlacementDescriptor = {
  label?: PhiFormResponsiveGridRange;
  control?: PhiFormResponsiveGridRange;
};
```

- The three responsive modes are `compact`, `medium`, and `wide`. They are chosen from the Form's own
  width, never the viewport: `medium` from 360px, `wide` from 768px (`PHI_FORM_RESPONSIVE_MIN_WIDTH`,
  implemented as container queries in `styles/layout.css`). The same descriptor therefore fits a page, an
  Overlay, or a narrow slot.
- A responsive value cascades from the nearest smaller mode that is set; an unset section uses the
  defaults.
- Defaults (`PHI_FORM_DEFAULT_LAYOUT`): gap `sm` / `base` / `base`; `labelAlign: "start"`; label 1-25 in
  `compact` and 1-7 otherwise; control 1-25 in `compact` and 7-25 otherwise.
- A field with no `placement` uses the layout ranges. A field that sets a placement states it for both
  parts.
- When a field's label and control ranges overlap they stack on two rows; otherwise they share one. There
  is no `columns` or `labelPlacement` setting: a two-column Form is fields in 1-13 and 13-25, and a
  stacked Form uses full-width ranges. `components/forms/form-descriptor-contract.ts` exports named
  ranges for the common cases (`PHI_FORM_ROW_START_HALF`, `PHI_FORM_STACKED_LAYOUT`, and others).
- Fields are placed in declaration order; a field goes on the current row while its tracks are free.
- `gap` uses the spacing tokens `none`, `xxs`, `xs`, `sm`, `base`, `md`, `lg`, `xl`, `xxl`. It is the only
  spacing between fields.
- Alignment is logical: in RTL the label stands on the right without a separate setting.
- A descriptor has no padding, width, or maximum width. The Form fills its slot; padding and width limits
  belong to the containing Layout.

### Compound Table and Tree values

A field provider may render `PhiTableControl` or `PhiTreeControl` when the whole collection is one value
in the submitted record (the Core `table` and `tree` field providers). Local editing, add/remove,
selection, and local reordering are allowed; the complete value is submitted and reset with the Form. The
Table field reads `rowIdentityPath`, `columns`, `add` (`enabled`, `label`, `defaultRow`, optional
`sourceFields` and `resetFields` naming sibling fields), and `remove` from its `config`. Provider queries,
server pagination, Provider actions, per-row persistence, and a Draft lifecycle are not available in this
mode; such a collection is a separate Table or Tree Widget coordinated with the Form through signals. The
Table and Tree contracts are [TABLES.md](./TABLES.md) and [TREES.md](./TREES.md).

## Field and validation Providers

- Field, validation, and handler Provider keys are namespaced. First-party keys are
  `@phis/ui/modules/<module>/form-field/<key>`, `.../form-validation/<key>`, and `.../form-handler/<key>`,
  created by `createPhiSharedFormProviderKey` (for example `@phis/ui/modules/core/form-field/email`).
  Another package uses its own Module id in the same shape.
- A Module declares serializable descriptors in its definition as `formProviders.fieldTypes`,
  `formProviders.validationRules`, and `formProviders.handlers`. Catalog construction rejects keys
  without a namespace, a descriptor whose `ownerModuleId` differs from the declaring Module, and a key
  owned twice.
- A field type descriptor declares `valueType` (`string`, `number`, `boolean`, `string[]`, `json`),
  `presentation` (`control`, `hidden`, `honeypot`), and optional `settingsFields`. A validation descriptor
  declares optional `settingsFields`.
- Executable providers live in a `PhiFormProviderRegistry` created with `createPhiFormProviderRegistry`
  and combined with `extendPhiFormProviderRegistry`. `PhiFormControl` reads the registry from its prop or
  the nearest `PhiFormProviderRegistryProvider`; Core supplies the base registry, and a Module adds its
  own providers through its lazy UI provider (`catalogEntry.loadUiProvider`), which wraps only that
  Module's render subtree. There is no global registry and no registration through imports.
- A field provider renders Phi Controls and forwards the controlled `value`/`checked` and `onChange` it is
  given; it never keeps a second value state and never renders a Widget or Layout.
- Core field providers: `text`, `email`, `password`, `textarea`, `hidden`, `honeypot`, `checkbox`,
  `select`, `url`, `tel`, `number`, `slider`, `multi-select`, `checkbox-group`, `datetime`, `switch`,
  `segmented`, `cascader`, `table`, `tree`.
- Core validation providers: `required`, `email`, `min-length`, `max-length`, `exact-length`,
  `min-letters`, `matches-field`, `url`, `tel`, `pattern`, `number`. They build Ant Design rules inside
  `PhiFormControl`. `pattern` takes `source` (at most 512 characters) and `flags` from `i`, `m`, `s`, `u`.
  `number` takes `min`, `max`, `step`, `precision`, and `integer`.
- A rule without `message` uses the active Ant Design locale's validation messages, with the field label
  passed as `label`. `tel` and `matches-field` require an explicit message, because the Ant Design
  locales have none for them.
- A `honeypot` field is moved off screen and hidden from assistive technology; the handler rejects a
  filled honeypot.
- Client validation is interaction feedback, never a security boundary.

## Handler Providers

A handler Provider is immutable Server catalog data for one handler phase
(`PhiFormHandlerProviderDescriptor`):

```ts
type PhiFormHandlerProviderDescriptor = {
  key: PhiFormProviderKey;
  ownerModuleId: PhiRuntimeModuleId;
  title: string;
  description?: string;
  phase: "submit" | "confirm" | "preview";
  handlerKey: string;
  category: "auth" | "account" | "forms" | "site";
  transport: "relay" | "api" | "serverAction";
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  endpointKey: string | null;
  upstreamPath: string | null;
  csrfPath: string | null;
  requiresCsrf: boolean;
  credentialPolicy: "none" | "site-session" | "auth-link";
};
```

- Every field is required. A Form definition and its Provider match on `phase` and `handlerKey`; the
  Provider `key` is catalog identity only and is never stored in a Form.
- Catalog construction requires a non-empty `handlerKey`; at least one of `endpointKey` and
  `upstreamPath`; an `upstreamPath` and `csrfPath` starting with `/`; and a `csrfPath` when
  `requiresCsrf` is set.
- The target is `upstreamPath` on phis-server when it is set; otherwise the category prefix
  (`/api/auth`, `/api/account`, `/api/forms`, `/api/site/forms`) followed by `endpointKey`
  (`gateway/form-submit.ts`).
- `credentialPolicy` is closed:
  - `none` sends no Browser cookie. The request still carries the Site's trusted identity and internal
    token; CSRF, validation, and abuse controls still apply. It is for anonymous handlers such as login,
    registration, password reset, and contact.
  - `site-session` forwards only `phis_session`. The handler decides whether a session and which access
    are required.
  - `auth-link` forwards only `phis_auth_link`. Only `@phis/ui/modules/auth` may declare it; catalog
    construction rejects it elsewhere.
- Target, method, CSRF, and credential fields never appear in a descriptor, Form config, Site override,
  Widget config, signal, or request payload. Forwarding a credential identifies the caller; the handler
  still revalidates values and enforces Site, session, role, rate limit, and domain authorization.
- A new credential mode or category is a contract change.

## Form Widget

The Form Widget (`@phis/ui/modules/core/widgets/form`, `plugins/runtime-modules/core/widgets/form/`) is
the only way a Form is placed. There are no domain Form Widgets. Its config:

| Field | Meaning |
| --- | --- |
| `formId` | The Form to render. |
| `submit` | `{ label, align }` or absent. A submit button drawn by the Widget in the control column; `align` is `start` (default), `center`, or `end`. |
| `feedback` | `{ mode, successText? }` or absent. Absent answers in place. `mode` is `message` (a transient message) or `notification`; `successText` is what a success says where the descriptor's `success` says nothing. Set, it moves the answer out of the Form rather than adding one. |
| `links` | `[{ key, href, requiresFeature? }]`, drawn below the submit. The text is `actions.<key>Label` of the Form's label set; a link whose `requiresFeature` is not published by an active Module is left out. |
| `formConfig` | Placement config: `initialValues`, `initialValuesFromQuery`, values read by `config` text, and values an `optionsProvider` reads (see [Fields](#fields)). |
| `execution` | `{ mode: "handler" \| "signal", phase: "submit" \| "confirm" }`, default `handler` / `submit`. |
| `source` | Optional Table Provider binding `{ providerKey, resourceKey, params }` whose resource declares `recordRead: true`. |
| `openActionKey` | The Table action key that opens a record, default `edit`. |
| `signalRoutes` | The Widget's routes. |

- The Widget resolves the definition on the Server, loads labels and `loadInitialValues`, wraps the body
  in the owner Module's UI provider, and renders `PhiFormControl` in a client host.
- `handler` mode submits through the Form controller and the [Relay](#relay). `signal` mode keeps the
  Form local: a valid submit emits `submitValues` with `{ values }` and `submitSuccess`, and calls no
  gateway. A signal-mode Form may have no `submitHandlerKey`.
- The Widget-drawn submit is a second sender on the same submit path, not another path. Buttons outside
  the Form (a sibling Layout, an Overlay footer, a toolbar) reach the Widget through its `submit` and
  `reset` inputs. A Form-internal Button is only a field-local command and cannot submit, reset, or close.
  A Form does not detect whether it stands in an Overlay and adds nothing to Layout or Overlay chrome.
- Every Form is bound to a Form Controller, and that Controller answers a command by sending it on to the
  Form it belongs to -- same channel, same action, addressed to the Widget. The binding applies those
  answers; the Widget's route inputs are for what a Preset wired, so what arrives from the Form's own
  Controller is never read as one. Reading it as one makes a loop with no end: the `reset` input tells
  the Controller, the Controller sends the reset back, the input fires again. It blocked the main thread
  on the Admin Users Page -- Cancel froze the Overlay and the edit Form never left its skeleton.
- Initial values layer from weakest to strongest: field `initialValue`, `formConfig.initialValues`,
  `formConfig.initialValuesFromQuery` (maps a field key to a query parameter), and the definition's
  `loadInitialValues`. A record read through `source` replaces the configured values. With `source` and an `openActionKey`, a Table action with a row identity
  arriving on `recordOpen` loads that record; without `openActionKey` the record is read once on mount.
  After a successful handler submit the last opened record is read again.
- A flow is composed, not branched: a stage that asks different questions is another Form. A node's
  `visibleWhen` in the page tree decides whether it is shown, and the Form Preview Widget
  (`@phis/ui/modules/core/widgets/form-preview`) reads what a link token is about through the relay and
  reports `{ status, ok }` as condition state for neighbouring nodes to condition on.
- Where it says what happened is a question about the placement, not about the Form. In place is the
  default: an error above the fields, and the descriptor's `success` panel where it has one. That is
  enough on a Page somebody opened in order to submit it. A Settings panel is not that case -- it may be
  collapsed, it is one of several, and a panel that saves on change has no success panel at all -- so
  the Settings shell gives every Form section `feedback`, and the Widget reports the outcome to the Site
  Core Runtime Controller instead ([SIGNALS.md](./SIGNALS.md)). Naming a place chooses it: a Form with
  `feedback` draws neither the error nor the success panel in place, because two answers to one submit
  read as two things having happened. A success says the descriptor's own wording where it has some,
  otherwise the placement's `successText`; a failure says what the answer said, which is the only
  wording that exists for it. Field validation is unaffected -- it answers a field, not a submit.
- A Form never navigates. A Controller that reads `submitSuccess` and knows where the visitor goes next
  asks the Site Core Runtime Controller on `path`/`activate` (see [SIGNALS.md](./SIGNALS.md)).

Inputs (`runtimeSignals.listens`):

| Capability | Channel / action | Value |
| --- | --- | --- |
| `submit` | `submit/activate` | `none`; ignored while the values in the form are ones validation has already refused (see below) |
| `reset` | `reset/activate` | `none` |
| `recordOpen` | `action/activate` | `json`, `table-action` schema |
| `close` | `dialog/close` | `none`; resets the Form and emits `cancel` |
| `reload` | `reload/activate` | `none`; reloads the open record |
| `conditionStateChange` | `condition/change` | `json`, `runtime-condition-state` schema |

- A `submit` signal is dropped while the form holds values validation has already refused and nothing has
  moved since. It is the same submit arriving twice, not a second one: validation writes its errors onto
  the fields, Ant Design reports that as a field change, `stateChange` says so, and a placement that
  reads `stateChange` as "save this" -- which is what `submitOnChange` does -- asks again, as fast as the
  browser allows. The block lifts on the next value change. A person pressing the Form's own Save is
  never blocked: they are asking to see the reason again.

Outputs (`runtimeSignals.emits`):

| Capability | Action | Value |
| --- | --- | --- |
| `submitSuccess` | `activate` | `json` `form-result`: `{ ok, status?, payload }`; `status` is absent in signal mode |
| `submitting` | `change` | `boolean` |
| `submitError` | `change` | `json` `form-error` |
| `validationFailed` | `change` | `json` `form-validity` |
| `resetComplete` | `activate` | `none` |
| `stateChange` | `change` | `json` `form-state`: `{ dirty, valid }` |
| `submitValues` | `change` | `json` `form-values` |
| `resetValues` | `activate` | `json` `form-values` |
| `command` | `activate` | `string` |
| `cancel` | `close` | `none` |
| `conditionStateRequest` | `reload` | `none` |

Submit runs client validation first. All feedback of one submit or reset keeps the correlation id of the
signal that started it. A Controller closes an Overlay on the correlated `submitSuccess`, never on the
Save click.

## Form controller

Handler-mode execution runs in the Core Form controller, a demand-materialized multi-instance Controller
(`components/forms/runtime-form-controller-*.ts`):

- Address: `controller:@phis/ui/modules/core/controller/form:<instance key>`. The Form Widget demands one
  instance per Widget with the key `widget-<widget instance id>`
  (`createPhiRuntimeFormWidgetInstanceKey`).
- It is materialized from the tree that contains the Widget: `area` for an Area preset tree, `page` for a
  Page tree. A preset never adds a Controller node, and a Widget never mounts the Controller itself.
- Handler keys are not part of the address; changing a handler does not change any wiring.
- The external signal surface of a placed Form is the Widget address `cms:<widget instance id>`, not the
  Controller.

Controller inputs: `values/change` (`form-values`), `field/change` (`form-field`), `validity/change`
(`form-validity`), `touched/change` (`form-touched`), `dirty/change` (boolean), `submit/activate` and
`confirm/activate` (`form-submit`), `reset/activate`, `clear/clear`. Controller outputs: `values`,
`field`, `validity`, `touched` (`change`, json), `dirty` and `submitting` (`change`, boolean), `result`
(`change`, `form-result`), `error` (`change`, `form-error`), `reset` (`activate`), `clear` (`clear`). On
`submit` or `confirm` it posts to the relay and answers the sender with `submitting`, then `result` or
`error`, under the incoming correlation id.

A Module adds its own Controller only for a different lifecycle (checkout, payment, a server-side
wizard), not to run an ordinary Form.

Other Form-shaped surfaces are separate Controllers:

- Builder Inspector settings (Layout, Widget, Region fields and signal-route tables) belong to the
  Builder Controller (`controller:@phis/ui/modules/builder/controller/default:default`), not to a Form
  controller. A Builder Form placed through the Form Widget, such as page meta, is an ordinary Form.
- The Form Builder Module (`@phis/ui/modules/form-builder`) mounts one Area Controller at
  `controller:@phis/ui/modules/form-builder/controller/default:default`. It declares no signal
  capabilities; a visual Form Builder is not built.

## Guard

- A descriptor with `guard: true` is accepted by its handler only with a guard token, `issuedAt` and
  `formToken`, signed by phis-server.
- The token is never rendered into the page, so a page with a guarded Form is the same for every visitor
  and can be served from the static Public render ([STATIC_RENDERING.md](./STATIC_RENDERING.md)).
- The browser asks for it when the Form mounts: `requestPhiFormGuard(formId)`
  (`components/forms/form-guard-client.ts`) calls `GET /api/site/forms?phase=guard&formId=<id>`. If the
  token has not arrived by submit, the submit waits for it. The values are added to the submitted record,
  not kept in fields, so a reset cannot clear them.
- The relay issues a token only for a Form whose submit handler is active in the Area of the requesting
  page, and forwards no cookie to phis-server's `/api/v1/forms/guard`. A refusal is a wiring fault.

## Relay

The browser never calls phis-server for a Form. `/api/site/forms` is answered by the Site's own
`/api/site` door rather than proxied: `buildPhiSiteProxyHandlers` recognises the path and builds
`buildPhiSiteFormRouteHandlers` (`gateway/site-form-route.ts`) on first use. A Site mounts no route of its
own for it, because a Site's route files are written at installation and belong to it from then on, while
`@phis/ui` arrives through the dependency.

The relay's options are `upstreamBaseUrl`, `buildHeaders`, `timeoutMs`, optional `logLabel` and
`missingBaseUrlMessage`, and `loadAreaBridge(area)`, the Site's Bridge loader, whose
`runtimeModuleCatalog` is the catalog of that one Area.

Requests:

- `POST /api/site/forms` with `{ formId, phase: "submit" | "confirm", values }`. Nothing else in the
  body is read.
- `GET /api/site/forms?phase=guard&formId=<id>` issues a guard token.
- `GET /api/site/forms?phase=preview&formId=<id>&token=<token>` reads a preview through the Form's
  `preview` handler Provider.

Resolution for every request (`gateway/form-handler-resolution.ts`):

1. The Area comes from the `Referer`, which must be on the request host (compared with the forwarded and
   `host` headers). A special Area is the first path segment; anything else is Public. A client-supplied
   Area, endpoint, or Module id is never read.
2. The Area's effective tree is the persisted Area revision, or the code-owned shell preset when none is
   persisted. Its `runtimeModules`, the Area's locked base Module, and the server capability snapshot give
   the active Module set.
3. The Form resolves from that set as in [Registry and identity](#registry-and-identity). Its owner must
   be active.
4. The handler key for the phase selects the Provider with the same `phase` and `handlerKey`; its owner
   must be active.

Any failure answers `404` with "Form handler is not active for this Area.".

Dispatch for `submit` and `confirm`: the relay builds the target from the Provider, removes the browser
`Cookie` header, adds only the cookie `credentialPolicy` allows, and, when `requiresCsrf` is set, first
reads a token from `csrfPath` and sends it as `x-csrf-token` plus `phis_csrf`. It sends `values` as JSON
with the Provider's method and returns phis-server's status, body, and `Set-Cookie` headers.

Where a handler lives: a Module with an Add-on counterpart implements it in its Add-on; a Core handler is
in phis-server. Catalog metadata alone persists nothing: without the endpoint a Form renders and validates
but cannot submit.

## Rendering boundaries

```text
PhiFormWidget
└── PhiFormControl
    ├── Ant Design Form and Form.Item (inside the Control only)
    ├── field providers from the scoped registry
    ├── validation providers from the scoped registry
    └── Phi*Control field primitives
```

- Every Form renders through `PhiFormControl`. Direct Ant Design `Form`, `Form.Item`, Table, Tree, and
  field primitives are imported only inside their Phi Control adapters, never in Module, Widget, or field
  provider code.
- Active input values stay in the Form's local state; keystrokes are not broadcast. Cross-Widget
  lifecycle goes through the signals above.
- Enter in a single-line field submits through the same path as a submit input. It does not submit in a
  multi-line or content-editable field, during IME composition, or inside a scope that handles the key
  itself (grid, tree, open select or picker dropdown, or an element marked
  `data-phi-form-keyboard-scope`).
- `@phis/ui/forms` exports the definition helpers, descriptor helpers, provider keys and registries,
  `PhiFormControl`, the first-party descriptors (`PHI_LOGIN_FORM_DESCRIPTOR`,
  `PHI_CONTACT_FORM_DESCRIPTOR`, and others), `PHI_SHARED_FORM_IDS`, the Form controller definition and
  client, the registry readers, and the prop types `PhiFormGuardProps`, `PhiSubmitFormProps`, and
  `PhiFormAvailabilityProps`. There are no standalone Form components such as a login or contact form.
