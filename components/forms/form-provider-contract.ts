import type {
  PhiFormFieldTypeProviderDescriptor,
  PhiFormProviderKey,
  PhiFormValidationProviderDescriptor,
} from "../../types/form-descriptor";
import { createPhiModuleScopedKey } from "../../constants/runtime-module-ownership";
import { PhiMediaKind } from "../../constants/media";

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
  table: createPhiSharedFormProviderKey("field", "table"),
  tree: createPhiSharedFormProviderKey("field", "tree"),
  upload: createPhiSharedFormProviderKey("field", "upload"),
} as const;

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
export const PHI_FORM_UPLOAD_LABEL_KEYS = {
  trigger: "uploadTrigger",
  tooMany: "uploadErrorTooMany",
  /** Shown on the field when the Form is submitted while a file is still on its way. */
  pending: "uploadPending",
  errorGeneric: "uploadErrorGeneric",
  errorNetwork: "uploadErrorNetwork",
  errorTooLarge: "uploadErrorTooLarge",
  errorDuplicate: "uploadErrorDuplicate",
  errorTypeNotAllowed: "uploadErrorTypeNotAllowed",
  errorQuotaExceeded: "uploadErrorQuotaExceeded",
  errorSpaceUnavailable: "uploadErrorSpaceUnavailable",
  errorStorageUnreachable: "uploadErrorStorageUnreachable",
} as const;

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
      { key: "separator", type: "string", label: "Separator" },
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
    ],
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
