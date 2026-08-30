# Preset Forms How-to

This guide defines how a first-party or third-party Runtime Module contributes a ready-built Form to
`@phis/ui`. Preset Forms are package-owned runtime artifacts. They do not require the optional
visual Form Builder.

Following this guide produces one functional Form that:

- is discoverable only while its owner Runtime Module is active in the target Area;
- renders through the one generic `@phis/ui/widgets/form` Widget;
- validates through `PhiFormControl` and the canonical Phi field Controls;
- either submits through the Core Form controller and Site gateway or emits validated values to a
  domain Controller; and
- can be replaced by a Published Site override without changing its `formId` or CMS placement.

Changing, extending, replacing, reinterpreting, or widening the Preset Form contract requires explicit
prior operator approval after the exact gap and affected ABI have been presented. A Module must not bypass
it through a local, parallel, shadow, Provider-specific, fallback, or compatibility contract; if the
contract cannot express a requirement, implementation stops and asks the operator first.

For package layout, Module, Controller, manifest, and consuming-Site composition around the Form, start
with [THIRD_PARTY_MODULES.md](../../THIRD_PARTY_MODULES.md).

## Terminology: there is no single Form Provider

These similarly named objects have separate responsibilities:

| Object | Responsibility | Executable? |
| --- | --- | --- |
| Form definition | Versioned package preset selected by `formId`; carries descriptor and execution metadata. | Server callbacks for labels or an optional wrapper only. |
| `PhiFormDescriptor` | Serializable fields, labels, conditions, validation, and responsive grid. | No. |
| Field provider | Maps a `fieldProviderKey` to a controlled `Phi*Control`. | Yes, in the scoped UI registry. |
| Validation provider | Maps a validation key to the canonical client validation rule. | Yes, in the scoped UI registry. |
| Handler provider descriptor | Declares that a named submit, confirm, or preview handler is available to the active module set. | Metadata only. |
| Options Provider | Supplies options for select-like fields. | Yes, through normal runtime data-provider demand. |
| Record Data Provider | Optionally loads initial values for an edit Form with `recordRead: true`. | Yes, through the normal Table Provider contract. |
| Core Form controller | Coordinates runtime state and handler-mode gateway execution for one mounted Form instance. | Yes, demand-materialized. |

`PhiFormProviderRegistryProvider` is therefore only the scoped React registry for executable field and
validation implementations. It is not the source of Form definitions, records, options, server handlers,
or controller state. Form definitions come from `catalogEntry.forms`; Site overrides come from the Form
definition store.

## Minimal package layout

Names may vary, but keep server metadata, client UI, handler implementation, and CMS presets physically
separate:

```text
src/
├── constants.ts                  # module id, form id, handler keys
├── forms/
│   ├── request-form.server.ts    # descriptor + definePhiRuntimeModuleForm
│   ├── labels.server.ts          # optional label-set loader
│   └── ui-provider.tsx           # optional custom field/validation providers
├── runtime/
│   ├── module-definition.ts      # formProviders metadata
│   ├── area-contribution.server.ts
│   └── controller.tsx            # only when a domain lifecycle is required
├── server/
│   └── request-handler.ts        # site or *-server implementation
└── presets/
    └── request-page.server.ts    # generic Form Widget + external actions
```

Do not put server handlers in the client UI provider, Ant Design components in the descriptor, or a
domain-specific Form Widget beside the generic Form Widget.

## Dependency direction

```text
Server Area contribution
└── Runtime Module catalog entry
    └── forms[]
        └── versioned PhiFormDescriptor
            └── generic CMS Form Widget
                └── PhiFormWidget (server resolution + labels)
                    └── Form Descriptor runtime client
                        └── PhiFormControl
                            └── Ant Design Form and Form.Item
                                └── Form field provider
                                    └── Phi*Control
                                        └── Ant Design primitive
```

The active target Area's Runtime Module set is the only Form catalog. Importing a package must never
register a Form globally or mutate shared process state.

## Area activation and the code-owned fallback

A Form being installed is not the same as its owner Module being active. All of these links must agree:

1. the Module definition lists the target Area in `eligibleAreas`;
2. that Area's Server contribution includes the Form in `catalogEntry.forms` and includes the matching
   phase-specific handler Provider in the same Module definition;
3. the effective Area preset selects the optional owner Module in `runtimeModules` (locked Area base
   modules are derived and must not be listed there); and
4. the Site build manifest contains the Module's Server and applicable Client projections for that Area.

Before a Site has persisted an Area revision, the package-owned shell preset is the effective Published
baseline. Page rendering, Form discovery, controller/provider resolution, and `/api/site/forms` dispatch
must all resolve the same effective Area tree: exact persisted Area override first, then the code-owned
shell preset. A gateway or controller resolver must not interpret a missing database override as an empty
module selection. Once an Area override exists, its `runtimeModules` selection is authoritative; adding a
package or importing its Form does not activate it.

The Site-local gateway derives the request Area from the same-Site Referer. Behind a reverse proxy,
same-Site validation compares the Referer host with the forwarded/request host because the internal and
public URL schemes may differ. Modules must not add a Client-supplied Area field, handler endpoint, or
module id as a fallback. The Site gateway owns Area resolution and immutable handler dispatch.

Third-party package and Site-build verification must compose the package through the normal Runtime Module
catalog helpers. Catalog construction rejects a Form whose `submitHandlerKey`, `confirmHandlerKey`, or
`previewHandlerKey` has no phase-matching handler Provider owned by that Module. Site composition must also
resolve every intended target Area with its default/effective `runtimeModules`; this catches an eligible but
inactive Module, an omitted Area contribution, unavailable server capability, and missing field, validation,
options, record, or handler Providers before deployment.

The Ant Design Form owns only the mounted client value store, touched state, and client validation.
`PhiFormControl` owns its adapter and descriptor rendering. `PhiFormWidget` owns runtime resolution and
execution integration. Business persistence remains behind the Site gateway or a domain Controller.

## CMS placement

Forms are not CMS Widget types. A CMS tree places the one generic
`@phis/ui/widgets/form` Widget and stores the selected namespaced `formId` in its config:

```ts
const REQUEST_FORM_WIDGET_ID = SUPPORT_REQUEST_PRESET_IDS.form;

config: {
  formId: SUPPORT_REQUEST_FORM_ID,
  formConfig: {},
  execution: { mode: "handler" },
  source: null,
  signalRoutes: {
    listens: [{
      routeKey: "support-request-submit",
      capabilityId: "submit",
      scope: "page",
      channel: "submit",
      action: "activate",
      valueType: "none",
      receiver: createPhiSignalAddress("cms", REQUEST_FORM_WIDGET_ID),
    }],
  },
}
```

The Builder resolves the Form selector from `formDefinitionsById` of the active target-Area module
sandbox. Contact, Login, Registration, Confirmation, Password Reset, and third-party Forms therefore
use the same Widget implementation. Do not add domain-specific Form Widget definitions, registries, or
Picker entries.

The generic Form Widget renders inline in its assigned Layout. A persisted modal workflow declares a
Page- or Area-owned Overlay with an explicit root Layout and places the inline Form Widget in that normal
subtree. A record editor can bind its `source` to a Provider resource that explicitly declares
`recordRead: true`; the opening Table action supplies only the row identity, and the Provider resolves
the initial field values. Successful submit and cancel events remain ordinary persisted Form signal
and Controller routes. Visible actions are ordinary Phi Button Widgets in a sibling Layout or Overlay
Footer; they are not part of the Form descriptor. The preset never stores a callback, endpoint, row
snapshot, domain dialog component, or a second Form-owned Modal container.

Place the visible submit action as an ordinary sibling Button Widget. Its route targets the CMS Form
Widget address, not the internal Core Form controller:

```ts
config: {
  key: "submit",
  label: "Send request",
  buttonType: "primary",
  signalRoutes: {
    emits: [{
      routeKey: "support-request-submit-button",
      capabilityId: "activate",
      scope: "page",
      channel: "submit",
      action: "activate",
      valueType: "none",
      receiver: createPhiSignalAddress("cms", REQUEST_FORM_WIDGET_ID),
    }],
  },
}
```

The Form Widget receives this command, calls the mounted Ant Design Form instance, and runs all client
validation before either execution mode continues. Reset works the same way with the Form Widget's
`reset` capability. Save, Apply, Reset, Cancel, and Close never become descriptor fields.

## Identity and ownership

A Form has one stable, package-namespaced identity:

```ts
import { createPhiFormId } from "@phis/ui/forms";

export const SUPPORT_REQUEST_FORM_ID = createPhiFormId(
  "@acme/support",
  "request",
);
// @acme/support/forms/request
```

- The package portion of `formId` must match the package portion of the owner Runtime Module id.
- `descriptor.key` must equal `formId`.
- `ownerModuleId` records lifecycle ownership; it is not a second Form identity.
- Bare ids, numeric preset ids, `pluginKey/typeKey` Form identity, and compatibility aliases are not
  part of the v1 ABI.

## Define the preset

Keep the definition in a server entry without `"use client"`. The descriptor is serializable. Optional
`render` and `loadLabels` callbacks remain on the server side.

```tsx
import {
  createPhiFormId,
  definePhiRuntimeModuleForm,
  type PhiFormDescriptor,
} from "@phis/ui/forms";
import type { PhiRuntimeModuleId } from "@phis/ui/cms/plugins";
import { loadSupportFormLabels } from "./labels";

export const SUPPORT_MODULE_ID = "@acme/support/runtime" as PhiRuntimeModuleId;
export const SUPPORT_REQUEST_FORM_ID = createPhiFormId("@acme/support", "request");

const descriptor = {
  schemaVersion: 1,
  key: SUPPORT_REQUEST_FORM_ID,
  labelSetKey: "@acme/support/form-labels:request",
  layout: {
    columns: { compact: 1, medium: 2, wide: 2 },
    gap: { compact: "sm", medium: "base", wide: "base" },
    labelPlacement: "top",
  },
  fields: [
    {
      key: "email",
      fieldProviderKey: "@phis/ui/form-field:email",
      label: { kind: "label", key: "email.label", fallback: "Email" },
      validation: [
        { providerKey: "@phis/ui/form-validation:required" },
        { providerKey: "@phis/ui/form-validation:email" },
      ],
    },
  ],
} satisfies PhiFormDescriptor;

export const SUPPORT_REQUEST_FORM = definePhiRuntimeModuleForm({
  ownerModuleId: SUPPORT_MODULE_ID,
  formId: SUPPORT_REQUEST_FORM_ID,
  version: 1,
  flags: 0,
  title: "Support request",
  description: "Creates a support request.",
  category: "site",
  tags: ["support"],
  descriptor,
  submitHandlerKey: "support.request.create",
  confirmHandlerKey: null,
  previewHandlerKey: null,
  defaultConfig: {},
  config: {},
  variant: "default",
  previewUpstreamPath: null,
  loadLabels: async ({ runtime }) => loadSupportFormLabels(runtime.locale.current),
});
```

All field, validation, and handler keys referenced by the Form must be declared by active Runtime
Modules. Runtime resolution fails early when a provider is unavailable or its phase does not match the
Form reference.

## Declare handler availability and implement the server side

`submitHandlerKey` selects behavior; it is not itself a Provider key or controller address. Declare its
availability as module metadata:

```ts
import type {
  PhiFormHandlerProviderDescriptor,
  PhiFormProviderKey,
} from "@phis/ui/forms";

export const SUPPORT_REQUEST_HANDLER_KEY = "support.request.create";

export const SUPPORT_REQUEST_HANDLER_PROVIDER = {
  key: "@acme/support/form-handler:request-create" as PhiFormProviderKey,
  ownerModuleId: SUPPORT_MODULE_ID,
  title: "Create support request",
  phase: "submit",
  handlerKey: SUPPORT_REQUEST_HANDLER_KEY,
  category: "site",
  transport: "relay",
  method: "POST",
  upstreamPath: "/api/support/requests",
  csrfPath: null,
  requiresCsrf: false,
  credentialPolicy: "site-session",
} satisfies PhiFormHandlerProviderDescriptor;

export const SUPPORT_RUNTIME_MODULE_DEFINITION = {
  // normal module metadata omitted
  moduleId: SUPPORT_MODULE_ID,
  formProviders: {
    handlers: [SUPPORT_REQUEST_HANDLER_PROVIDER],
  },
} satisfies PhiRuntimeModuleDefinition;
```

The Form definition and handler descriptor must use the same `handlerKey` and phase. The handler
Provider's namespaced `key` is catalog identity only; it is never stored in `submitHandlerKey`.

The handler example above shows the approved target ABI. The P0 migration adds its target, CSRF, and
credential fields to `PhiFormHandlerProviderDescriptor`; until that lands, current package source still
uses the shorter transitional Provider ABI plus exact Shared-owned credential tuples. Do not put these
fields back into editable Form config or add another credential-forwarding allowlist.

Handler mode posts only `formId`, the closed phase (`submit` or `confirm`), and validated values to the
Site-local `/api/site/forms` gateway. The gateway resolves the Published Form from the active target-Area
module catalog, resolves the handler Provider on the Server, constructs the execution target from that
immutable Provider, and rejects Client-carried routing or credential overrides. A third-party feature that
needs a reusable server counterpart ships that route in its `*-server` add-on; a Site-local feature may
implement it in the Site dispatcher. Catalog metadata alone does not implement persistence. Without the
server Provider mapping and actual handler, the Form renders and validates but cannot submit successfully.

`credentialPolicy` is mandatory and closed: `none` forwards no Browser cookie, `site-session` forwards
only `phi_session`, and Core-only `auth-link` forwards only `phi_auth_link` for the closed link workflow.
No Provider, Form config, Site override, Widget config, signal, or Browser payload may name a cookie.
`none` remains a Site-scoped server request through the trusted gateway and is intended for anonymous
login, registration, password-reset, and public-contact handlers; it does not disable Site resolution,
internal-token checks, CSRF, validation, rate limiting, or abuse protection. `site-session` forwards an
existing identity, while the destination handler alone decides whether that session is mandatory and
which access policy is required.

The server handler must parse, validate, authorize, and rate-limit the values again. Client validation,
hidden fields, a trusted `formId`, and a declared handler provider never replace server enforcement.

## Contribute the Form from the Runtime Module

Add the Form explicitly to each Server Area contribution in which the module may be active:

```ts
definePhiRuntimeModuleServerAreaContribution({
  moduleId: SUPPORT_MODULE_ID,
  catalogEntry: {
    definition: SUPPORT_RUNTIME_MODULE_DEFINITION,
    widgets: SUPPORT_RUNTIME_MODULE_WIDGETS,
    layouts: [],
    forms: [SUPPORT_REQUEST_FORM],
    loadUiProvider: () => import("../forms/ui-provider")
      .then((module) => module.SupportFormUiProvider), // omit when only Core fields are used
    load: () => import("./runtime").then((module) => module.SUPPORT_RUNTIME_MODULE),
  },
});
```

The module definition declares serializable provider metadata through `formProviders`. A custom field
or validation implementation is composed by the module's lazy `loadUiProvider`; it wraps only a
demanded render subtree owned by that module with `PhiFormProviderRegistryProvider`. Merely activating
a module-owned Form does not load the module UI provider. This keeps unused Form UI out of unrelated
Area client graphs.

If the Form uses only Core field and validation keys, do not create a module UI provider. For one custom
field type, declare serializable metadata on the module and compose its executable Control lazily:

```ts
// fields/ticket-reference.ts -- server-safe metadata
export const SUPPORT_TICKET_FIELD = {
  key: "@acme/support/form-field:ticket-reference" as PhiFormProviderKey,
  ownerModuleId: SUPPORT_MODULE_ID,
  title: "Ticket reference",
  valueType: "string",
  presentation: "control",
} satisfies PhiFormFieldTypeProviderDescriptor;
```

```tsx
// forms/ui-provider.tsx
"use client";

import { SUPPORT_TICKET_FIELD } from "../fields/ticket-reference";

const registry = createPhiFormProviderRegistry({
  fieldTypes: [{
    ...SUPPORT_TICKET_FIELD,
    Control: ({ value, onChange, disabled, readOnly }) => (
      <PhiTextControl
        value={typeof value === "string" ? value : ""}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(next) => onChange?.(next)}
      />
    ),
  }],
});

export function SupportFormUiProvider({ children }: { children: ReactNode }) {
  return (
    <PhiFormProviderRegistryProvider registry={registry}>
      {children}
    </PhiFormProviderRegistryProvider>
  );
}
```

Add `SUPPORT_TICKET_FIELD` to `moduleDefinition.formProviders.fieldTypes` and expose the wrapper through
the Area contribution's lazy `loadUiProvider`. Do not add the executable `Control` to module metadata or
import the UI provider from the server definition.

## Controls and UI providers

Form fields and Inspector fields use the presentation-level Controls directly:

```text
CMS Widget = config + runtime signals + provider resolution
Phi *Control = controlled presentation adapter
Ant Design = primitive
```

- A Form field provider renders a `Phi*Control`, never a CMS Widget.
- A Control receives `value`, `onChange`, disabled/read-only state, and presentation props. It must not
  create a second persistent state model.
- Select-like fields use the generic options-provider ABI. Do not add field-specific option registries.
- Runtime demand collection follows each placed Form Widget into its resolved active preset descriptor;
  every `fields[].optionsProvider.providerKey` is demanded through the same Area-local data-provider host
  as a Provider referenced directly by Widget config. Merely activating the Form's owner Module does not
  eagerly load its unused Options Providers.
- A field whose options depend on another field declares it, rather than a Provider reaching for the
  form: `optionsProvider.dependencies` names the parameter, the source (`form` for live values,
  `config` for the configuration a surface without a form was built from), and the path. The resolved
  values reach the Provider as `context.dependencies` and are part of every load key, outside
  `resolveLoadKey` where a Provider cannot drop them. A `required` dependency without a value stops
  the load entirely -- the field offers nothing rather than everything -- and changing it clears what
  the dependent field holds, because that value was chosen from a list that no longer applies.
- A custom UI provider extends the immutable Core registry with `extendPhiFormProviderRegistry`; global
  registries and import-side-effect registration are forbidden.
- Direct Ant Design use belongs inside the Control implementation, not in Form descriptors.

## Initial values and record editing

Use exactly one of the normal value sources for the workflow:

- `fields[].initialValue` supplies the descriptor default;
- `formConfig.initialValues` overrides descriptor defaults for one placed inline Form;
- `source` binds an edit Form to a Table Provider resource with `recordRead: true`; and
- Core Form-controller `values` or `field` signals update an already mounted instance.

For a record editor, persist only the Provider key, resource key, parameters, and `openActionKey`. A
Table action sends a stable row identity through the Form Widget's `recordOpen` input. The Provider reads
the current record; the preset never embeds the row snapshot. Reopening another identity remounts the
Ant Design value store with that record. A record-bound Form never calls its Provider with a null identity
while mounting. Handler mode may reload only the last successfully opened identity after submit or an
explicit reload signal.

## Controller and signaling boundary

Standard runtime Forms use the demand-materialized Core controller
`controller:@phis/ui/form:<instance-key>`. It owns values, touched/dirty/valid state, submit,
confirm, reset, result, and error signals. The module does not mount a second Form controller.

Keep these three addresses distinct:

| Address | Purpose | Who creates it? |
| --- | --- | --- |
| `cms:<form-widget-id>` | Public signal surface of the placed Form Widget; external buttons target its `submit` or `reset` input. | The CMS preset. |
| `controller:@phis/ui/form:widget-<form-widget-id>` | Internal runtime state and handler execution for exactly that mounted Form. | Automatically demanded from the Form Widget; never added as a preset node. |
| `controller:<module>:<instance>` | Optional domain workflow, for example a wizard, coordinated modal, or several Forms committed together. | The owning Runtime Module, only when needed. |

The Form Widget derives its Core controller instance key from its CMS widget id. A basic handler Form
therefore needs no controller node, controller address, or controller import in its preset. Persisted
`signalRoutes` describe only communication involving the Form Widget and other CMS/runtime participants.

### Handler mode end to end

```text
Button Widget
  └── submit signal to cms:<form-widget-id>
      └── Form Widget invokes PhiFormControl.submit()
          └── Ant Design validates
              └── Form Widget sends formId + phase + values to its Core Form controller
                  └── Core Form controller POSTs /api/site/forms
                      └── Site gateway resolves Form + handler Provider and dispatches
                          └── Site or *-server handler persists
```

The Form Widget can route `submitting`, `validationFailed`, `submitSuccess`, and `submitError` outputs to
a Button, Overlay, or domain Controller. An Overlay closes only after the correlated `submitSuccess`, not
when Save is clicked. A simple inline Form that needs no external feedback may omit those output routes.

The generic Form Widget may select `execution.mode = signal` for a local control Form. In that mode the
standard submit input emits the complete `formValues` payload and reset restores and emits the configured
initial values. The owning Module controller transforms those generic Form signals into domain signals.
No submit gateway is called, and the Form definition may therefore omit `submitHandlerKey`.

```ts
config: {
  formId: SUPPORT_FILTER_FORM_ID,
  formConfig: { initialValues: { status: "open" } },
  execution: { mode: "signal" },
  source: null,
  signalRoutes: {
    listens: [{
      routeKey: "support-filter-submit",
      capabilityId: "submit",
      scope: "page",
      channel: "submit",
      action: "activate",
      valueType: "none",
      receiver: createPhiSignalAddress("cms", FILTER_FORM_WIDGET_ID),
    }],
    emits: [{
      routeKey: "support-filter-values",
      capabilityId: "submitValues",
      scope: "page",
      channel: "supportFilter",
      action: "change",
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
      receiver: createSupportControllerAddress(),
    }],
  },
}
```

In signal mode the domain Controller receives `{ values }` only after successful client validation. It
owns any transformation into query, Builder, or domain state. The descriptor still contains no callback
or controller address. If a workflow sends Save to a domain Controller first, that Controller may fan out
correlated submit signals to one or more Form Widgets and wait for all value or validation feedback, as
the Builder Effects workflow does.

`submitHandlerKey`, `confirmHandlerKey`, and `previewHandlerKey` select server behavior when present; they are not
controller addresses. A module adds its own controller only for a genuinely different domain lifecycle,
such as a payment state machine or server-backed wizard. The optional visual Form Builder has a separate
authoring controller and is deferred to P2.

## Labels, validation, and security

- Code-owned translated Forms use a namespaced `labelSetKey` plus a server `loadLabels` callback.
- Labels, placeholders, descriptions, and custom validation messages use
  `PhiFormTextDescriptor`. Literal-only Forms do not need a label loader.
- Client validation is declarative and provider-based. The server handler must always revalidate input.
- Honeypot, CSRF, credential forwarding, authorization, rate limiting, and secrets are server concerns
  selected by the resolved immutable handler Provider. Descriptors must not contain callbacks, secrets,
  route targets, credential policy, or arbitrary executable code.
- A browser never calls an add-on or `phi-server` directly; the site-local Form gateway validates and
  relays the request.

## Published runtime now, Draft-ready storage later

A package release acts as the Published preset baseline. A Site may store a Published override for the
same active module-owned `formId`; the preset remains the fallback. Runtime resolution never exposes a
Working Draft.

The v1 `form_definitions` table already stores revision rows and reserves exactly one status slot per
Site/Form for Working Draft (`0`), Published (`1`), and archived Published revisions (`2`). Future visual
authoring can add Draft create/update/preview/publish APIs and optimistic version checks without a schema
change. It must not mutate the package preset itself.

## Failure guide

| Failure | Contract boundary to inspect |
| --- | --- |
| `Form "..." is not available from the active runtime modules.` | The owner module is not active in the target Area or the Area contribution omitted the Form from `catalogEntry.forms`. |
| `Form handler is not active for this Area.` | Verify the Referer/request host boundary, the resolved Area, the persisted-Area-or-code-preset fallback, the effective `runtimeModules`, the owner Module's server capability, and the phase-matching owned handler Provider. Do not pass Area or endpoint metadata from the Browser. |
| Missing field or validation provider | The descriptor references a key absent from the active module metadata, or a custom executable registry was not loaded around the owner subtree. |
| Missing submit/confirm/preview handler | The active module set does not declare matching handler metadata for that exact phase and `handlerKey`. |
| Form renders but the visible button does nothing | The external Button and Form Widget do not share a compatible persisted signal route targeting `cms:<form-widget-id>`. |
| Form validates but handler mode fails | Check active Form/handler Provider resolution, immutable Provider target and credential policy, server add-on/route, authorization, and response. |
| Overlay closes before persistence succeeds | The workflow closes on the Save command instead of the correlated `submitSuccess` result. |
| Signal mode sends no values | The Form lacks an emitted `submitValues` route or the receiver/controller capability does not accept the `formValues` schema. |
| Select options are unavailable | The field's Options Provider is not declared or demanded by the active Form descriptor/module set. |

## Checklist

- Use `createPhiFormId(packageName, formKey)` and keep `descriptor.key` identical.
- Export one pure `definePhiRuntimeModuleForm(...)` definition from a server entry.
- Choose `handler` or `signal` execution explicitly; do not combine them.
- Declare every referenced field, validation, options, record, and phase-specific handler provider on
  active modules.
- Add the Form to `catalogEntry.forms`; never register it globally.
- Verify each intended Area twice: with the package-owned shell baseline before any database revision and
  with a persisted Area override whose `runtimeModules` selection is authoritative.
- Place it through the generic Form Widget with `formId`; never create a domain Form Widget alias.
- Give the Form Widget a stable CMS instance id and place visible actions as sibling Button/Command
  Toolbar Widgets with explicit routes.
- Do not mount the Core Form controller in the preset; verify that the Form Widget demand produces its
  `widget-<widget-id>` instance.
- For handler mode, declare the server-owned handler Provider, implement its Site or `*-server` endpoint
  behind `/api/site/forms`, and revalidate/authorize all values there.
- For signal mode, route `submitValues`, validation, and result feedback to the owning domain Controller.
- Keep executable UI behind the module's lazy UI provider and use Phi Controls.
- Use the Core runtime Form controller unless the domain lifecycle is genuinely different.
- Revalidate and authorize on the server; keep secrets and arbitrary endpoints out of descriptors.
- Test descriptor parsing, catalog construction, missing-provider rejection, active-Area resolution,
  server rendering, client validation, submit/reset signaling, gateway rejection and success, and the
  package boundary.
