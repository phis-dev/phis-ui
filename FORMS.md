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
kept in a Server entry. Fields marked optional may be left out of the input
(`PhiRuntimeModuleFormDefinitionInput`); the factory fills in their default, so a defined Form
(`PhiRuntimeModuleFormDefinition`) always carries every field.

| Field | Meaning |
| --- | --- |
| `ownerModuleId` | The Module that owns the Form. |
| `areas` | Non-empty list of Area keys the Form belongs to, each within the Module's `eligibleAreas`. An Area's projection of the contribution keeps only the Forms that name it. |
| `formId` | See above; `descriptor.key` must be identical. |
| `version` | Positive integer. |
| `flags`, `title`, `description`, `category`, `tags` | Catalog metadata. |
| `descriptor` | The `PhiFormDescriptor`, parsed on definition. |
| `submitHandlerKey` | Logical handler name such as `auth.login`, or `null`. |
| `confirmHandlerKey`, `previewHandlerKey` | Optional, default `null`. Logical handler names like `submitHandlerKey`. |
| `defaultConfig`, `config`, `variant` | Optional, default `{}`, `{}`, `"default"`. Carried on the definition and deep-merged with a Site override into `effectiveConfig`; nothing reads the result yet. Prepared for the Form Builder, where an author assembles a Form instead of placing a preset. A placed Form Widget is configured by its node, not from here. |
| `previewUpstreamPath` | Optional, default `null`. Carried on the definition; the relay does not read it (see [Relay](#relay)). |
| `loadLabels` | Optional Server loader for the descriptor's `labelSetKey`. |
| `loadInitialValues` | Optional Server loader for values the Form needs before it can be filled in. |
| `purpose` | Optional platform role from `PHI_FORM_PURPOSES`; an unknown value is refused on definition. |

- A handler key names behavior, not a Provider key and not a Controller address. Catalog construction
  rejects a Form whose submit, confirm, or preview key has no handler Provider of the same phase owned by
  the same Module.
- A descriptor with a `labelSetKey` requires `loadLabels`; `resolvePhiFormLabels` throws without it.
  Literal-only Forms need no loader. A loader is written with `createPhiFormLabelSetLoader(load, select)`
  (`components/forms/shared-form-loaders.ts`): `load` imports the Label Set's getter, `select` picks and
  renames what the descriptor's keys are called out of it. The import, the credentials, the locale and the
  flattening are the loader's; a Module form states only its mapping.
- A definition has no render callback. Everything a Form shows comes from its descriptor; everything a
  Form does around it (submit, links, success) comes from the Form Widget.
- The active Module set rejects a Form whose field or validation Provider keys are not declared by an
  active Module (`plugins/runtime-modules/resolver.ts`).
- Core asks for a Form by `purpose` where it needs one it cannot name, because the Module that supplies
  it may be replaced (`findPhiFormDefinitionByPurpose`). `account-password-change` sets the signed-in
  account's password and is what every Page shows in front of itself while an administrator's password
  change is outstanding; the Auth Module's `profile-password` Form declares it. A replacement Auth Module
  declares it on its own Form. Where no active Module does, the Page offers the reset link from the mail
  and signing out instead.

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
  errors?: Readonly<Record<string, PhiFormErrorTextDescriptor>>;   // keyed by the handler's error `code`
  persistDraft?: boolean;
  guard?: boolean;
  submit?: {                    // what the Form's own submit looks like, where one is drawn
    label?: PhiFormTextDescriptor;             // default `actions.submitLabel`, else "Submit"
    align?: "start" | "center" | "end";        // default `start`
    control?: PhiFormResponsiveGridRange;      // default the layout's control range
  };
};
```

The descriptor and its parser live in `@phis/contracts/forms`; phis-server reads stored descriptors
with the same parser.

- A descriptor with `actions` or `presentation` is rejected. Reset, cancel, and close are not part of a
  descriptor.
- `submit` describes the Form's button: what it says and where on the Form's grid it stands. Whether it
  is drawn is not the descriptor's to say -- the same Form stands on a Page with its button under the
  fields and in a dialog whose footer carries the button. The Form Widget's `submit` decides that.
- `success` is what the Form shows when a submit is accepted; `reset: true` returns the fields to their
  initial values, `complete: true` leaves only the success -- fields and the Widget's submit go, because
  the Form has done its one job (a confirmation link is spent by its first submit). Without `success`
  the Form shows nothing of its own, which is right when a Controller closes an Overlay or the page
  moves on.
- `errors` is the counterpart of `success`: what the Form says when the handler refuses it, keyed by the
  `code` in the refusal's body. The wording is a label, so a visitor reads it in the Site's language; a
  code nothing maps falls back to the body's `error` line, which is English and written for a log. A
  handler that wants its refusal read by a person answers `{ code, error }` -- `code` alone is the
  contract, `error` alone reaches the visitor untranslated.
- A code's text may name values of the refusal: `{ template, params, otherwise }` instead of a text; see
  [Refusal values](#refusal-values).
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

### Refusal values

A refusal can say what it refused. The handler answers the value beside its `code`, and the Form's text
for that code names it:

```ts
type PhiFormErrorTextDescriptor =
  | PhiFormTextDescriptor
  | {
      template: PhiFormTextDescriptor;   // `%1` to `%n`, one for each of `params`
      params: readonly string[];         // names of fields of the refusal's body, in placeholder order
      otherwise: PhiFormTextDescriptor;  // the text where a value is not there
    };

// The shop answers 400 { error, code: "out_of_stock", product: "Private Cloud" }:
errors: {
  out_of_stock: {
    template: { kind: "label", key: "errors.outOfStockProduct", fallback: "\"%1\" is not in stock in that quantity." },
    params: ["product"],
    otherwise: { kind: "label", key: "errors.outOfStock", fallback: "Something in your cart is not in stock in that quantity." },
  },
}
// -> "Private Cloud" is not in stock in that quantity.   (German label: „Private Cloud“ ist in dieser Menge nicht vorrätig.)
```

- The template is translated and the values are not ([TRANSLATIONS.md](TRANSLATIONS.md)): the label is
  read in the visitor's language first, and `%1` to `%n` are filled afterwards in one pass, so a value
  that contains `%2` stays the value. A placeholder the translation adds beyond `params` stays standing.
- A value counts where the body holds it as a non-empty string (trimmed) or a finite number, written as
  it came. A value missing, empty, or of any other type makes the Form say `otherwise` instead -- the
  code's general text. The template is never shown with a gap or a standing `%1`, and the body's `error`
  line does not stand in, because it is the log's English. `otherwise` is required for that reason:
  there is no implicit answer to choose.
- The parser refuses an entry whose source text (`value` of a `literal`, `fallback` of a `label` or
  `config`) does not hold exactly the placeholders `%1` to `%n` for its `n` params (one may repeat), a
  `params` that is empty, repeats a name or holds anything but a field name (`[A-Za-z_][A-Za-z0-9_]*`,
  a top-level field: no paths), an entry without `otherwise` or with a placeholder in it, and
  `params`/`otherwise` beside a plain text.
- `resolvePhiFormErrorText(entry, body, labels, formConfig)` (`@phis/ui/forms`) is the resolver the Form
  uses; a plain text resolves as `resolvePhiFormText` does.

### Fields

`PhiFormFieldDescriptor` has `key` (unique within the Form), `fieldProviderKey`, and optional `label`,
`controlLabel`, `description`, `placeholder`, `autoComplete`, `initialValue`, `options`,
`optionsProvider`, `emptyOption`, `validation`, `visibleWhen`, `disabledWhen`, `placement`, and `config`
(provider-specific settings).

- Required state is the `required` validation rule; there is no `required` boolean on a field.
- Static `options` and an `optionsProvider` follow the options contract of the Controls. A field whose
  options depend on another value declares `optionsProvider.dependencies`. An option's `parentValue`
  names the option it stands under (see [components/widgets/README.md](components/widgets/README.md));
  a Control that cannot draw a hierarchy lists the options as they come. A written-out option's
  `separator` (`"before"` or `"after"`, anything else refused) draws a line in a Select's menu.
- A field's Options Provider hears what the field holds (`selected` in its context, one value or the
  list of a multiple field), so one that answers a search with a page of matches can name a held value
  that is not among them, and a held value keeps the option it was last seen with while a later answer
  leaves it out. See [components/widgets/README.md, "Options Providers"](components/widgets/README.md#options-providers).
- Options resolution reads the field's own `config` with the placement's `formConfig` layered over it,
  the placement winning where both name a key. A descriptor is registered once and reads the same on
  every Site; a list that varies by Site is what the placement knows, and it belongs there. Because this
  resolves during the render, a provider fed this way answers in the HTML the Server sends, while one
  that asks a route answers after hydration.
- The Options Providers named anywhere in the descriptor of a placed Form are part of that page's data
  Provider demand (`collectPhiRuntimeDataProviderKeys`); a Form that is not placed loads none.
- **A person by user id** is a `select` on Core's Site member picker,
  `PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.siteMembers` (`@phis/ui/constants`, key
  `@phis/ui/modules/core/options/site-members`): Core's, so it answers in every Area, in any Module's
  Form. It asks phis-server's `GET /api/site/members` with what is typed (`q`, matched on the name, the
  e-mail addresses and, for a query that is a telephone number, the business and mobile numbers' digits) and offers the first page of matches, each option the user id as text and the name
  the person is shown under (`#<id>` without one; never an address). Declare the search on the field, as
  the route answers it: `loadMode: "server"`, `search: { enabled: true, minChars }`. Core lets the holders
  of the Site access `accounting` or `support` ask (Admin, Maintainer, Accountant, Supporter) -- the staff
  `entitlements:v1` names a member to -- and anybody else's load fails, so the field warns and offers
  nothing. The handler receives the id as text (`{ "userId": "42" }`), as a select holds it. The Groups
  Module's member candidates are a different question (who a group's Manager may add, with whether they
  are in that group) and stay its own.

  ```ts
  {
    key: "userId",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
    label: label("person", "Person"),
    optionsProvider: {
      providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.siteMembers,
      loadMode: "server",
      search: { enabled: true, minChars: 2 },
    },
    validation: required("personRequired", "Choose a person."),
  }
  ```

### The empty option

A `select` field that offers options -- written out or from an Options Provider -- may declare
`emptyOption: { label }` (`@phis/contracts/forms`, owner decision 2026-11-26): its "none of these". The
Select lists it **last, after a line**, in the Form's words (`label` is a Form text, so it is translated
through the Form's label set like every other). Choosing it leaves the field with **no value**: the Form
holds nothing for it, a field that holds nothing opens on it, and the submit **leaves the field out**
(`omitPhiFormEmptyOptionFields`, `components/forms/form-empty-option.ts`), so a handler reads the key as
absent -- the one reading "not declared" has everywhere. There is no value of its own to spell, and no
handler has to know to throw a sentinel away: the contract refuses `value` beside it, a field without
options declaring it, and any label that is no Form text; `checkPhiPresetForms` refuses it on a field
other than a `select` (the one Control that draws it).

The message-language picker is the first user: "Other language" on every Form that writes a message
(`phiThreadMessageSourceLangField`, THREADS.md section 9). It opens on the writer's own language, else the
page's, and where the Site offers neither it opens on "Other language" by having no initial value at all
(`buildPhiThreadMessageFormConfig`); chosen, the message goes without `sourceLang` and Core stores
`source_lang` NULL.

```ts
{
  key: "sourceLang",
  fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
  label: label("language", "Written in"),
  optionsProvider: { providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.siteLocales },
  emptyOption: { label: label("languageOther", "Other language") },
}
```

A required rule beside it says the empty option is no answer, which is the Form's choice to make; the
picker above carries none.

### Conditions

`visibleWhen` and `disabledWhen` use the shared runtime-condition expression (`types/runtime-condition.ts`).
A leaf names `source`, `valuePath`, and `operator` (`truthy`, `falsy`, `equals`, `contains`, the last two
with a string `value`, and `optionFlag` with a numeric `flag`, below); a group names `match: "all" | "any"`
and nested `conditions`.

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

- **What a choice is, not which value it has: `optionFlag`.** A leaf `{ source: "form", valuePath:
  "<field key>", operator: "optionFlag", flag: <bits> }` holds where the option chosen in that field
  carries every bit of `flag` in its `flags` (`PhiControlOption.flags`, a whole number from 1 to
  `PHI_CONTROL_OPTION_FLAGS_MAX`; absent is none). It takes no `value`, and `valuePath` names another
  field of the same Form that offers options, written out or from an Options Provider -- the parser
  refuses any other. The bits mean what whoever answers for the options says they mean: `@phis/support`'s
  request types answer `PhisSupportTicketTypeFlag.External`, so the consent checkbox stands only under a
  type whose conversation leaves the Site, without the descriptor having to list which types those are.
  Written-out options are known while the Form renders, on the server too; a Provider's are known once
  the field has resolved them, and until then -- and while a held value is among none of its options --
  the condition is unavailable, which hides under `visibleWhen` unless the leaf sets `whenUnavailable`.
  Several values chosen in one field answer with all their options' flags together; nothing chosen is 0.
  A field hidden this way is hidden as by any other condition: what it holds is submitted as before.
  Contract addition (`@phis/contracts/conditions` and `/controls`, with the next contracts release).

  ```ts
  {
    key: "acknowledgedExternal",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.checkbox,
    controlLabel: label("requestExternal", "I understand this may be shared outside this Site"),
    visibleWhen: { source: "form", valuePath: "typeKey", operator: "optionFlag", flag: PhisSupportTicketTypeFlag.External },
  }
  ```
- A Form descriptor accepts only `source: "form"` (values of the same Form instance) and
  `source: "controller"` with a `controllerAddress` (state of that Controller). Any other source is
  rejected, `record` among them: the record a Page is about is a node's condition, settled on the server
  ([MODULES.md](./MODULES.md#the-fields-of-a-record-and-the-record-a-page-is-about)).
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
  columnGap?: { compact?: PhiSpacingToken; medium?: PhiSpacingToken; wide?: PhiSpacingToken };
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
  width, never the viewport: `medium` from 377px, `wide` from 610px (`PHI_FORM_RESPONSIVE_MIN_WIDTH`,
  implemented as container queries in `styles/layout.css`). The same descriptor therefore fits a page, an
  Overlay, or a narrow slot.
- A responsive value cascades from the nearest smaller mode that is set; an unset section uses the
  defaults.
- Defaults (`PHI_FORM_DEFAULT_LAYOUT`): gap `sm` / `base` / `base`; `labelAlign: "start"`; label 1-25 in
  `compact`, 1-11 in `medium` and 1-9 in `wide`; control 1-25, 11-25 and 9-25. Wide, the labels take a
  third of the width, the same column the Login states for itself. Medium -- 377 to 609px, where the Form
  of a one-column dialog stands -- they take ten tracks of twenty-four, since a third of 377px broke two-word
  labels such as "Installation key" over two lines (owner, 2026-11-25, on trial).
- A label longer than its column wraps, and breaks inside a word where a word alone is wider
  (`overflow-wrap: anywhere` on `.phi-form-cell--label`): in a one-column dialog the column is ten
  twenty-fourths of 377px, and a long word of a translation used to run under the input. Keep such labels short and say
  the rest in the dialog's text -- the width rule (OVERLAYS.md, "Geometry") decides the dialog's width
  only, not what fits in its label column.
- A field's `label` and `control` are column ranges, not content. What a placement states is read per
  mode; within one part an unset mode cascades from the nearest smaller mode of that same part:
  - both parts stated: the label cell stands in its range, the control cell in its range;
  - only `control`: the field has no label column. The control takes exactly that range, and the label
    text, if the field has one, is drawn inside the same range, stacked above the control;
  - only `label`: the field has no control column. The label takes exactly that range, and whatever the
    field draws as its control stands under the label inside the same range;
  - neither stated for that mode, or no `placement` at all: the layout's ranges for both parts.
- The part a placement leaves out is never taken from the layout. A lone part may therefore span the
  whole width label and control share in the layout, up to 1-25 (`{ control: PHI_FORM_ROW_FULL }`).
- The parser accepts a placement with one part and checks its ranges; a part given as an object that
  names no mode is refused, and a placement stating neither part is read as no placement.
- When a field's label and control ranges overlap they stack on two rows; otherwise they share one. There
  is no `columns` or `labelPlacement` setting: a two-column Form is fields in 1-13 and 13-25, and a
  stacked Form uses full-width ranges. `components/forms/form-descriptor-contract.ts` exports named
  ranges for the common cases (`PHI_FORM_STACKED_LAYOUT`, `PHI_FORM_SIDE_START_HALF`, and others).
- Fields are placed in declaration order; a field goes on the current row while its tracks are free.
- `gap` uses the spacing tokens `none`, `xxs`, `xs`, `sm`, `base`, `md`, `lg`, `xl`, `xxl`. It is the
  spacing between one row of fields and the next, and half of it is the gutter between a label and the
  control beside it.
- `columnGap` is the spacing across, between the two columns of a row that has two, from the same tokens.
  Absent, it follows `gap` -- so two columns stand as far apart as two rows do, and twice as far apart as
  a label from its own control. It is laid on the cell that opens a column (`phiFormCellOpensColumn`),
  never on the first column, because the inset at the form's own edge belongs to the Layout it stands in.
  The grid's `column-gap` stays 0 and has to: it would fall between a label and its control as readily as
  between two fields.
- Alignment is logical: in RTL the label stands on the right without a separate setting.
- A descriptor has no padding, width, or maximum width. The Form fills its slot; padding and width limits
  belong to the containing Layout.
- A field whose value is several labelled parts (`PHI_FORM_PART_ROWS_FIELD_PROVIDER_KEYS`, the `address`)
  takes the whole row, 1-25, unless its placement says otherwise, and lays the same 24 tracks over it: its
  parts stand on the layout's label and control ranges at each width, written by the Form as
  `--phi-form-part-*` (`phiFormPartProperties`, `.phi-form-parts` in `styles/layout.css`). A placement of
  its own narrows those tracks with it.

### Size

A Form is drawn at one of two sizes, the Controls' vocabulary without `large` (`PhiFormSize`):
`medium`, and `small`, for a Form that stands among chrome -- a picker, a popover, a panel of tools.

- Where it is said, in this order of precedence (owner, 2026-11-26):
  1. **the placement**: the Form Widget's `controlSize` (`small` or `medium`, the Inspector's Size field)
     or `PhiFormControl`'s `size` prop, for a Form built in code -- the HTML editor's image popover is one
     (`components/widgets/client/html-editor-image-node.tsx`);
  2. **the descriptor**: `layout.size` (`@phis/contracts/forms`, `"small"` or `"medium"`, anything else
     refused), for a Form made to stand among chrome wherever it is placed;
  3. **`medium`**, where neither says anything.

  The placement wins because the same Form may be a page's question in one place and a popover's in
  another; the descriptor's size is its default, not its last word. The Form Widget's frame -- its submit
  and the gap above it -- reads the same order (`PhiFormWidgetFrame`).
- `PhiFormControl` hands it to every field as `size` (`PhiFormFieldProviderProps`), and **a field draws
  every control it has in it**: its inputs, its buttons, a picker's trigger, the sentence beside a
  checkbox. A field never writes a size of its own -- a `medium` input in a `small` Form stands out of
  every row around it, and a button written `size="small"` is small in every Form.
  `plugins/runtime-modules/form-field-size.test.tsx` renders every registered field at both sizes and fails a
  field whose controls do not follow; the only exceptions are written there with their reason (`table` and
  `tree`, whose collection chrome is small at every size; a `hidden` or `honeypot` field draws nothing).
  Ant Design's Slider has one size, so a `slider` field's rail stays as it is and its number input follows.
- A `small` Form writes its labels in the small text size (`fontSizeSM`, `--phi-form-cell-label-font-size`
  on the label cells and on a field's part labels), makes a label beside its control as tall as a small
  control (`controlHeightSM`), and stands every gap of its layout one spacing step closer
  (`PHI_FORM_SMALL_GAP_STEP`: `base` is `sm`, `sm` is `xs`, down to `xxs`), the way a small Card's inset is
  `paddingSM`. The Form Widget's submit is a small button and stands a step closer to the fields.
- The widths stay the Form's own: a small Form in a popover is usually under 377px, so it is `compact` and
  its labels stand above their inputs. That is the template, not a fault (Layout and placement).
- `medium` writes nothing new: no label size, the same gaps and the same submit as before sizes existed.

### Popup container

A field's floating layers -- a select's list, a picker's panel, a cascader's levels, the dimension's unit
lists, the colour panel, the Media picker, a slider's tooltip -- are mounted where the Form says
(owner, 2026-11-26).

- `PhiFormControl`'s `getPopupContainer` (`(triggerNode) => HTMLElement`, the name every Control with a
  floating layer uses) is handed to every field as `getPopupContainer` (`PhiFormFieldProviderProps`), and
  **a field hands it to every Control it draws that opens a layer** -- the calendar adapter's date picker
  included (`PhiCalendarAdapterDatePickerProps.getPopupContainer`). A field never chooses a container of
  its own. Left out, nothing changes: each layer goes where its Control puts it, the document's end.
- It is for a Form inside a popover. A list mounted at the document's end stands outside the popover, and
  the popover -- or the editor beneath it -- takes a click on an entry for a click elsewhere: in the HTML
  editor's image popover a click on a unit chose nothing (checked on dev.phis.dev). A Form in a scaffold
  popover passes `usePhiWidgetScaffoldPopup().getNestedPopupContainer`, which mounts each layer beside
  its trigger and so inside the popover; the image popover does.
- `plugins/runtime-modules/form-field-size.test.tsx` mounts every registered field with a container of
  its own, opens everything that opens a layer and fails a field whose layer stands outside it; the
  fields that have a layer are listed there, so one that opens nothing it lists, or something it does
  not, fails too. `table` and `tree` stand out of it as they stand out of the size: the lists their cell
  editors open are the Table and Tree Controls' own and are not handed the container.

### Compound Table and Tree values

A field provider may render `PhiTableControl` or `PhiTreeControl` when the whole collection is one value
in the submitted record (the Core `table` and `tree` field providers). Local editing, add/remove,
selection, and local reordering are allowed; the complete value is submitted and reset with the Form. The
Table field reads `rowIdentityPath`, `columns`, `add` (`enabled`, `label`, `defaultRow`, optional
`sourceFields` and `resetFields` naming sibling fields), `remove` (`enabled`, `label`) and `emptyText` from
its `config`. Its three words -- `add.label`, `remove.label`, `emptyText` -- are texts as a field's own
label is: a label reference (`label("rows.add", "Add a row")`, read from the Form's labels) or a literal
(`{ kind: "literal", value }`); a plain string is not read, because it would be English in every
language (`components/forms/table-field-text.ts`). Where the config names none, the field says the
Form's word under `PHI_FORM_TABLE_LABEL_KEYS` (`tableAdd`, `tableRemove`, `tableEmpty`,
`components/forms/table-field-labels.ts`), which the Form Widget fills from Core's `widget:table` Label Set
for every Form with a table field (`form-field-labels.ts`), so a Form translates none of them unless it
means other words. Provider queries,
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
  own providers through its lazy UI provider (`uiProvider: true`, [MODULES.md](./MODULES.md#module-ui-provider)),
  which wraps only that Module's render subtree. There is no global registry and no registration through
  imports.
- **A Form mounts the field Providers of the Modules whose field types it uses.** `PhiFormWidget` mounts
  the UI provider of the Module that owns the Form and, beside it, the UI provider of every *other* Module
  that owns a field type the Form uses -- read from each field's `fieldProviderKey` against the owning
  Module's `formProviders.fieldTypes` (`PhiCmsRuntimeRenderRegistry.ownerModuleIdByFormFieldTypeKey`) --
  provided that Module is active in the Area. The providers nest and compose
  (`PhiFormProviderRegistryProvider` extends the registry above it), each wrapping this one Form's subtree
  and nothing else, and each is loaded lazily from the Area's Client manifest like any UI provider. This is
  how a Module offers a field type other Modules' Forms may use: it declares the descriptor in its
  `formProviders.fieldTypes` (`ownerModuleId` is its own), registers the control in its UI provider
  (`lazyPhiFormFieldControl` keeps the control's code out of every other Form), and a Form of any Module
  names the key. No Form states the Module, and the Module is not told about the Form.
- **A field whose Module is not active in the Area stays in the Form and says so.** The Form is still
  valid there (the catalog knows the key; a key nobody installed declares is refused when the Area
  resolves). In place of the control `PhiFormControl` draws a calm information notice -- the Label Set
  key `fieldUnavailable`, falling back to "This field is not available in this area." -- under the field's
  label, validates nothing for it, and sends the value the form holds for it (an initial or loaded value)
  unchanged with every submit, so a save from such an Area does not clear what another Area set. The Form
  widget names these fields to the client in `unavailableFieldKeys`. A Module that is active but ships no UI
  provider for its field type is a wiring fault and still fails as "Missing field provider".
- A field provider renders Phi Controls and forwards the controlled `value`/`checked` and `onChange` it is
  given; it never keeps a second value state and never renders a Widget or Layout.
- A field provider draws every control in the `size` it is given, the Form's ([Size](#size)), and writes
  no size of its own.
- A field provider hands the `getPopupContainer` it is given to every Control it draws that opens a
  floating layer ([Popup container](#popup-container)), and chooses no container of its own.
- **A field draws no label layout of its own.** A Form is built from descriptor fields, and where a
  field's label stands -- beside its control from 377px of Form width, above it below that -- is the
  Form's template (`PHI_FORM_DEFAULT_LAYOUT`, [Layout and placement](#layout-and-placement)), drawn by the
  Form Widget. A field provider never draws a `<label>`, a caption above its input, an Ant Design
  `Form`/`Form.Item`, `labelCol`/`wrapperCol` or a `layout="vertical"`, and never hands a Phi Control a
  `label`. A field whose value is several labelled parts -- the `address` -- is listed in
  `PHI_FORM_PART_ROWS_FIELD_PROVIDER_KEYS`: the Form gives it the whole row and writes the template's
  columns (`phiFormPartProperties`), and the field draws each part through `PhiFormFieldParts` and
  `PhiFormFieldPart` (`components/forms/form-field-row.tsx`), so every part is a row of the same template
  with its label in the label column. The address drew its parts with their labels on top once, and in a
  one-column dialog whose every other field had its label beside it, it alone stood stacked (owner,
  2026-11-26). The same holds for a dialog, a popover or a panel: words beside an input come from a
  descriptor Form or the Inspector's rows, never from a layout of its own.
  `scripts/validate-form-field-rows.mjs` (in `runtime-modules:check`) refuses each of those shapes; the
  places that had one when it came stand in its temporary list until they are moved.
- Core field providers: `text`, `email`, `password`, `textarea`, `hidden`, `honeypot`, `checkbox`,
  `select`, `url`, `tel`, `number`, `slider`, `multi-select`, `checkbox-group`, `datetime`, `switch`,
  `segmented`, `cascader`, `table`, `tree`, `storage-size`, `upload`, `link-target`, `dimension`, `color`,
  `money`, `country`, `address`, `flags`. The Asset Module
  owns `media-asset` (below); it is not part of the shared registry.
- A `select` field may be emptied when its `config.allowClear` is `true`, for a choice whose empty answer
  means something ("the Site's own language"), and takes a typed value beside its options when its
  `config.allowCustom` is `true`, for a name that is either one already in use or a new one (the CDN
  upload's Name); a `multi-select` takes typed values beside its options when `config.allowCustom` is
  `true`, for a vocabulary that grows by use, such as tags.
- A `number` field states its unit in `config.prefix`, beside the input rather than in the label: a
  symbol nobody translates as a string (`"ms"`), a word as a label reference (`{ kind: "label", key,
  fallback }`) read from the Form's labels like the field's own label.
- That list is closed, and it is the only place a new field kind is added -- here for a kind every Form
  may want, or in the owning Module's `formProviders` for one only that Module wants. A bespoke input
  inside a Widget, a panel written beside the Form, or a client component that collects values and posts
  them itself is not an alternative to a field Provider; it is the same work without the descriptor, the
  validation, the labels, or the reuse. If a kind is missing, say so and have it agreed
  ([AGENTS.md](./AGENTS.md), "Design rules").
- `storage-size` is a byte count shown in megabytes. The value the form carries is bytes at every
  moment -- the Control converts on the way in and on the way out (`components/forms/storage-size.ts`),
  so a handler, a validator and an API payload see the unit a limit is stored and enforced in, and a
  label never has to carry one. A megabyte is 1 048 576 bytes here, which is what every tool that
  enforces an upload limit means by it.
- `money` is an amount of money: minor units in the value, major units on screen. The value is
  - for `config.currency` (an ISO 4217 code), the contract's money `PhisPaymentMoney`
    (`{ currency: "CHF", minor: "1990" }`, `@phis/contracts/payments`), so a handler passes it to a
    payment as it came and knows the currency without a second field;
  - for `config.currencies` (a list of codes), a price list keyed by code (`{ CHF: "1990", EUR: "1850" }`),
    one input per currency in the order listed. A currency left empty is absent from the list, because no
    price and a price of nothing are different answers.

  - for `config.currencyField` (the key of another field of the same Form), the same money as for
    `currency`, in the currency that field holds: a destination's shipping in the destination's currency,
    a promotion's amount in its. Until the field names a currency there is no input; when it names
    another, an amount entered for the old one is cleared, as a dependent choice is when its parent
    changes. A key that is no other field of the Form is refused where the Form is made
    ([Checked where it is made](#checked-where-it-is-made)) and throws when the Form is drawn, and a value
    that is not a code a payment accepts throws in the field.
  - for neither, on a field with an `optionsProvider`, the same price list, its currencies the values of
    the options the Provider answers, in its order -- for a list the Form cannot know when it is written,
    such as the currencies a Shop's destinations name. Each option's value is an ISO 4217 code a payment
    accepts, or the field throws. A currency the value holds and the options no longer name is shown after
    them, so a price nobody offers any more can still be seen and cleared rather than lost on save.

  Exactly one of the four is set: `currency`, `currencyField`, `currencies`, or an `optionsProvider`. `minor` is a canonical integer string, as everywhere in the payment
  contract, and how many places a currency has is its ISO 4217 exponent (`PHIS_PAYMENT_CURRENCY_EXPONENTS`:
  two for CHF, none for JPY, three for BHD), never a fixed hundred. The Control (`PhiMoneyControl`)
  converts on the digits (`helpers/money-amount.ts`), never through a float; it writes the number the way
  the page's locale does once the field is left, shows what was typed while somebody types, rounds to the
  currency's places and brings the amount into `config.min`..`config.max` (whole minor units, `0` and up)
  when the field is left. The currency is its code, on the side the locale puts it ("CHF 12.50",
  "12,50 EUR"); a code nobody translates, so the field has no wording of its own beyond its label. With
  nothing entered the field holds `null` in either shape, so whether empty is allowed is the `required`
  rule -- for a list, "at least one amount". The config is read strictly (`components/forms/money-field.ts`):
  a wrong or missing currency, a bound that is not a whole number of minor units, or a minimum above the
  maximum throws a `PhiConfigError`, and so does a value of the wrong shape, rather than showing it empty
  and saving nothing over it. A currency that comes from another field of the same Form (a destination's
  own currency) is not expressible: the field states its currency in its config.
- `country` is a country of ISO 3166-1 (`constants/countries.ts`, all 249 codes). The value is its alpha-2
  code in capitals (`"CH"`), as Core stores an address's country; the options are the codes named in the
  page's language through `Intl.DisplayNames` and sorted as that language sorts
  (`helpers/country-names.ts`, the locale `usePhiIntlLocale` gives, so the server and the browser draw the
  same list), searchable by name and by code. `config.allowClear` lets it be emptied. Drawn by
  `PhiCountrySelectControl`, the Select Control with that list.
- `address` is one postal address as Core writes it, `PhisSiteAddressInput` of `@phis/contracts/users`:
  `json`, `{ companyName, name, line1, line2, postalCode, city, region, country }`, an empty optional part
  `null`, the country through the `country` Control. The field holds every part to what Core takes
  (`helpers/address-field.ts`: `name`, `line1`, `city` and `country` required, the column widths of
  `phis.site_addresses` -- 256, 32 for the postal code, 128 for city and region -- and a country of the
  list): while a part is not, it holds the Form's submit with the first sentence
  (`formContext.holdSubmit`), and a part says what is wrong with it once it has been left or a submit was
  refused -- under that part only, never again under the whole field. Its words are
  the Form's Label Set's under `PHI_FORM_ADDRESS_LABEL_KEYS` (`components/forms/structured-field-labels.ts`:
  `addressName`, `addressCompanyName`, `addressLine1`, `addressLine2`, `addressPostalCode`, `addressCity`,
  `addressRegion`, `addressCountry`, `addressNameRequired`, `addressLine1Required`, `addressCityRequired`,
  `addressCountryRequired`, and `addressTooLong` with `%1` the part's label and `%2` the most characters),
  each one left out in English. Drawn by `PhiAddressControl`, one row of the Form's template per part
  (name, company, the two street lines, postal code, city, region, country) through `PhiFormFieldPart`:
  the field takes the whole row and each part's label stands in the label column, beside its input or
  above it exactly as the Form's other fields do. The account's two address Forms are its first
  users; a checkout, Accounting and Support place the same field instead of fields of their own.
- `flags` is several yes-or-no answers held as one bit-flag number, the shape every yes-or-no state of a
  Core contract has (`components/forms/flags-field.ts`). Each option's `value` is its bit as a decimal
  number (`"1"`, `"2"`, `"4"`), the value the sum of the bits checked, `0` for none; bits the field does
  not offer are kept as they were. `config.requires` maps an option's value to the option it needs (`{ "4":
  "1" }`): it is offered only while that one is checked and cleared with it. An option that is no bit, a bit
  named twice and a dependency on no option throw, and are refused where the Form is made when its options
  are written out ([Checked where it is made](#checked-where-it-is-made)). Drawn as a checkbox group, one
  option per line.
- `upload` is what somebody attached. Its value is the list of Media Asset ids the finished uploads left
  behind, and with nothing attached the field holds no value at all rather than an empty list, so
  `required` means what it says. The transport is the shared one (`usePhiMediaUpload`), so the Site's
  `max_object_bytes` and `allowed_content_types` are what bind; the field's `kinds`, `maxBytes` and
  `maxFiles` narrow that for one Form and can never widen it. `space` names the Media Space the file
  lands in -- `user` for the viewer's own Space, absent for the Site's -- and the Control's `placeholder`
  is what its trigger says where a Form means other words than the field's own. Everything else the
  field says -- its trigger, the drop hint, the hold while a file is on its way, "no more files" and the
  refusals of the upload -- is Core's `widget:upload` Label Set (`components/media/label-sets/media-upload.ts`),
  which the Form Widget reads for every Form with an upload field (`form-field-labels.ts`) and lays the
  Form's own Label Set over. A Module that places an upload field translates none of it; the same set is what the Media
  folder, the slot upload and the mask picker say their refusals with, and the Media folder and the slot
  upload say their own drop area, state words and messages from it too (its `area_*` keys). Removing an entry takes the id out of the value and
  leaves the Asset where it is, because the file belongs to the person who uploaded it and not to the
  Form. An id that arrived as an
  initial value is shown as an id: resolving a stored Asset to its name needs a reader this field does
  not have, and inventing one inside a field Provider is the thing this section forbids.
  While a file is still on its way the Form's submit is held: the Asset id only enters the value once
  the upload settled, so a submit in between would send the Form without the attachment and leave the
  id for the next draft. A submit during the hold fails on the field the way a rule fails, with the
  Label Set key `uploadPending`, and reaches `onValidationFailed`; the hold is released when the upload
  settles. A field whose Form goes away stops its uploads, and the Server is told `cancelled`, so no
  Asset is finalized that the Form never names.
- `link-target` is one link: none, a Page of an Area, or an address elsewhere
  ([REFERENCES.md](./REFERENCES.md), stable internal targets). Its value is the `PhiLinkTarget` itself
  and `null` for none, so a save that removes a link says so. `config.area` names the Area whose Pages
  are offered -- Public where it names none -- and is written into every Page target, because a Form
  usually stands somewhere else than the link leads. The Pages are the Area's full list, Site Pages and
  the Module Pages the Area answers on today, read from `GET /api/site/page-references?area=<area>`: a
  route the Site answers itself (`gateway/page-references-route.ts`), because only the Area's own Module
  catalog knows its active routes and an Editor render does not carry Public's. It merges them the way the
  Builder's picker does and answers the same tree, to everybody who writes for the Site. The Control is
  the shared link control the Inspector uses (`phi-link-target-control.tsx`), and its wording is the
  Label Set keys in `PHI_FORM_LINK_TARGET_LABEL_KEYS`, falling back to English.
- `dimension` is a width and a height, each a CSS length (`PhiDimensionControl`, a number and its unit per
  half). Its value is `{ width?, height? }` (`PhiRenderableBlockSize`) and `null` when both are empty;
  each half is named by its placeholder. It came for the HTML editor's image popover, whose Size had been
  a Dimension Control with a label of its own (owner, 2026-11-26: a popover is a Form of descriptor fields).
- `color` is one colour, chosen with the colour field the Builder's Inspector uses
  (`PhiColorFieldControl`: its swatch, the Site's palette and the Theme swatches), and holds what that
  field holds (`readPhiColorFieldValue`, `color-field.ts`): a CSS colour as the picker writes it --
  `#rrggbb`, `#rrggbbaa`, `rgb(...)`/`rgba(...)` -- or, where a Theme swatch was picked, the Theme role it
  shows (`var(--phi-color-primary)`, `var(--phi-custom-3)`), which follows the Theme and the mode; `null`
  for none. It is read strictly: any other value -- a number, a colour name, a gradient -- throws rather
  than showing a colour nobody stored. `config.allowClear: true` lets it be emptied. Its `valueType` is
  `string`. One colour only: the Inspector's gradient modes are not offered. Where it holds nothing, the
  swatch shows the Control's default colour, as the Inspector's colour field does.
- `media-asset` is **owned by the Asset Module** (`@phis/ui/modules/asset/form-field/media-asset`,
  `PHI_MEDIA_ASSET_FORM_FIELD_PROVIDER_KEY` in `constants/media-library-provider-keys.ts`, the Foundation's name for it), because
  that Module owns the Media library. It is declared in the Module's `formProviders.fieldTypes` and
  registered in its UI provider, so it costs the shared registry and the Controls entry nothing. The Asset
  Module is active in every Area (`activation: "always"`, MODULES.md), so any Form may use it; it says
  "This field is not available in this area." only where the Module is off because the server part it
  needs is missing (see above; a stored Asset id is kept and sent unchanged). It is one Asset of the
  Site's Media library, for a Form that stores a picture (a logo, a
  cover) rather than receiving a file -- `upload` is the field for files a Form receives as attachments,
  while this field's picker brings a new file into the library only to choose it (below). The value is
  the Asset id as a number and `null` for none, so a save that removes the picture says so and `required`
  means "an Asset". The field shows the chosen Asset as a preview with its name; "Choose" (or "Change",
  once there is one) opens the library's own picker -- the same binding the Theme logo and the Inspector's
  image field run on (`usePhiMediaPickerBinding`) -- and "Remove" empties the field. An id that arrived as
  an initial value is read through the Asset detail route (`GET /api/site/media/<id>`), which needs the
  Media access the picker needs itself; where that read is refused the field shows the id, says the file
  could not be read, and still lets it be changed or removed. Settings, read strictly
  (`plugins/runtime-modules/asset/media-asset-field.ts`: a wrong value throws a `PhiConfigError` naming the setting):
  - `mediaType`: the kind the picker lists, one of `image` (the default), `video`, `audio`, `pdf`,
    `markdown`, `font`.
  - `publicOnly`: `true` greys out the Assets that are not public and ready (the list states
    `deliveryPolicy` and `lifecycleStatus` for each Asset, and `isPhiMediaAssetPublic` is the question), so
    they stay visible but cannot be chosen; the field says nothing beneath itself about it. An already
    stored Asset that is not public is flagged beside the preview. Core delivers every Asset of the Site
    Space -- the only Space the field offers -- publicly from the start (`defaultMediaDeliveryPolicy` in
    phis-server; only a personal or a group Space restricts), so in this field it catches nothing but an
    upload still under way or failed. No list filter for the delivery is needed for it.
  - `folderPath`: the Folder of the Site Space the picker opens on, by its path of names from the root
    (`"Shop Images / Products"`, read like `area-upload`'s). Each time the picker opens the path is read
    and nothing is written (`readPhiMediaUploadFolderPathReach`, `GET /api/site/media/folders` -- the
    Media read the listing needs anyway), so somebody without Media write authority opens and picks
    without a refusal; the listing waits for it. The picker opens on the deepest Folder of the path that
    is there, the root where none is. While it stands there and the path goes further, an upload goes into
    the whole path: the missing Folders are created then, as `area-upload` creates them
    (`resolvePhiMediaUploadFolderPathId`, `POST /api/site/media/folders` per missing name), and the picker
    shows the Folder the file landed in. Once the author moves to another Folder, an upload goes there. A
    failed read is said above the tiles and the picker opens on the root. Empty or absent: the picker
    opens on the Folder it showed last, at first the root.

    A name may hold placeholders, `{key}`, filled from the Form's values as they are when the picker
    opens -- what the author typed and what the Form loaded from its record alike
    (`formContext.getValues()`; a dotted key reads into a value that is a record):
    `"Shop Images / {category} / {product}"`. A value is a text or a number, trimmed; a `/` in it becomes
    `-`, so a value names a Folder and never adds a level. A name whose placeholder has no value --
    absent, empty, anything else -- is left out whole: without a category the path is
    `"Shop Images / <product>"`. The path resolved on opening is the one an upload from there creates and
    goes into (`resolvePhiMediaFolderPathTemplate`, `components/media/media-folder-name-path.ts` -- the
    same rules the Media renderer of a Collection View fills its `features.media.folderPath` by, from the
    View's binding params). A brace that opens no placeholder (`{}`, `{a`, `a}`) is a `PhiConfigError` on
    `config.folderPath`.

  The field offers the **Site Space only**, in every Area: there is no Space selector, and the query names
  no Space, which Core answers with the Site Space. A picture whose id is stored for everybody who reads the
  value has no business in somebody's personal or a group's Space. This and `publicOnly` are the interface.

  **Upload in the picker.** Beside Reload the picker has an Upload button that shows the Media library's
  own upload surface above the tiles (`PhiAreaUploadBinding`, the drop area, one file): one file from the
  author's machine goes into the Folder the picker shows (the root where it shows none), through the
  upload every surface sends with (`usePhiMediaUpload`, Core's `POST /api/site/media/uploads/init` with
  that `folderId`, the bytes, finalize), and the Asset it made is chosen as a picked tile is and the
  picker closes. The file dialog offers the field's `mediaType`. The rules that bind a pick bind the
  upload:
  - **Space.** The upload names no Space, which Core answers with the Site Space -- the only one the field
    offers (`siteSpaceOnly`). The button is shown only while the picker stands on the Site Space, as an
    import's switch is.
  - **`publicOnly`.** Core gives an Asset of the Site Space the public delivery from the start
    (`defaultMediaDeliveryPolicy` in phis-server); the init takes no delivery policy, so the field asks for
    none. What comes back is asked what a listed Asset is asked (`readPhiMediaAssetFieldUploadRefusal`):
    one that is not public and ready is not chosen; it stays in the list greyed out and the field says
    `mediaAssetNotPublic`. The same holds for an Asset of another kind than `mediaType` (a file whose type
    the browser could not name reaches Core unrefused), which reads as the upload's type refusal.
  - **Refusals** read as every upload's do (`readPhiMediaUploadErrorMessage`), said as the upload
    surface says them (an application message, the failed file in the panel with its retry): too large,
    the wrong type, no room, and a locked Folder (`folder_locked` from the init, `media_folder_locked` from
    a Folder an upload into `folderPath` would create) as the lock refusal. That the Asset that arrived
    cannot be chosen is said above the tiles.
  - While the file is on its way the Form's submit is held (`formContext.holdSubmit`, the upload field's
    `uploadPending` sentence), and closing the picker stops it; nothing is chosen afterwards.
  - **The Add-on's Media limits.** A Form of a Module bound to an Add-on whose manifest states `media`
    (`maxFileBytes`, `kinds`, `maxPerField`; phis-server SERVER_ADDONS.md, "Media limits") applies them
    here: the Form Widget reads them off the Add-on's entry in the capability snapshot
    (`PhiCapabilityProvider.media`, by the Form's own Module's server binding `providerId`,
    `resolvePhiFormMediaLimits` in `components/forms/form-media-limits.ts`) and hands them to every field
    as `mediaLimits` (`PhiFormFieldProviderProps`). A file larger than `maxFileBytes` is refused before it
    is sent as too large (the upload's `maxBytes`), and where `kinds` leaves out the field's `mediaType`
    every file is refused as of a type not allowed (`refuseFile`) -- the upload's own refusals, in its
    Label Set. A Form of a Core-bound Module, or of an Add-on that states none, has no limits beyond
    Core's. The Form's Module decides, not the field's: this field belongs to the Media library and stands
    in Forms of any Module, and the limits are those of whoever stores the value.
  What is enforced is enforced by the Server that takes the value: a handler that must hold the line reads
  the Asset (its Space and its delivery policy) before it stores the id, because a request does not have to
  come through this field -- an Add-on enforces its Media limits there again. The handler receives the id
  as a JSON number (`{ "logo": 42 }`, or `null`).
  Wording is the Label Set keys in `PHI_FORM_MEDIA_ASSET_LABEL_KEYS` (`mediaAssetChoose`,
  `mediaAssetChange`, `mediaAssetRemove`, `mediaAssetNotPublic`, `mediaAssetUnavailable`), falling back
  to English. The picker's own wording is the Media Label Set's (`widget:media`, the Upload button its
  upload toggle, `mediaAssetPickerUpload`; the upload surface's drop area, states and message
  `widget:upload`'s `area_*`, under `mediaAssetPickerUploadDropTitle`, `...DropHint`, `...Retry`,
  `...Done`, `...Failed`, `...Success`): the Form Widget reads it
  for every Form with a `media-asset` field (`form-field-labels.ts`) and hands it to the control under
  `PHI_FORM_MEDIA_ASSET_PICKER_LABEL_KEYS` (`components/forms/media-asset-field-keys.ts`), and with it the
  upload's refusals and hold from `widget:upload` under the upload field's keys
  (`PHI_FORM_UPLOAD_LABEL_KEYS`), so a Module that places the field translates none of it. A Page
  that renders a Form with a `media-asset` field mounts the Media library Provider for it
  (`PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.collection`; the resolver's scan of the Form's descriptor), where a
  Module of the Area serves it -- the Asset Module, which is also what makes the field available. The
  field's picker sends nothing to the Asset Controller, so a Form with this field mounts no Controller
  for it. Other ways a file goes into a Folder are the Asset Module's `area-upload` Widget (the Folder its
  `folderPath` names, or the one its Controller holds) and the Media page
  ([THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md#media-what-the-asset-module-already-does)).

  ```ts
  {
    key: "logo",
    fieldProviderKey: PHI_MEDIA_ASSET_FORM_FIELD_PROVIDER_KEY,
    label: label("logo", "Logo"),
    config: { mediaType: "image", folderPath: "Shop Images / Products" },
    validation: required("logoRequired", "Choose a logo."),
  }
  ```
- `media-assets` is the many-picture counterpart of `media-asset`: **several Assets** of the Site's Media
  library for a record that has several (a product's gallery, a post's pictures, a team's portraits),
  edited inside the record's Form -- so the Form gives the draft, the dirty state, Save and Cancel and the
  validation, and the handler receives the list on save. It is **owned by the Asset Module** on the same
  terms (`@phis/ui/modules/asset/form-field/media-assets`, `PHI_MEDIA_ASSETS_FORM_FIELD_PROVIDER_KEY` in
  `constants/media-library-provider-keys.ts`, declared in the Module's `formProviders.fieldTypes`, the
  control loaded when the field first renders). Its value is the Asset ids **in the order shown**, a JSON
  list of numbers (`valueType: "json"`, as the `upload` field's list of ids is: the Form contract's value
  types have no list of numbers), and `[]` for none, so a save that removes every picture says so and
  `required` means "at least one" (Ant Design's required rule refuses an empty list). A value is read
  leniently into ids (`readPhiMediaAssetsFieldValue`): entries that are not positive whole numbers are
  dropped, an id held twice is held once. A list that acts at once, every action written as it is
  taken, is not this field but a Collection View with the Media renderer
  ([COLLECTIONS.md](./COLLECTIONS.md#the-media-renderer)).

  The field is drawn from what that renderer draws, not a copy of it: the Media tiles in the Collection
  Control (`PhiMediaAssetTileControl` in `PhiCollectionViewControl`), and above them "Choose from Media
  library" and Upload.
  - **Remove** is each tile's delete button: it takes the id out of the value and does nothing else -- no
    confirm, no request, nothing released. What happens to an Asset no longer named is the handler's to
    decide on save.
  - **Order** is the Collection's own drag handles (`PhiCollectionReorderContext`, pointer and keyboard,
    from two tiles on): the order dropped is the value's new order.
  - **Choose from Media library** opens the library's picker (`usePhiMediaLibraryAddPicker`, the one the
    Media renderer's toolbar action `add` opens): the Site Space only, the field's `mediaType`, on the
    Folder `folderPath` names. A pick joins the value at its end; an Asset the value holds already is
    greyed out.
  - **Upload** opens the Media library's multi-upload wall (`PhiAreaUploadBinding`) between the buttons and
    the tiles, into the Folder `folderPath` names (the missing Folders created on the first upload), in the
    Site Space. Each Asset that arrived leaves the wall and joins the value at its end, so nothing shows
    twice; one of another kind than `mediaType` (a file the browser could not name reaches Core unrefused)
    is not added and the field says the upload's type refusal. While a file is on its way the Form's
    submit is held (`formContext.holdSubmit`, the upload field's `uploadPending`); closing the wall stops
    what is on its way.
  - **Tiles** for the ids the field has no tile for yet -- an initial value -- are read in one request:
    the Media list with the ids repeated (`GET /api/site/media?id=1&id=2…`, at most 100, the usual list
    shape), through the Media library's collection Provider (`filters.id`, the ids as a list). They are
    shown in the value's order, not the answer's; an id the list does not answer (released, or not the
    reader's to see) is an unavailable tile, named `mediaAssetsUnavailable`, that can still be removed. A
    pick or an upload brings its own tile, so adding reads nothing.

  Settings, read strictly (`plugins/runtime-modules/asset/media-assets-field.ts`, a wrong value is a
  `PhiConfigError` naming the setting):
  - `mediaType` and `folderPath`: as `media-asset`'s, read by the same reader
    (`readPhiMediaFieldTarget`). The `{key}` placeholders are filled from the Form's values when the picker
    or the upload opens, so a product's pictures go to `"Shop Images / {category} / {product}"` of that
    product.
  - `max`: the most Assets the value holds, a whole number from 1 to 100 (`PHI_MEDIA_ASSETS_FIELD_MOST`,
    the most the list answers by id in one read), 100 where none is named. Once the value is full neither
    the picker nor the upload is offered; a file the value has no room for, counting those on their way,
    is refused before it is sent, and a pick beyond it is not added -- both say `mediaAssetsTooMany`. A
    value beyond `max` (one that came in) holds the Form's submit with the same sentence, shown on the
    field. A Module whose records allow so many pictures states it here.

  **The Add-on's Media limits** apply as in `media-asset` (above, `mediaLimits`): `maxFileBytes` and
  `kinds` refuse a file before it is sent with the upload's own refusals, and `maxPerField` is the most the
  value holds where `max` would be higher (`limitPhiMediaAssetsFieldConfig`): a field's own `max` may be
  lower than the Add-on's, never higher, and everything `max` governs -- full, the refusal of a file
  beyond it, the hold on a value beyond it, `mediaAssetsTooMany`'s `%1` -- reads the lower of the two.

  There is no `publicOnly`: the field offers the Site Space only, and Core delivers every Asset of the Site
  Space publicly from the start (`defaultMediaDeliveryPolicy` in phis-server). As with `media-asset`, what
  is enforced is enforced by the Server that takes the value: the handler checks the Assets (Space, kind,
  how many) before it stores them. The handler receives the ids as a JSON list of numbers
  (`{ "images": [42, 17, 8] }`, `[]` for none). Wording is the Label Set keys in
  `PHI_FORM_MEDIA_ASSETS_LABEL_KEYS` (`mediaAssetsRemove`, `mediaAssetsReorder` for the drag handle,
  `mediaAssetsUnavailable`, `mediaAssetsTooMany` with `%1` for `max`), falling back to English. The buttons,
  the picker and the upload wall say the Media Label Set's words, which the Form Widget reads for every Form
  with a `media-asset` or a `media-assets` field and hands over under
  `PHI_FORM_MEDIA_ASSET_PICKER_LABEL_KEYS` ("Choose from Media library" as
  `mediaAssetPickerChooseFromLibrary`, Upload as `mediaAssetPickerUpload`), with the upload's refusals and
  hold under the upload field's keys. A Page that renders such a Form mounts the Media library Provider for
  it, as for `media-asset`.

  ```ts
  // A Shop product's gallery: the pictures in order, at most twelve, in the product's own Folder.
  {
    key: "images",
    fieldProviderKey: PHI_MEDIA_ASSETS_FORM_FIELD_PROVIDER_KEY,
    label: label("images", "Pictures"),
    config: { mediaType: "image", folderPath: "Shop Images / {category} / {slug}", max: 12 },
  }
  ```
  The handler that saves the product receives `images` as `number[]` and writes the gallery in that
  order: the Assets now named in, the ones no longer named out (released or kept, its decision).
- A field Provider whose value is only complete later holds the submit itself through
  `formContext.holdSubmit(fieldKey, reason)` and releases it with `null`. `PhiFormControl` refuses a
  submit while any hold stands; the handler is not called. The reason is written under the field, unless
  the hold passes `onRefused` (`holdSubmit(fieldKey, reason, onRefused)`): a field whose parts each say what
  is wrong with them -- the address -- is called instead, and shows every part's own sentence.
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

### Checked where it is made

What a field's Control would throw on while a page is drawn is checked where the Form is made (owner,
2026-11-24), by `checkPhiPresetForms(forms)` from `@phis/ui/module/page-check`
(`components/forms/form-descriptor-field-check.ts`): a `money` field's config as the Control reads it --
exactly one of `currency`, `currencyField`, `currencies` or an `optionsProvider`, every currency stated an
ISO 4217 code a payment accepts, whole minor-unit bounds -- and a `currencyField` naming another field of
the same Form; a `flags` field's written options as bits named once, with `requires` naming two of them.
Each finding names the Form id. A package runs it in its tests over every Form it ships, as phis-ui runs it
over its own (`plugins/runtime-modules/preset-text-sources.test.ts`); a Site never loads it. A rule naming
a validation Provider no active Module declares is refused by catalog construction
(`plugins/runtime-modules/resolver.ts`), which knows the Area's Providers. Values that only arrive at
runtime -- the currency another field holds, the options an Options Provider answers -- are still read
strictly by the Control, which throws rather than guess.

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
  `requiresCsrf` is set. `csrfPath` names the Core endpoint that issues the token; the relay does not
  call it, because the token has to be the browser's (see [Relay](#relay)).
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

### Request shape

A Form's values are sent as the body, one per field, each in the shape its field holds -- an `address`
field's object, a `flags` field's number -- so a field that delivers the shape a Core route takes needs
nothing of the handler. One thing a value cannot be is part of the address: a `{key}` segment of
`upstreamPath` is the value of the field `key`, trimmed and percent-encoded, and that field leaves the body
(`gateway/form-handler-request.ts`). A path value that is empty, or neither text nor a number, refuses the
submit with 400 before anything is sent: without it the address is another route. Catalog construction
refuses a path that names one field twice.

The account's address book is the first user: `POST /api/site/account/addresses` and
`PUT /api/site/account/addresses/{id}` take `{ address, flags }`, which the App's two address Forms hold as
an `address` field and a `flags` field, the change with the hidden `id` of the version it replaces.

```ts
{
  // ...the descriptor fields above
  method: "PUT",
  upstreamPath: "/api/site/account/addresses/{id}",
}
```

## Form Widget

The Form Widget (`@phis/ui/modules/core/widgets/form`, `plugins/runtime-modules/core/widgets/form/`) is
the only way a Form is placed. There are no domain Form Widgets. Its config:

| Field | Meaning |
| --- | --- |
| `formId` | The Form to render. |
| `submit` | `inline` or `external` (default). `inline` draws the button the descriptor's `submit` describes; `external` draws none, and the Form is submitted through its `submit` input or by Enter. |
| `submitOnEnter` | Whether Enter in a single-line field submits. Unstated, it is on in a dialog's body (a Modal Overlay) and off anywhere else: a dialog asks one question, while a second Form or a search on a page or in a Drawer gives Enter more than one meaning. A placement that states it wins either way. |
| `controlSize` | `small` or `medium` (default). How large the Form draws its fields, their labels and its submit ([Size](#size)). |
| `card` | `{ presentation, title, padding }` or absent. The box the Widget draws around the Form, its submit and its links: `card` on a Page of its own, `panel` for the smaller inset of chrome, `wash` for a ground without a frame. Absent is no box, no ground and no inset. |
| `feedback` | `{ mode, successText? }` or absent. Absent answers in place. `mode` is `message` (a transient message) or `notification`; `successText` is what a success says where the descriptor's `success` says nothing. Set, it moves the answer out of the Form rather than adding one. |
| `links` | `[{ key, href, requiresFeature? }]`, drawn below the submit. The text is `actions.<key>Label` of the Form's label set; a link whose `requiresFeature` is not published by an active Module is left out. |
| `formConfig` | Placement config: `initialValues`, `initialValuesFromQuery`, values read by `config` text, and values an `optionsProvider` reads (see [Fields](#fields)). |
| `execution` | `{ mode: "handler" \| "signal", phase: "submit" \| "confirm" }`, default `handler` / `submit`. |
| `source` | Optional Table or Collection Provider binding `{ providerKey, resourceKey, params }` whose resource declares `recordRead: true`. |
| `openActionKey` | The action key that opens a record -- a Table's row action or a Collection View's item action -- default `edit`. |
| `titleFromRecord` | Optional `{ template, field }`: a title made of the record the `source` reads, announced on `recordTitle`. See below. |
| `signalRoutes` | The Widget's routes. |
| `maxFormWidth` | How wide the form itself may get, measured at the fields rather than around the box. Defaults to `PHI_LAYOUT.contentMax`; see below. |
| block geometry | `maxSize`, `minSize`, `size`, `surface` -- read from the node like any other Widget. They measure the block the slot frame draws, which is the box *around* the Form's own. |

- **A Form is capped at the reading measure unless the placement says otherwise.** `maxFormWidth` is
  declared as `PHI_LAYOUT.contentMax` (610) in the Widget's `defaultConfig`, the measure
  [THEME.md](./THEME.md) names for a labelled form, and it is a ceiling rather than a width: the Form
  still fills a narrower slot edge to edge, and 610 is exactly where its own layout switches to `wide`,
  so capping never demotes the layout. A cap is also not a size -- it leaves the slot policy
  `fill-inline` and the Layout in charge of placing the Form. It is declared in `defaultConfig` for the
  Builder, which writes it into the node it creates, and for the Inspector, which shows it under the node
  it edits -- and answered again by the parser for the render path, because only a Widget's *block base*
  is merged under a node that states nothing (`widgetBlockDefaultsByType`). A Widget field of its own
  reaches a Preset placement no other way; that is the same gap that once left every Preset-placed Form
  uncapped. Both sides name the one constant. A placement that means something else names a length
  and wins -- `contentMaxNarrow` for a column of Controls with no label beside them, the Page's width
  (`PHI_PAGE.max`) for a Form read across, `100%` for a Form that takes its slot, such as a reply under a conversation that
  runs the page. "No ceiling" is spelled `100%`, because that is what every other block says.
- **The cap measures the fields, not the box around them.** It is the Form's own field and deliberately
  not the block's `maxSize`, which is where it stood until the Widget grew a box. A block cap is drawn by
  the slot frame on the outermost element, so every inset inside it -- a Card's, a Wash's -- comes off the
  width the fields are left with *and* off the width their container query measures: a Form capped at 610
  in a `card` handed its fields 568 and was laid out as a 568 form, one step below the threshold the cap
  was chosen to land on, so `wide` could not be reached from inside a box at all. The Frame therefore adds
  the box's chrome back on -- its inset, plus the Theme's line where the box has a frame -- and the box
  ends up wider than the cap: a 610 form in a `card` is a 652 card. Both caps stay available and they
  measure two different boxes; `min(100%, ...)` keeps either from pushing out of its slot.
- **The capped box is placed by the Layout above it.** Because the cap sits one box inside the frame, the
  frame still fills the slot, and the placement margins the slot hands down (LAYOUTING.md, "Sizing and
  nesting") find no room there. The capped box reads the same properties -- custom properties inherit --
  so a Form under a Layout anchored to the centre is drawn centred and one under a Layout anchored to the
  start keeps the start edge it always had. Without it the Login page drew its 377-wide form in the top
  left corner of a card whose Layout asked for the middle.
- The box around a Form is `card`, never a panel built beside it. It is `PhiCardControl`, so the ground,
  the frame, the inset and the corner are the Theme's -- `Card` is one of the surfaces the Theme's shape
  reaches through a component token ([THEME.md](./THEME.md)), which a hand-built box is not. It wraps the
  submit and the links as well as the fields, because a button outside the box it submits reads as
  something else's button. `title` is a heading in the box's own bar, already translated by whoever placed
  the Form, and `padding` is only for where the Theme's inset for this box is wrong. Absent stays absent:
  a Form placed before this existed is unchanged.
- The three presentations are one ladder -- how far the box sets itself off from what is behind it -- and
  each step is stated once. `card` and `panel` share the Theme's container ground and its frame and differ
  only in the inset (`padding` against `paddingSM`), because the inset already says how deep the box sits
  and a second ground would say it again. `wash` is the step below both: `colorFillQuaternary`, the
  quietest filling the Theme has, the surface step for a corner, no frame, and the base inset -- the one a
  Collapsible's body takes, because a filled area holding fields is a body rather than chrome -- so the
  ground does not run flush into the labels. It is for a Form that already stands on a container.
- Absent is the fourth step and the default: no ground, no frame, no inset. A Form in a Split Card half --
  the Login and its siblings -- is there, and the Layout in that half already paints the card's ground, so
  a box would be a plate inside a plate. Absent is also the only state in which the Form's cap and the width its fields read are
  the same measure: every inset sits between the two, so a Form capped at `contentMax` reads 610 flush and
  568 inside a `card`, which puts it one layout mode below the cap it was given.
- The Widget resolves the definition on the Server, loads labels and `loadInitialValues`, wraps the body
  in the owner Module's UI provider, and renders `PhiFormControl` in a client host.
- **Fields in front of work that is no submit.** One Widget draws a registered Form itself: the CDN's
  upload (the CDN Module's `cdn-upload` Widget), whose file is divided, hashed and sent from the
  browser before anything could be submitted. Its fields are still the registered Form
  `@phis/ui/modules/cdn/forms/upload` (no handler), drawn by `PhiFormControl` with the Form's labels, so
  they stand where every Form's do; the Widget reads the values (`onValuesChange`), fills them from the
  picked file (`onFormReady`'s instance) and sends the file with them, and the Form is never submitted.
  The Widget states the Options Provider the descriptor names in its `requiredDataProviders`, since the
  page's demand scan reads only a placed Form Widget's descriptor. Anything that is a submit is a Form
  Widget.
- `handler` mode submits through the Form controller and the [Relay](#relay). `signal` mode keeps the
  Form local: a valid submit emits `submitValues` with `{ values }` and `submitSuccess`, and calls no
  gateway. A signal-mode Form may have no `submitHandlerKey`.
- The Widget-drawn submit and Enter are senders on the same submit path, not other paths. Buttons outside
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
  `loadInitialValues`. A record read through `source` lays its values over the configured ones: it answers
  for the fields it carries, and a field it knows nothing about keeps the placement's value -- Core's Reply
  Form reads its thread from a record and keeps the placement's `internalAllowed`. With `source` and an `openActionKey`, a Table action with a row identity
  arriving on `recordOpen` loads that record; without `openActionKey` the record is read once on mount.
  After a successful handler submit the last opened record is read again.
- **A record opened from a Collection View.** `recordOpen` also takes a Collection View's item action,
  `action/activate:json<collection-action>` (`{ actionKey, itemKey }`, `PhiCollectionActionSignalValue`):
  the Form keeps it when `actionKey` is its `openActionKey`, takes `itemKey` as the record's key and reads
  the record through the same `source`. The source is then a Collection Provider's resource that declares
  `recordRead: true`, and its Client has `readRecord` -- the Table Provider's record read, in its request
  shape (`PhiCollectionProviderRecordRequest` is `PhiTableProviderRecordRequest`: `rowIdentity` the item's
  key) -- which `createPhiCollectionProviderClient` requires of such a resource
  ([COLLECTIONS.md](./COLLECTIONS.md#provider-resource)). A Provider key names one kind, so the Form asks
  the Table Provider under it where there is one and the Collection Provider otherwise
  (`resolvePhiFormRecordSource`, `components/forms/form-record-source.ts`). The two are one capability
  declared twice, once per schema, as SIGNALS.md allows inputs that differ only in their schema; the
  Builder's wiring offers `recordOpen` for a Collection View's `actionActivate` and writes the route under
  `collection-action`, and the Inspector's Record source lists Table and Collection Providers. The Overlay
  around the Form opens on the same announcement (`openActionKey`, [OVERLAYS.md](./OVERLAYS.md)), and a
  Settings shell dialog says so with `openValueSchema: PHI_SIGNAL_VALUE_SCHEMAS.collectionAction`. The App
  profile's addresses are the first user: a tile's Change opens the change dialog on that address.
- **A record dialog is named by its record.** `titleFromRecord` takes a Form text with `%1` once, in the
  Form's label set like its other texts, and the record field whose value stands there. After every read
  the Form announces the sentence on its `recordTitle` output -- the value as the record has it, never
  translated -- and an empty one as a row is asked for and where the record has no value for it. The Page
  routes `recordTitle` to the Overlay's `title` input (OVERLAYS.md), which shows its own title for an
  empty one; the Form does not look for its Overlay. The create dialog's Form has no record and no
  `titleFromRecord`, so its dialog keeps its title. The descriptor compiler refuses the option without a
  `source`, without a `recordTitle` route, with a field that is not one of the Form's (a record answers for
  the Form's fields: a value only the title reads is a hidden field), and a route to an Overlay of the tree
  that does not listen on its `title`:

  ```ts
  // On the Form placement, beside source and openActionKey:
  titleFromRecord: { template: { kind: "label", key: "galleryOf", fallback: "Gallery: %1" }, field: "product" },
  signalRoutes: { emits: [{ routeKey: "gallery-title", capabilityId: "recordTitle", scope: "page",
    channel: "title", action: "change", valueType: "string", receiver: overlayAddress }] },
  // On the Overlay: { routeKey: "gallery-title-in", capabilityId: "title", scope: "page", channel: "title",
  //   action: "change", valueType: "string", receiver: overlayAddress }
  ```
- What a placement only knows at run time -- the group selected in a Table next to the dialog -- is asked
  for, not pushed: the Form sends `valuesRequest` once as it mounts, and whoever knows answers `valuesSet`.
  A dialog with `mountPolicy: "remount"` holds no Form when the choice is made, so a value sent then
  would reach nobody. The answered values are laid over the start values, not into them: a reset returns
  to what the Form had before. Admin Groups starts its membership Form in the selected group this way.
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
| `recordOpen` | `action/activate` | `json`, `table-action` schema, or `collection-action` (a Collection View's item action; see above) |
| `close` | `dialog/close` | `none`; resets the Form and emits `cancel` |
| `reload` | `reload/activate` | `none`; reloads the open record |
| `valuesSet` | `values/change` | `json`, `form-values` schema; lays the values over the named fields without making the Form dirty |
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
| `valuesRequest` | `reload` | `none`; sent once on mount, answered with `valuesSet` |
| `recordTitle` | `change` | `string`; after every record read with `titleFromRecord`, empty as a row is asked for or without a value |

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

**A value a neighbour holds reaches a field through this Controller.** `values/change` and `field/change`
are that path: the Controller hands what it hears to the Form it belongs to, which writes it with
`setFieldsValue` or `setFieldValue` (`components/forms/runtime-form-binding.ts`). It is how a chosen
conversation reaches a hidden field and a dragged focal rectangle reaches the Media metadata Form. Three
things follow. The receiver is the Controller address, not the Widget's. The sender emits its own value and
the route names the field it lands in -- `fieldKey`, which only a `form-field` route may carry
([SIGNALS.md](./SIGNALS.md)) -- so a Widget is never written against one Form's field names. And a value
written this way is not an initial value: a `reset` returns the field to the descriptor's, so whoever sent
it asserts it again after a submit that resets.

A record read is the other way a placed Form is filled, and the two do not mix: a read remounts the Form
with new initial values, which discards anything written in. A Form acting on a neighbour's selection takes
the value; a Form editing a record takes the record.

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
- A token the handler refused as expired (code `form_expired`, `PHI_FORM_GUARD_EXPIRED_CODE`: the Form
  stood open past phis-server's `forms.timeouts.maxSubmitMs`) is dropped and a fresh one is asked for at
  once, so the next submit carries it. The refused submit is not repeated by itself: a token that new is
  one the handler reads as too fast. A handler that answers expiry with a silent success instead of
  `form_expired` gives the browser nothing to renew on, and loses the person's submission.
- The guard answer carries the window as durations, `minSubmitMs` and `maxSubmitMs`, which the browser
  measures on its own clock (`PhiFormGuardLease`: ready from when the answer arrived, expiring from when
  it was asked for). A submit within a minute of expiry asks for a fresh token first, and a submit before
  a token is ready waits for it, so a Form left open or sent at once is not refused for either.
- The relay issues a token only for a Form whose submit handler is active in the Area the page names
  (`&area=<area>`, see [Relay](#relay)), and forwards no cookie to phis-server's `/api/v1/forms/guard`.
  A refusal is a wiring fault.

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

- `POST /api/site/forms` with `{ formId, phase: "submit" | "confirm", area, values }`, and the
  browser's CSRF token in `x-csrf-token`. Nothing else in the body is read. The browser does not send a
  submit without the token: a token it cannot read fails the submit on the `error` channel with the
  token's own message, instead of a refusal from the handler the Form could only show as a generic error.
- `GET /api/site/forms?phase=guard&formId=<id>&area=<area>` issues a guard token.
- `GET /api/site/forms?phase=preview&formId=<id>&token=<token>&area=<area>` reads a preview through the
  Form's `preview` handler Provider.

The browser side is `PhiRuntimeFormControllerMount` for a submit, `requestPhiFormGuard` for a guard and
the Form Preview Widget for a preview. `area` is the Area partition the Form is mounted under
(`usePhiFormRelayArea`, `components/forms/form-relay-area.ts`); on the Builder canvas it is absent, so a
Form drawn there resolves nothing. A submit sends the `phis_csrf` cookie's value as `x-csrf-token`,
fetching `/api/auth/csrf` first when the browser has none (`readPhiCsrfToken`, `helpers/csrf-token.ts`);
a submit without one still goes out, and only a Provider that declares CSRF refuses it.

Resolution for every request (`gateway/form-handler-resolution.ts`):

1. The Area is the one the request names (`area`), and it must be an Area key the Site hosts (its
   Bridge loader answers a catalog) whose `accessPolicy` admits the viewer -- the check the Area's Layout
   makes before rendering. The `Referer` is not read: a browser may omit it, and a page's own script can
   set it. The locale the Area is read in is what the Site resolves for the request (`phis_locale`, the
   account, `Accept-Language`, the Site default), always one of the Site's locales, never a path
   segment. An endpoint, Module id, or anything else in the request is never read.
2. The Area's Module selection gives the active Module set: its `runtimeModules` (stored apart from the
   Area's structure, [CMS.md](./CMS.md#the-areas-module-selection); the Area's defaults when none is
   stored), the Area's locked base Module, and the server capability snapshot. Which shell the Area draws
   plays no part in it.
3. The Form resolves from that set as in [Registry and identity](#registry-and-identity). Its owner must
   be active.
4. The handler key for the phase selects the Provider with the same `phase` and `handlerKey`; its owner
   must be active.

Any failure answers `404` with "Form handler is not active for this Area.".

Dispatch for `submit` and `confirm`: the relay builds the target from the Provider, removes the browser
`Cookie` and `x-csrf-token` headers, and adds only the cookie `credentialPolicy` allows. When
`requiresCsrf` is set it forwards the browser's own CSRF proof unchanged -- its `x-csrf-token` header and
its `phis_csrf` cookie -- and answers `403` "Invalid CSRF token." without an upstream call when either is
missing or they disagree; phis-server compares the same pair again (`verifyCsrfRequest`). The relay never
asks `csrfPath` for a token of its own: a pair it minted would pass that comparison for any page that
reached the relay. It sends `values` as JSON with the Provider's method and returns phis-server's status,
body, and every `Set-Cookie` header, including a CSRF token phis-server rotates at sign-in.

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
