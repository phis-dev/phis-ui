import { PHI_AUTH_RUNTIME_MODULE_ID } from "../../plugins/runtime-modules/auth/ids";
import { PHI_BASE_ROLE_OPTIONS } from "../../constants/phi-base-role-metadata";
import type { PhiFormDescriptor } from "../../types";
import { createPhiFormId, type PhiFormId } from "../../types/form-id";
import { PHI_SHARED_PACKAGE_NAME } from "../../types/signals";
import { flattenPhiFormLabels } from "./form-labels";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
} from "./form-provider-contract";
import { definePhiRuntimeModuleForm } from "./form-registry";

export const PHI_AUTH_ADMIN_SETTINGS_FORM_IDS = {
  policy: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "auth/admin-policy"),
  passwordMethod: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "auth/admin-password-method"),
  totpPolicy: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "auth/admin-totp-policy"),
  installationCreate: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "auth/admin-installation-create"),
  installationEdit: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "auth/admin-installation-edit"),
} as const;

export const PHI_AUTH_ADMIN_SETTINGS_FORM_HANDLER_KEYS = {
  policy: "auth.admin.policy",
  passwordMethod: "auth.admin.password-method",
  totpPolicy: "auth.admin.totp-policy",
  installationCreate: "auth.admin.installation-create",
  installationUpdate: "auth.admin.installation-update",
} as const;

const LABEL_SET_KEY = "@phis/ui/modules/auth/labels/admin-settings" as const;
const label = (key: string, fallback: string) => ({ kind: "label", key, fallback } as const);

const FORM_LAYOUT = {
  columns: { compact: 1, medium: 1, wide: 1 },
  gap: { compact: "sm", medium: "base" },
  labelPlacement: "side",
  labelAlign: "start",
} as const;

const POLICY_FORM_DESCRIPTOR: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_AUTH_ADMIN_SETTINGS_FORM_IDS.policy,
  labelSetKey: LABEL_SET_KEY,
  fields: [
    {
      key: "registrationMode",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: label("registrationMode", "Registration"),
      options: [
        { value: "disabled", label: label("registrationModeDisabled", "Disabled") },
        { value: "invite-only", label: label("registrationModeInviteOnly", "Invite only") },
        { value: "automatic", label: label("registrationModeAutomatic", "Automatic") },
      ],
      initialValue: "disabled",
    },
    {
      key: "existingAccountLinking",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: label("linking", "Existing account linking"),
      options: [
        { value: "verified-email-confirm", label: label("linkingConfirm", "Verified email plus explicit confirmation") },
        { value: "verified-email-auto", label: label("linkingAuto", "Automatic for trusted verified email") },
        { value: "disabled", label: label("linkingDisabled", "Disabled") },
      ],
      initialValue: "verified-email-confirm",
    },
    {
      key: "allowPrivilegedAutoLink",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.switch,
      label: label("privilegedAutoLink", "Allow automatic linking for privileged memberships"),
      initialValue: false,
    },
  ],
  layout: FORM_LAYOUT,
};

const PASSWORD_METHOD_FORM_DESCRIPTOR: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_AUTH_ADMIN_SETTINGS_FORM_IDS.passwordMethod,
  labelSetKey: LABEL_SET_KEY,
  fields: [
    {
      key: "enabled",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.switch,
      label: label("methodEnabled", "Enabled"),
      initialValue: false,
    },
    {
      key: "sortOrder",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
      label: label("methodSortOrder", "Order"),
      initialValue: 0,
      config: { precision: 0 },
    },
  ],
  layout: FORM_LAYOUT,
};

const TOTP_POLICY_FORM_DESCRIPTOR: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_AUTH_ADMIN_SETTINGS_FORM_IDS.totpPolicy,
  labelSetKey: LABEL_SET_KEY,
  fields: [
    {
      key: "required",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.switch,
      label: label("totpRequired", "Require an authenticator app"),
      initialValue: false,
    },
    {
      key: "enforcement",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: label("totpEnforcement", "Enforcement"),
      options: [
        { value: "next-login", label: label("totpEnforcementNextLogin", "At the next login") },
        { value: "immediate", label: label("totpEnforcementImmediate", "Immediately for existing sessions") },
        { value: "grace", label: label("totpEnforcementGrace", "After a grace deadline") },
      ],
      initialValue: "next-login",
    },
    {
      key: "graceUntil",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.datetime,
      label: label("totpGraceUntil", "Grace deadline"),
      description: label("totpGraceUntilHint", "Applies only with grace enforcement. UTC date and time."),
    },
    {
      key: "roles",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.multiSelect,
      label: label("totpRoles", "Required for roles"),
      description: label("totpRolesHint", "Leave empty to require two-factor authentication for every site member."),
      options: PHI_BASE_ROLE_OPTIONS.map((option) => ({
        value: option.value,
        label: label(`role_${option.value}`, option.label),
      })),
      initialValue: [],
    },
  ],
  layout: FORM_LAYOUT,
};

const PROVIDER_OPTIONS = [
  { value: "google", label: label("providerGoogle", "Google") },
  { value: "apple", label: label("providerApple", "Apple") },
  { value: "github", label: label("providerGithub", "GitHub") },
  { value: "microsoft", label: label("providerMicrosoft", "Microsoft") },
] as const;

const INSTALLATION_SHARED_FIELDS = [
  {
    key: "clientId",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
    label: label("installationClientId", "Client ID"),
    autoComplete: "off",
    validation: [{
      providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
      message: label("installationClientIdRequired", "Client ID is required."),
    }],
  },
  {
    key: "clientSecret",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.password,
    label: label("installationClientSecret", "Client secret"),
    description: label("installationClientSecretHint", "Leave empty to keep the currently stored secret."),
    autoComplete: "new-password",
  },
  {
    key: "tenant",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
    label: label("installationTenant", "Tenant"),
    description: label("installationTenantHint", "Microsoft only: common, organizations, consumers, or a tenant UUID."),
    placeholder: label("installationTenantPlaceholder", "common"),
    autoComplete: "off",
  },
  {
    key: "callbackOrigin",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.url,
    label: label("installationCallbackOrigin", "Callback origin"),
    description: label("installationCallbackOriginHint", "Optional origin from the allowedCallbackOrigins policy. Empty uses the site's public base URL."),
    autoComplete: "off",
  },
  {
    key: "enabled",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.switch,
    label: label("installationEnabled", "Installation enabled"),
    initialValue: true,
  },
] as const;

const INSTALLATION_CREATE_FORM_DESCRIPTOR: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_AUTH_ADMIN_SETTINGS_FORM_IDS.installationCreate,
  labelSetKey: LABEL_SET_KEY,
  fields: [
    {
      key: "installationKey",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("installationKey", "Installation key"),
      description: label("installationKeyHint", "Stable lowercase slug, unique per site (for example google-workspace)."),
      autoComplete: "off",
      validation: [
        {
          providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
          message: label("installationKeyRequired", "Installation key is required."),
        },
        {
          providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.pattern,
          message: label("installationKeyInvalid", "Use a lowercase slug of letters, digits, and dashes."),
          config: { source: "^[a-z0-9][a-z0-9-]{0,63}$" },
        },
      ],
    },
    {
      key: "providerKey",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: label("installationProvider", "Provider"),
      options: PROVIDER_OPTIONS,
      initialValue: "google",
    },
    ...INSTALLATION_SHARED_FIELDS,
  ],
  layout: FORM_LAYOUT,
};

const INSTALLATION_EDIT_FORM_DESCRIPTOR: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_AUTH_ADMIN_SETTINGS_FORM_IDS.installationEdit,
  labelSetKey: LABEL_SET_KEY,
  fields: [
    { key: "installationKey", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden },
    ...INSTALLATION_SHARED_FIELDS,
    {
      key: "loginEnabled",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.switch,
      label: label("installationLoginEnabled", "Offer on login"),
      initialValue: false,
    },
    {
      key: "sortOrder",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
      label: label("installationSortOrder", "Order"),
      initialValue: 10,
      config: { precision: 0 },
    },
  ],
  layout: FORM_LAYOUT,
};

async function loadLabels(
  context: Parameters<NonNullable<ReturnType<typeof definePhiRuntimeModuleForm>["loadLabels"]>>[0],
) {
  const { getPhiAuthAdminSettingsLabels } = await import("./auth-admin-settings-labels");
  const labels = await getPhiAuthAdminSettingsLabels({
    apiBaseUrl: context.runtime.phis.apiBaseUrl,
    internalToken: context.runtime.phis.internalToken,
    locale: context.runtime.locale.current,
  });
  return flattenPhiFormLabels({
    registrationMode: labels.policy.registrationMode,
    registrationModeDisabled: labels.policy.registrationModeDisabled,
    registrationModeInviteOnly: labels.policy.registrationModeInviteOnly,
    registrationModeAutomatic: labels.policy.registrationModeAutomatic,
    linking: labels.policy.linking,
    linkingConfirm: labels.policy.linkingConfirm,
    linkingAuto: labels.policy.linkingAuto,
    linkingDisabled: labels.policy.linkingDisabled,
    privilegedAutoLink: labels.policy.privilegedAutoLink,
    methodEnabled: labels.method.enabled,
    methodSortOrder: labels.method.sortOrder,
    totpRequired: labels.totp.required,
    totpEnforcement: labels.totp.enforcement,
    totpEnforcementNextLogin: labels.totp.enforcementNextLogin,
    totpEnforcementImmediate: labels.totp.enforcementImmediate,
    totpEnforcementGrace: labels.totp.enforcementGrace,
    totpGraceUntil: labels.totp.graceUntil,
    totpGraceUntilHint: labels.totp.graceUntilHint,
    totpRoles: labels.totp.roles,
    totpRolesHint: labels.totp.rolesHint,
    role_admin: labels.roles.admin,
    role_developer: labels.roles.developer,
    role_builder: labels.roles.builder,
    role_author: labels.roles.author,
    role_publisher: labels.roles.publisher,
    role_supporter: labels.roles.supporter,
    role_accountant: labels.roles.accountant,
    providerGoogle: "Google",
    providerApple: "Apple",
    providerGithub: "GitHub",
    providerMicrosoft: "Microsoft",
    installationKey: labels.installations.installationKey,
    installationKeyRequired: labels.installations.installationKey,
    installationKeyHint: labels.installations.installationKeyHint,
    installationKeyInvalid: labels.installations.installationKeyInvalid,
    installationProvider: labels.installations.provider,
    installationClientId: labels.providers.clientId,
    installationClientIdRequired: labels.providers.clientId,
    installationClientSecret: labels.providers.clientSecret,
    installationClientSecretHint: labels.providers.secretHint,
    installationTenant: labels.providers.tenant,
    installationTenantHint: labels.installations.tenantHint,
    installationTenantPlaceholder: labels.providers.tenantPlaceholder,
    installationCallbackOrigin: labels.installations.callbackOrigin,
    installationCallbackOriginHint: labels.installations.callbackOriginHint,
    installationEnabled: labels.providers.enabled,
    installationLoginEnabled: labels.providers.loginEnabled,
    installationSortOrder: labels.providers.sortOrder,
  });
}

function defineAuthAdminSettingsForm(input: {
  formId: PhiFormId;
  handlerKey: string;
  title: string;
  description: string;
  descriptor: PhiFormDescriptor;
}) {
  return definePhiRuntimeModuleForm({
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    formId: input.formId,
    version: 1,
    flags: 0,
    title: input.title,
    description: input.description,
    category: "forms",
    tags: ["settings", "auth", "admin"],
    descriptor: input.descriptor,
    submitHandlerKey: input.handlerKey,
    confirmHandlerKey: null,
    previewHandlerKey: null,
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: null,
    loadLabels,
  });
}

export const PHI_AUTH_ADMIN_SETTINGS_RUNTIME_MODULE_FORMS = [
  defineAuthAdminSettingsForm({
    formId: PHI_AUTH_ADMIN_SETTINGS_FORM_IDS.policy,
    handlerKey: PHI_AUTH_ADMIN_SETTINGS_FORM_HANDLER_KEYS.policy,
    title: "Auth registration and linking policy",
    description: "Registration mode and existing-account linking for the current site.",
    descriptor: POLICY_FORM_DESCRIPTOR,
  }),
  defineAuthAdminSettingsForm({
    formId: PHI_AUTH_ADMIN_SETTINGS_FORM_IDS.passwordMethod,
    handlerKey: PHI_AUTH_ADMIN_SETTINGS_FORM_HANDLER_KEYS.passwordMethod,
    title: "Password login method",
    description: "Enablement and order of the built-in password login method.",
    descriptor: PASSWORD_METHOD_FORM_DESCRIPTOR,
  }),
  defineAuthAdminSettingsForm({
    formId: PHI_AUTH_ADMIN_SETTINGS_FORM_IDS.totpPolicy,
    handlerKey: PHI_AUTH_ADMIN_SETTINGS_FORM_HANDLER_KEYS.totpPolicy,
    title: "Two-factor policy",
    description: "Authenticator-app requirement, enforcement, and covered roles.",
    descriptor: TOTP_POLICY_FORM_DESCRIPTOR,
  }),
  defineAuthAdminSettingsForm({
    formId: PHI_AUTH_ADMIN_SETTINGS_FORM_IDS.installationCreate,
    handlerKey: PHI_AUTH_ADMIN_SETTINGS_FORM_HANDLER_KEYS.installationCreate,
    title: "Add provider installation",
    description: "Create an identity provider installation for the current site.",
    descriptor: INSTALLATION_CREATE_FORM_DESCRIPTOR,
  }),
  defineAuthAdminSettingsForm({
    formId: PHI_AUTH_ADMIN_SETTINGS_FORM_IDS.installationEdit,
    handlerKey: PHI_AUTH_ADMIN_SETTINGS_FORM_HANDLER_KEYS.installationUpdate,
    title: "Edit provider installation",
    description: "Update one identity provider installation of the current site.",
    descriptor: INSTALLATION_EDIT_FORM_DESCRIPTOR,
  }),
] as const;
