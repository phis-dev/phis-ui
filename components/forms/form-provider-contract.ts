import { PHI_CORE_RUNTIME_MODULE_ID } from "../../plugins/runtime-modules/core/ids";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../../plugins/runtime-modules/public/ids";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../../plugins/runtime-modules/auth/ids";
import type {
  PhiFormFieldTypeProviderDescriptor,
  PhiFormProviderKey,
  PhiRuntimeModuleFormProviderDescriptors,
} from "../../types/form-descriptor";
import { createPhiModuleScopedKey } from "../../constants/runtime-module-ownership";

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
  slider: createPhiSharedFormProviderKey("field", "slider"),
  multiSelect: createPhiSharedFormProviderKey("field", "multi-select"),
  checkboxGroup: createPhiSharedFormProviderKey("field", "checkbox-group"),
  datetime: createPhiSharedFormProviderKey("field", "datetime"),
  switch: createPhiSharedFormProviderKey("field", "switch"),
  segmented: createPhiSharedFormProviderKey("field", "segmented"),
  cascader: createPhiSharedFormProviderKey("field", "cascader"),
  table: createPhiSharedFormProviderKey("field", "table"),
  tree: createPhiSharedFormProviderKey("field", "tree"),
} as const;

export const PHI_AUTH_FORM_FIELD_PROVIDER_KEYS = {
  termsConsent: createPhiSharedFormProviderKey("field", "auth-terms-consent"),
} as const;

export const PHI_AUTH_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_AUTH_FORM_FIELD_PROVIDER_KEYS.termsConsent,
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    title: "Terms consent",
    valueType: "boolean",
    presentation: "control",
    settingsFields: [
      { key: "before", type: "string", label: "Text before link" },
      { key: "linkLabel", type: "string", label: "Link label" },
      { key: "after", type: "string", label: "Text after link" },
      { key: "href", type: "url", label: "Link URL", required: true },
    ],
  },
] as const satisfies readonly PhiFormFieldTypeProviderDescriptor[];

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
  contact: createPhiSharedFormProviderKey("handler", "contact"),
} as const;

export const PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS = [
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.text, ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID, title: "Text", valueType: "string", presentation: "control", settingsFields: [{ key: "minLength", type: "number", label: "Minimum characters", min: 0 }, { key: "maxLength", type: "number", label: "Maximum characters", min: 0 }] },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.email, ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID, title: "Email", valueType: "string", presentation: "control", settingsFields: [{ key: "minLength", type: "number", label: "Minimum characters", min: 0 }, { key: "maxLength", type: "number", label: "Maximum characters", min: 0 }] },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.password, ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID, title: "Password", valueType: "string", presentation: "control", settingsFields: [{ key: "minLength", type: "number", label: "Minimum characters", min: 0 }, { key: "maxLength", type: "number", label: "Maximum characters", min: 0 }] },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.textarea, ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID, title: "Text Area", valueType: "string", presentation: "control", settingsFields: [{ key: "rows", type: "number", label: "Rows", min: 1 }, { key: "minLength", type: "number", label: "Minimum characters", min: 0 }, { key: "maxLength", type: "number", label: "Maximum characters", min: 0 }] },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.hidden, ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID, title: "Hidden", valueType: "string", presentation: "hidden" },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.checkbox, ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID, title: "Checkbox", valueType: "boolean", presentation: "control" },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.select, ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID, title: "Select", valueType: "string", presentation: "control" },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.honeypot, ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID, title: "Honeypot", valueType: "string", presentation: "honeypot" },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.url, ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID, title: "URL", valueType: "string", presentation: "control" },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.tel, ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID, title: "Telephone", valueType: "string", presentation: "control" },
  {
    key: PHI_FORM_FIELD_PROVIDER_KEYS.number,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
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
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
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
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.multiSelect, ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID, title: "Multi Select", valueType: "string[]", presentation: "control" },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.checkboxGroup, ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID, title: "Checkbox Group", valueType: "string[]", presentation: "control" },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.switch, ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID, title: "Switch", valueType: "boolean", presentation: "control" },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.segmented, ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID, title: "Segmented", valueType: "string", presentation: "control" },
  {
    key: PHI_FORM_FIELD_PROVIDER_KEYS.cascader,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
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
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.table, ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID, title: "Table value", valueType: "json", presentation: "control" },
  { key: PHI_FORM_FIELD_PROVIDER_KEYS.tree, ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID, title: "Tree value", valueType: "json", presentation: "control" },
  {
    key: PHI_FORM_FIELD_PROVIDER_KEYS.datetime,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    title: "Date and time",
    valueType: "string",
    presentation: "control",
    settingsFields: [{ key: "timeZone", type: "string", label: "Time zone" }],
  },
] as const;

export const PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS = [
  { key: PHI_FORM_VALIDATION_PROVIDER_KEYS.required, ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID, title: "Required" },
  { key: PHI_FORM_VALIDATION_PROVIDER_KEYS.email, ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID, title: "Email" },
  {
    key: PHI_FORM_VALIDATION_PROVIDER_KEYS.minLength,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    title: "Minimum Length",
    settingsFields: [{ key: "min", type: "number", label: "Minimum", required: true }],
  },
  {
    key: PHI_FORM_VALIDATION_PROVIDER_KEYS.minLetters,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    title: "Minimum Letters",
    settingsFields: [{ key: "min", type: "number", label: "Minimum", required: true, min: 1 }],
  },
  {
    key: PHI_FORM_VALIDATION_PROVIDER_KEYS.maxLength,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    title: "Maximum Length",
    settingsFields: [{ key: "max", type: "number", label: "Maximum", required: true, min: 0 }],
  },
  {
    key: PHI_FORM_VALIDATION_PROVIDER_KEYS.exactLength,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    title: "Exact Length",
    settingsFields: [{ key: "length", type: "number", label: "Length", required: true, min: 0 }],
  },
  {
    key: PHI_FORM_VALIDATION_PROVIDER_KEYS.matchesField,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    title: "Matches Field",
    settingsFields: [{ key: "field", type: "string", label: "Field", required: true }],
  },
  { key: PHI_FORM_VALIDATION_PROVIDER_KEYS.url, ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID, title: "URL" },
  { key: PHI_FORM_VALIDATION_PROVIDER_KEYS.tel, ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID, title: "Telephone" },
  {
    key: PHI_FORM_VALIDATION_PROVIDER_KEYS.pattern,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    title: "Pattern",
    settingsFields: [
      { key: "source", type: "string", label: "Pattern", required: true },
      { key: "flags", type: "string", label: "Flags" },
    ],
  },
  {
    key: PHI_FORM_VALIDATION_PROVIDER_KEYS.number,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    title: "Number",
    settingsFields: [
      { key: "min", type: "number", label: "Minimum" },
      { key: "max", type: "number", label: "Maximum" },
      { key: "step", type: "number", label: "Step", min: 0 },
      { key: "precision", type: "number", label: "Precision", min: 0 },
      { key: "integer", type: "boolean", label: "Integer only" },
    ],
  },
] as const;

export const PHI_AUTH_FORM_HANDLER_PROVIDER_DESCRIPTORS = [
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authAdminInstallationCreate, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Auth Admin installation create", phase: "submit", handlerKey: "auth.admin.installation-create", category: "auth", transport: "relay", method: "POST", endpointKey: null, upstreamPath: "/api/v1/auth/admin/installations", csrfPath: "/api/auth/csrf", requiresCsrf: true, credentialPolicy: "site-session" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authAdminInstallationUpdate, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Auth Admin installation update", phase: "submit", handlerKey: "auth.admin.installation-update", category: "auth", transport: "relay", method: "PATCH", endpointKey: null, upstreamPath: "/api/v1/auth/admin/installations", csrfPath: "/api/auth/csrf", requiresCsrf: true, credentialPolicy: "site-session" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authAdminPolicy, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Auth Admin policy", phase: "submit", handlerKey: "auth.admin.policy", category: "auth", transport: "relay", method: "PATCH", endpointKey: null, upstreamPath: "/api/v1/auth/admin/policy", csrfPath: "/api/auth/csrf", requiresCsrf: true, credentialPolicy: "site-session" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authAdminPasswordMethod, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Auth Admin password method", phase: "submit", handlerKey: "auth.admin.password-method", category: "auth", transport: "relay", method: "PATCH", endpointKey: null, upstreamPath: "/api/v1/auth/admin/password-method", csrfPath: "/api/auth/csrf", requiresCsrf: true, credentialPolicy: "site-session" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authAdminTotpPolicy, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Auth Admin two-factor policy", phase: "submit", handlerKey: "auth.admin.totp-policy", category: "auth", transport: "relay", method: "PATCH", endpointKey: null, upstreamPath: "/api/v1/auth/admin/totp-policy", csrfPath: "/api/auth/csrf", requiresCsrf: true, credentialPolicy: "site-session" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authLogin, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Login", phase: "submit", handlerKey: "auth.login", category: "auth", transport: "relay", method: "POST", endpointKey: null, upstreamPath: "/api/auth/login", csrfPath: "/api/auth/csrf", requiresCsrf: true, credentialPolicy: "none" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authRegistration, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Registration", phase: "submit", handlerKey: "auth.registration", category: "auth", transport: "relay", method: "POST", endpointKey: null, upstreamPath: "/api/v1/forms/register", csrfPath: null, requiresCsrf: false, credentialPolicy: "none" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authRegistrationConfirm, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Registration Confirm", phase: "confirm", handlerKey: "auth.registration.confirm", category: "auth", transport: "relay", method: "POST", endpointKey: null, upstreamPath: "/api/v1/forms/register/confirm", csrfPath: null, requiresCsrf: false, credentialPolicy: "none" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authConfirm, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Confirm", phase: "submit", handlerKey: "auth.confirm", category: "auth", transport: "relay", method: "POST", endpointKey: null, upstreamPath: "/api/v1/forms/register/confirm", csrfPath: null, requiresCsrf: false, credentialPolicy: "none" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authConfirmPreview, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Confirm Preview", phase: "preview", handlerKey: "auth.confirm.preview", category: "auth", transport: "relay", method: "GET", endpointKey: null, upstreamPath: "/api/v1/forms/register/confirm-preview", csrfPath: null, requiresCsrf: false, credentialPolicy: "none" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authResetPassword, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Reset Password", phase: "submit", handlerKey: "auth.reset-password", category: "auth", transport: "relay", method: "POST", endpointKey: null, upstreamPath: "/api/auth/password/reset/request", csrfPath: null, requiresCsrf: false, credentialPolicy: "none" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authResetPasswordConfirm, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Reset Password Confirm", phase: "confirm", handlerKey: "auth.reset-password.confirm", category: "auth", transport: "relay", method: "POST", endpointKey: null, upstreamPath: "/api/auth/password/reset/confirm", csrfPath: null, requiresCsrf: false, credentialPolicy: "none" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authProviderLinkConfirm, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Provider Link Confirm", phase: "confirm", handlerKey: "auth.provider-link.confirm", category: "auth", transport: "relay", method: "POST", endpointKey: null, upstreamPath: "/api/v1/auth/providers/link/confirm", csrfPath: "/api/v1/auth/csrf", requiresCsrf: true, credentialPolicy: "auth-link" },
] as const;

export const PHI_PUBLIC_FORM_HANDLER_PROVIDER_DESCRIPTORS = [
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.contact, ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID, title: "Contact", phase: "submit", handlerKey: "forms.contact", category: "forms", transport: "relay", method: "POST", endpointKey: null, upstreamPath: "/api/v1/forms/contact", csrfPath: null, requiresCsrf: false, credentialPolicy: "none" },
] as const;

export const PHI_CORE_FORM_PROVIDER_DESCRIPTORS = {
  fieldTypes: PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS,
  validationRules: PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS,
} as const satisfies PhiRuntimeModuleFormProviderDescriptors;
