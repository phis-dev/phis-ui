import type {
  PhiFormFieldTypeProviderDescriptor,
  PhiFormProviderKey,
  PhiFormValidationProviderDescriptor,
} from "../../types/form-descriptor";
import { createPhiModuleScopedKey } from "../../constants/runtime-module-ownership";
import { PhiMediaKind } from "../../constants/media";
import { PHIS_PAYMENT_CURRENCY_EXPONENTS } from "@phis/contracts/payments";
import { PHI_FORM_UPLOAD_FIELD_PROVIDER_KEY } from "./upload-field-keys";
import { PHI_FORM_TABLE_FIELD_PROVIDER_KEY } from "./table-field-keys";

export function createPhiSharedFormProviderKey(
  kind: "field" | "validation" | "handler",
  key: string,
) {
  const normalizedKey = key.trim();
  if (!normalizedKey || normalizedKey.includes("/") || normalizedKey.includes(":")) {
    throw new Error(`Invalid shared form provider key "${key}".`);
  }
  return createPhiModuleScopedKey(`form-${kind}`, normalizedKey) as PhiFormProviderKey;
}

export const PHI_FORM_FIELD_PROVIDER_KEYS = {
  text: createPhiSharedFormProviderKey("field", "text"),
  email: createPhiSharedFormProviderKey("field", "email"),
  password: createPhiSharedFormProviderKey("field", "password"),
  textarea: createPhiSharedFormProviderKey("field", "textarea"),
  hidden: createPhiSharedFormProviderKey("field", "hidden"),
  honeypot: createPhiSharedFormProviderKey("field", "honeypot"),
  checkbox: createPhiSharedFormProviderKey("field", "checkbox"),
  select: createPhiSharedFormProviderKey("field", "select"),
  url: createPhiSharedFormProviderKey("field", "url"),
  tel: createPhiSharedFormProviderKey("field", "tel"),
  number: createPhiSharedFormProviderKey("field", "number"),
  storageSize: createPhiSharedFormProviderKey("field", "storage-size"),
  slider: createPhiSharedFormProviderKey("field", "slider"),
  multiSelect: createPhiSharedFormProviderKey("field", "multi-select"),
  checkboxGroup: createPhiSharedFormProviderKey("field", "checkbox-group"),
  datetime: createPhiSharedFormProviderKey("field", "datetime"),
  switch: createPhiSharedFormProviderKey("field", "switch"),
  segmented: createPhiSharedFormProviderKey("field", "segmented"),
  cascader: createPhiSharedFormProviderKey("field", "cascader"),
  table: PHI_FORM_TABLE_FIELD_PROVIDER_KEY,
  tree: createPhiSharedFormProviderKey("field", "tree"),
  // Spelled beside its label keys, which the Form Widget reads on the Server without this whole file.
  upload: PHI_FORM_UPLOAD_FIELD_PROVIDER_KEY,
  linkTarget: createPhiSharedFormProviderKey("field", "link-target"),
  dimension: createPhiSharedFormProviderKey("field", "dimension"),
  color: createPhiSharedFormProviderKey("field", "color"),
  money: createPhiSharedFormProviderKey("field", "money"),
  country: createPhiSharedFormProviderKey("field", "country"),
  address: createPhiSharedFormProviderKey("field", "address"),
  flags: createPhiSharedFormProviderKey("field", "flags"),
} as const;

/**
 * The field types whose value is several labelled parts, each drawn as a row of the Form's own template
 * (`phiFormPartProperties`, `.phi-form-parts`). The Form gives such a field the whole row unless its
 * placement says otherwise, and the parts' labels stand in the label column like every other field's;
 * the field draws no label layout of its own.
 */
export const PHI_FORM_PART_ROWS_FIELD_PROVIDER_KEYS: ReadonlySet<string> = new Set([
  PHI_FORM_FIELD_PROVIDER_KEYS.address,
]);

export const PHI_AUTH_FORM_FIELD_PROVIDER_KEYS = {
  termsConsent: createPhiSharedFormProviderKey("field", "auth-terms-consent"),
} as const;

export const PHI_FORM_VALIDATION_PROVIDER_KEYS = {
  required: createPhiSharedFormProviderKey("validation", "required"),
  email: createPhiSharedFormProviderKey("validation", "email"),
  minLength: createPhiSharedFormProviderKey("validation", "min-length"),
  maxLength: createPhiSharedFormProviderKey("validation", "max-length"),
  exactLength: createPhiSharedFormProviderKey("validation", "exact-length"),
  minLetters: createPhiSharedFormProviderKey("validation", "min-letters"),
  matchesField: createPhiSharedFormProviderKey("validation", "matches-field"),
  url: createPhiSharedFormProviderKey("validation", "url"),
  tel: createPhiSharedFormProviderKey("validation", "tel"),
  pattern: createPhiSharedFormProviderKey("validation", "pattern"),
  number: createPhiSharedFormProviderKey("validation", "number"),
} as const;

export const PHI_FORM_HANDLER_PROVIDER_KEYS = {
  authAdminInstallationCreate: createPhiSharedFormProviderKey("handler", "auth-admin-installation-create"),
  authAdminInstallationUpdate: createPhiSharedFormProviderKey("handler", "auth-admin-installation-update"),
  authAdminPolicy: createPhiSharedFormProviderKey("handler", "auth-admin-policy"),
  authAdminPasswordMethod: createPhiSharedFormProviderKey("handler", "auth-admin-password-method"),
  authAdminTotpPolicy: createPhiSharedFormProviderKey("handler", "auth-admin-totp-policy"),
  authLogin: createPhiSharedFormProviderKey("handler", "auth-login"),
  authRegistration: createPhiSharedFormProviderKey("handler", "auth-registration"),
  authRegistrationConfirm: createPhiSharedFormProviderKey("handler", "auth-registration-confirm"),
  authConfirm: createPhiSharedFormProviderKey("handler", "auth-confirm"),
  authConfirmPreview: createPhiSharedFormProviderKey("handler", "auth-confirm-preview"),
  authResetPassword: createPhiSharedFormProviderKey("handler", "auth-reset-password"),
  authResetPasswordConfirm: createPhiSharedFormProviderKey("handler", "auth-reset-password-confirm"),
  authProviderLinkConfirm: createPhiSharedFormProviderKey("handler", "auth-provider-link-confirm"),
  authProfilePassword: createPhiSharedFormProviderKey("handler", "auth-profile-password"),
  authProfileEmail: createPhiSharedFormProviderKey("handler", "auth-profile-email"),
  contact: createPhiSharedFormProviderKey("handler", "contact"),
  unsubscribe: createPhiSharedFormProviderKey("handler", "unsubscribe"),
} as const;

/**
 * The keys an upload field reads out of its Form's Label Set, beyond the ones every field has.
 *
 * A field's label, description and placeholder arrive resolved, because the descriptor names them. What
 * the descriptor cannot name is the wording of a refusal that has not happened yet, so these are read by
 * key: a Form that translates uploads carries them, and a Form that does not gets the shared defaults,
 * which say something a person can act on rather than leaking a control-plane code.
 *
 * They live with the descriptors rather than with the Control, because a Server label loader writes them
 * and a Server module must not reach into a client component to learn their names.
 */
/** The `link-target` field's wording, read from the Form's Label Set and falling back to English. */
export const PHI_FORM_LINK_TARGET_LABEL_KEYS = {
  none: "linkTargetNone",
  page: "linkTargetPage",
  external: "linkTargetExternal",
  pagePlaceholder: "linkTargetPagePlaceholder",
  externalPlaceholder: "linkTargetExternalPlaceholder",
  newTab: "linkTargetNewTab",
  /** Where the Pages would be, when the Site could not list them. */
  pagesUnavailable: "linkTargetPagesUnavailable",
} as const;

/**
 * What a field says in the place of its control when the Module that owns its field type is not active in
 * this Area (`PhiFormControl`'s `unavailableFieldKeys`), read from the Form's Label Set and falling back to
 * English. The value the field holds is kept and sent unchanged.
 */
export const PHI_FORM_FIELD_UNAVAILABLE_LABEL_KEY = "fieldUnavailable";
export const PHI_FORM_FIELD_UNAVAILABLE_DEFAULT_LABEL = "This field is not available in this area.";

export { PHI_FORM_UPLOAD_LABEL_KEYS } from "./upload-field-keys";

/*
 * The field types and validation rules every Form can use, described without an owner.
 *
 * Owning a provider is registering it, and that is a Module's act: the Core Module registers these in
 * its definition and names itself there. The Foundation describes them -- the registry beside this file
 * implements them, and a descriptor's settings are what the Inspector edits -- but it knows no Module,
 * so the owner is not part of what is written here.
 */
export type PhiSharedFormFieldTypeDescriptor = Omit<PhiFormFieldTypeProviderDescriptor, "ownerModuleId">;
export type PhiSharedFormValidationDescriptor = Omit<PhiFormValidationProviderDescriptor, "ownerModuleId">;

/** Every currency a payment accepts, by its ISO 4217 code, for the money field's settings. */
const PHI_MONEY_CURRENCY_OPTIONS: { value: string; label: string }[] = Object.keys(PHIS_PAYMENT_CURRENCY_EXPONENTS)
  .sort()
  .map((code) => ({ value: code, label: code }));

export const PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS = [
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.text, title: "Text", valueType: "string", presentation: "control", settingsFields: [{ key: "minLength", type: "number", label: "Minimum characters", min: 0 }, { key: "maxLength", type: "number", label: "Maximum characters", min: 0 }] },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.email, title: "Email", valueType: "string", presentation: "control", settingsFields: [{ key: "minLength", type: "number", label: "Minimum characters", min: 0 }, { key: "maxLength", type: "number", label: "Maximum characters", min: 0 }] },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.password, title: "Password", valueType: "string", presentation: "control", settingsFields: [{ key: "minLength", type: "number", label: "Minimum characters", min: 0 }, { key: "maxLength", type: "number", label: "Maximum characters", min: 0 }] },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.textarea, title: "Text Area", valueType: "string", presentation: "control", settingsFields: [{ key: "rows", type: "number", label: "Rows", min: 1 }, { key: "minLength", type: "number", label: "Minimum characters", min: 0 }, { key: "maxLength", type: "number", label: "Maximum characters", min: 0 }] },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.hidden, title: "Hidden", valueType: "string", presentation: "hidden" },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.checkbox, title: "Checkbox", valueType: "boolean", presentation: "control" },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.select, title: "Select", valueType: "string", presentation: "control" },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.honeypot, title: "Honeypot", valueType: "string", presentation: "honeypot" },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.url, title: "URL", valueType: "string", presentation: "control" },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.tel, title: "Telephone", valueType: "string", presentation: "control" },
  {
    key: PHI_FORM_FIELD_PROVIDER_KEYS.number,
    title: "Number",
    valueType: "number",
    presentation: "control",
    settingsFields: [
      { key: "min", type: "number", label: "Minimum" },
      { key: "max", type: "number", label: "Maximum" },
      { key: "step", type: "number", label: "Step" },
      { key: "precision", type: "number", label: "Precision", min: 0 },
    ],
  },
  {
    key: PHI_FORM_FIELD_PROVIDER_KEYS.slider,
    title: "Slider",
    valueType: "number",
    presentation: "control",
    settingsFields: [
      { key: "min", type: "number", label: "Minimum" },
      { key: "max", type: "number", label: "Maximum" },
      { key: "step", type: "number", label: "Step", min: 0 },
      { key: "dots", type: "boolean", label: "Step dots" },
      { key: "included", type: "boolean", label: "Highlight selected range" },
      { key: "reverse", type: "boolean", label: "Reverse" },
      {
        key: "tooltipMode",
        type: "choice",
        label: "Tooltip",
        options: [
          { value: "auto", label: "Automatic" },
          { value: "always", label: "Always" },
          { value: "hidden", label: "Hidden" },
        ] as { value: string; label: string }[],
      },
      { key: "tooltipSuffix", type: "string", label: "Tooltip suffix" },
      { key: "showInput", type: "boolean", label: "Show number input" },
      { key: "precision", type: "number", label: "Input precision", min: 0 },
    ],
  },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.multiSelect, title: "Multi Select", valueType: "string[]", presentation: "control" },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.checkboxGroup, title: "Checkbox Group", valueType: "string[]", presentation: "control" },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.switch, title: "Switch", valueType: "boolean", presentation: "control" },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.segmented, title: "Segmented", valueType: "string", presentation: "control" },
  {
    key: PHI_FORM_FIELD_PROVIDER_KEYS.cascader,
    title: "Cascader",
    valueType: "string",
    presentation: "control",
    settingsFields: [
      { key: "allowRoot", type: "boolean", label: "Allow Root" },
      { key: "separator", type: "string", label: "Separator character" },
      { key: "rootValue", type: "string", label: "Root Value" },
      {
        key: "normalize",
        type: "choice",
        label: "Normalize",
        options: [
          { value: "raw", label: "Raw" },
          { value: "path", label: "Path" },
        ] as { value: string; label: string }[],
      },
    ],
  },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.table, title: "Table value", valueType: "json", presentation: "control" },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.tree, title: "Tree value", valueType: "json", presentation: "control" },
  {
    key: PHI_FORM_FIELD_PROVIDER_KEYS.datetime,
    title: "Date and time",
    valueType: "string",
    presentation: "control",
    settingsFields: [{ key: "timeZone", type: "string", label: "Time zone" }],
  },
  /*
   * A byte count an administrator reads in megabytes. Appended rather than placed beside Number,
   * which is where it belongs by subject, because the registry pairs each descriptor with its Control
   * by position in this list and an insertion in the middle would silently re-pair everything after it.
   */
  {
    key: PHI_FORM_FIELD_PROVIDER_KEYS.storageSize,
    title: "Storage size",
    valueType: "number",
    presentation: "control",
  },
  /*
   * A file somebody attaches, and the Media Asset ids it becomes.
   *
   * `json` because the value is a list: one file or several, a Form reads the same shape either way, and
   * a handler that has to branch on "number or array of numbers" is a shape nobody chose. With nothing
   * attached the field carries no value at all rather than an empty list, so `required` on it means what
   * it says -- Ant Design's required rule passes an empty array.
   *
   * The settings narrow the Site's own answer and never widen it: `max_object_bytes` and
   * `allowed_content_types` are enforced by the control plane whatever stands here. `space` is the Media
   * Space the file lands in, named the way the control plane names one -- `user` for the viewer's own,
   * absent for the Site's -- and it is a setting rather than an inheritance because a Form has no
   * surrounding library view to inherit one from.
   */
  {
    key: PHI_FORM_FIELD_PROVIDER_KEYS.upload,
    title: "Upload",
    valueType: "json",
    presentation: "control",
    settingsFields: [
      {
        key: "kinds",
        type: "choice",
        mode: "multiple",
        valueType: "string[]",
        label: "Accepted kinds",
        description: "Everything the Site allows, when nothing is named.",
        options: [
          { value: PhiMediaKind.Image, label: "Image" },
          { value: PhiMediaKind.Video, label: "Video" },
          { value: PhiMediaKind.Audio, label: "Audio" },
          { value: PhiMediaKind.Pdf, label: "PDF" },
          { value: PhiMediaKind.Markdown, label: "Markdown" },
          { value: PhiMediaKind.Document, label: "Document" },
          { value: PhiMediaKind.Archive, label: "Archive" },
          { value: PhiMediaKind.Font, label: "Font" },
          { value: PhiMediaKind.Binary, label: "Binary" },
          { value: PhiMediaKind.Other, label: "Other" },
        ] as { value: string; label: string }[],
      },
      { key: "maxFiles", type: "number", label: "Most files", min: 1, precision: 0 },
      { key: "maxBytes", type: "number", label: "Largest file", min: 1, precision: 0, prefix: "bytes" },
      { key: "space", type: "string", label: "Space", description: "`user` for the viewer's own Space." },
      {
        key: "presentation",
        type: "choice",
        mode: "single",
        valueType: "string",
        label: "Presentation",
        description: "A button, or an area that also takes a drop.",
        options: [
          { value: "button", label: "Button" },
          { value: "area", label: "Area" },
        ] as { value: string; label: string }[],
      },
    ],
  },
  /*
   * One link: a Page of an Area, or an address elsewhere (`REFERENCES.md`, stable internal targets). The
   * value is the `PhiLinkTarget` itself, `null` for none. `area` names the Area whose Pages are offered.
   */
  {
    key: PHI_FORM_FIELD_PROVIDER_KEYS.linkTarget,
    title: "Link",
    valueType: "json",
    presentation: "control",
    settingsFields: [
      { key: "area", type: "string", label: "Area", description: "Whose Pages are offered; Public when empty." },
    ],
  },
  /*
   * A width and a height, each a CSS length or empty: `{ width?, height? }` (`PhiRenderableBlockSize`),
   * `null` when both are empty. The size of an image in the HTML editor is the first.
   */
  {
    key: PHI_FORM_FIELD_PROVIDER_KEYS.dimension,
    title: "Dimension",
    valueType: "json",
    presentation: "control",
  },
  /*
   * One colour, as the Inspector's colour field holds it: a CSS colour (`#rrggbb`, `rgb(...)`) or the
   * Theme role a Theme swatch stores (`var(--phi-color-primary)`), `null` for none (`color-field.ts`).
   */
  {
    key: PHI_FORM_FIELD_PROVIDER_KEYS.color,
    title: "Color",
    valueType: "string",
    presentation: "control",
  },
  /*
   * An amount of money: minor units in the value, major units on screen beside the currency's code.
   * `json`, because the value is the contract's money (`{ currency, minor }`) for one `currency`, or a
   * price list (`{ CHF: "1990" }`) for several `currencies`, or for the currencies an `optionsProvider`
   * answers; one amount's currency may be another field's value (`currencyField`) -- see
   * `money-field.ts`. `min` and `max` are minor units.
   */
  {
    key: PHI_FORM_FIELD_PROVIDER_KEYS.money,
    title: "Money",
    valueType: "json",
    presentation: "control",
    settingsFields: [
      {
        key: "currency",
        type: "choice",
        mode: "single",
        valueType: "string",
        label: "Currency",
        description: "The currency of one amount.",
        options: PHI_MONEY_CURRENCY_OPTIONS,
      },
      {
        key: "currencyField",
        type: "string",
        label: "Currency field",
        description: "The key of the field whose value is the currency of one amount, instead of a fixed currency.",
      },
      {
        key: "currencies",
        type: "choice",
        mode: "multiple",
        valueType: "string[]",
        label: "Currencies",
        description: "One amount per currency, instead of a single currency.",
        options: PHI_MONEY_CURRENCY_OPTIONS,
      },
      { key: "min", type: "number", label: "Minimum", description: "In minor units: 100 is 1.00 CHF.", min: 0, precision: 0 },
      { key: "max", type: "number", label: "Maximum", description: "In minor units.", min: 0, precision: 0 },
    ],
  },
  /*
   * A country of ISO 3166-1: the value is its alpha-2 code, uppercase, as Core stores an address's
   * country; the options are named in the reader's language (`helpers/country-names.ts`) and searchable.
   */
  {
    key: PHI_FORM_FIELD_PROVIDER_KEYS.country,
    title: "Country",
    valueType: "string",
    presentation: "control",
    settingsFields: [{ key: "allowClear", type: "boolean", label: "Allow clear" }],
  },
  /*
   * One postal address as Core writes it (`PhisSiteAddressInput` of `@phis/contracts/users`): `json`, the
   * parts in one object, an empty optional part `null`. The field holds each part to what Core takes
   * (`helpers/address-field.ts`) and reads its words from the Form's Label Set
   * (`PHI_FORM_ADDRESS_LABEL_KEYS`).
   */
  {
    key: PHI_FORM_FIELD_PROVIDER_KEYS.address,
    title: "Address",
    valueType: "json",
    presentation: "control",
  },
  /*
   * Several yes-or-no answers as one bit-flag number: each option's value is its bit as a decimal number,
   * `config.requires` an option another needs (`flags-field.ts`).
   */
  {
    key: PHI_FORM_FIELD_PROVIDER_KEYS.flags,
    title: "Flags",
    valueType: "number",
    presentation: "control",
  },
] as const satisfies readonly PhiSharedFormFieldTypeDescriptor[];

export const PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS = [
  { key: PHI_FORM_VALIDATION_PROVIDER_KEYS.required, title: "Required" },
  { key: PHI_FORM_VALIDATION_PROVIDER_KEYS.email, title: "Email" },
  {
    key: PHI_FORM_VALIDATION_PROVIDER_KEYS.minLength,
    title: "Minimum Length",
    settingsFields: [{ key: "min", type: "number", label: "Minimum", required: true }],
  },
  {
    key: PHI_FORM_VALIDATION_PROVIDER_KEYS.minLetters,
    title: "Minimum Letters",
    settingsFields: [{ key: "min", type: "number", label: "Minimum", required: true, min: 1 }],
  },
  {
    key: PHI_FORM_VALIDATION_PROVIDER_KEYS.maxLength,
    title: "Maximum Length",
    settingsFields: [{ key: "max", type: "number", label: "Maximum", required: true, min: 0 }],
  },
  {
    key: PHI_FORM_VALIDATION_PROVIDER_KEYS.exactLength,
    title: "Exact Length",
    settingsFields: [{ key: "length", type: "number", label: "Length", required: true, min: 0 }],
  },
  {
    key: PHI_FORM_VALIDATION_PROVIDER_KEYS.matchesField,
    title: "Matches Field",
    settingsFields: [{ key: "field", type: "string", label: "Field", required: true }],
  },
  { key: PHI_FORM_VALIDATION_PROVIDER_KEYS.url, title: "URL" },
  { key: PHI_FORM_VALIDATION_PROVIDER_KEYS.tel, title: "Telephone" },
  {
    key: PHI_FORM_VALIDATION_PROVIDER_KEYS.pattern,
    title: "Pattern",
    settingsFields: [
      { key: "source", type: "string", label: "Pattern", required: true },
      { key: "flags", type: "string", label: "Flags" },
    ],
  },
  {
    key: PHI_FORM_VALIDATION_PROVIDER_KEYS.number,
    title: "Number",
    settingsFields: [
      { key: "min", type: "number", label: "Minimum" },
      { key: "max", type: "number", label: "Maximum" },
      { key: "step", type: "number", label: "Step", min: 0 },
      { key: "precision", type: "number", label: "Precision", min: 0 },
      { key: "integer", type: "boolean", label: "Integer only" },
    ],
  },
] as const satisfies readonly PhiSharedFormValidationDescriptor[];
