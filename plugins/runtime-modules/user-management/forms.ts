import { PHI_BASE_ROLE_OPTIONS } from "../../../constants/phi-base-role-metadata";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/user-management/ids";
import type {
  PhiFormDescriptor,
  PhiFormHandlerProviderDescriptor,
  PhiRuntimeValueCondition,
} from "../../../types";
import { createPhiFormId } from "../../../types/form-id";
import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import { flattenPhiFormLabels } from "../../../components/forms/form-labels";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
  createPhiSharedFormProviderKey,
} from "../../../components/forms/form-provider-contract";
import { definePhiRuntimeModuleForm } from "../../../components/forms/form-registry";
import { createPhiUserManagementControllerAddress } from "./controller/address";

export const PHI_USER_MANAGEMENT_FORM_IDS = {
  create: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "user-management/create"),
  edit: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "user-management/edit"),
} as const;

export const PHI_USER_MANAGEMENT_FORM_HANDLER_KEYS = {
  create: "site.user-management.create",
  edit: "site.user-management.edit",
} as const;

const LABEL_SET_KEY = "@phis/ui/modules/user-management/labels/forms" as const;
const label = (key: string, fallback: string) => ({ kind: "label", key, fallback } as const);
const controllerAddress = createPhiUserManagementControllerAddress();
const readOnlyCondition = {
  source: "controller",
  controllerAddress,
  valuePath: "permissions.readOnly",
  operator: "truthy",
  reason: "This account can view users but cannot change them.",
} as const satisfies PhiRuntimeValueCondition;
const selfRoleCondition = {
  source: "controller",
  controllerAddress,
  valuePath: "selection.self",
  operator: "truthy",
  reason: "Your own roles cannot be changed here.",
} as const satisfies PhiRuntimeValueCondition;
const selfEnabledCondition = {
  source: "controller",
  controllerAddress,
  valuePath: "selection.self",
  operator: "truthy",
  reason: "Your own account cannot be enabled or disabled here.",
} as const satisfies PhiRuntimeValueCondition;

const required = (key: string, fallback: string) => ([{
  providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
  message: label(key, fallback),
}] as const);

const roleOptions = PHI_BASE_ROLE_OPTIONS.map((option) => ({
  value: option.value,
  label: label(`role_${option.value}`, option.label),
}));

const identityFields = [
  {
    key: "firstName",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
    label: label("firstName", "First name"),
    autoComplete: "given-name",
    validation: required("firstNameRequired", "First name is required."),
    disabledWhen: readOnlyCondition,
  },
  {
    key: "lastName",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
    label: label("lastName", "Last name"),
    autoComplete: "family-name",
    validation: required("lastNameRequired", "Last name is required."),
    disabledWhen: readOnlyCondition,
  },
  {
    key: "email",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.email,
    label: label("email", "Email"),
    autoComplete: "email",
    validation: [
      ...required("emailRequired", "Email is required."),
      { providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.email, message: label("emailInvalid", "Enter a valid email address.") },
    ],
    disabledWhen: readOnlyCondition,
  },
  {
    key: "companyName",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
    label: label("company", "Company"),
    autoComplete: "organization",
    disabledWhen: readOnlyCondition,
  },
] as const;

function descriptor(
  formId: string,
  mode: "create" | "edit",
): PhiFormDescriptor {
  const edit = mode === "edit";
  return {
    schemaVersion: 1,
    key: formId,
    labelSetKey: LABEL_SET_KEY,
    fields: [
      ...(edit ? [{ key: "userId", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden }] : []),
      ...identityFields.map((field) => mode === "create" && field.key === "email"
        ? { ...field, description: label("createPasswordHint", "New users receive a password-reset link.") }
        : field),
      {
        key: "roles",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.multiSelect,
        label: label("roles", "Roles"),
        placeholder: label("rolesPlaceholder", "Choose roles"),
        description: label(
          edit ? "rolesHint" : "authOnlyHint",
          edit
            ? "Leave roles empty for an auth-only account. Your own roles cannot be changed here."
            : "Leave roles empty for an auth-only account.",
        ),
        options: roleOptions,
        initialValue: [],
        disabledWhen: edit
          ? { match: "any", conditions: [readOnlyCondition, selfRoleCondition] } as const
          : readOnlyCondition,
      },
      ...(edit ? [
        {
          key: "enabled",
          fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.switch,
          label: label("enabled", "Enabled"),
          disabledWhen: { match: "any", conditions: [readOnlyCondition, selfEnabledCondition] } as const,
        },
        {
          key: "changePassword",
          fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.checkbox,
          controlLabel: label("changePassword", "Require password reset"),
          initialValue: false,
          disabledWhen: readOnlyCondition,
        },
      ] : []),
    ],
    layout: {
      columns: { compact: 1, medium: 1, wide: 1 },
      gap: { compact: "sm", medium: "base" },
      labelPlacement: "side",
      labelAlign: "start",
    },
  };
}

async function loadLabels(
  context: Parameters<NonNullable<ReturnType<typeof definePhiRuntimeModuleForm>["loadLabels"]>>[0],
) {
  const { getPhiAdminUsersTableWidgetLabels } = await import("../../../components/widgets/label-sets/admin-users");
  const labels = await getPhiAdminUsersTableWidgetLabels({
    apiBaseUrl: context.runtime.phis.apiBaseUrl,
    internalToken: context.runtime.phis.internalToken,
    locale: context.runtime.locale.current,
  });
  return flattenPhiFormLabels({
    firstName: labels.editor.firstName,
    firstNameRequired: labels.editor.firstName,
    lastName: labels.editor.lastName,
    lastNameRequired: labels.editor.lastName,
    email: labels.editor.email,
    emailRequired: labels.editor.email,
    emailInvalid: labels.editor.email,
    company: labels.editor.company,
    roles: labels.editor.roles,
    rolesPlaceholder: labels.editor.rolesPlaceholder,
    rolesHint: labels.editor.selfRoleHint,
    authOnlyHint: labels.editor.authOnlyHint,
    createPasswordHint: labels.editor.createPasswordHint,
    enabled: labels.columns.enabled,
    changePassword: labels.editor.changePassword,
    create: labels.editor.createButton,
    creating: labels.editor.createButton,
    save: labels.editor.saveButton,
    saving: labels.editor.saveButton,
    cancel: labels.confirm.cancel,
    ...Object.fromEntries(PHI_BASE_ROLE_OPTIONS.map((option) => [`role_${option.value}`, option.label])),
  });
}

export const PHI_USER_MANAGEMENT_RUNTIME_MODULE_FORMS = [
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
    formId: PHI_USER_MANAGEMENT_FORM_IDS.create,
    version: 1,
    flags: 0,
    title: "Create user",
    description: "Create a site user and send the initial password-reset link.",
    category: "forms",
    tags: ["users", "create"],
    descriptor: descriptor(PHI_USER_MANAGEMENT_FORM_IDS.create, "create"),
    submitHandlerKey: PHI_USER_MANAGEMENT_FORM_HANDLER_KEYS.create,
    confirmHandlerKey: null,
    previewHandlerKey: null,
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: null,
    loadLabels,
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
    formId: PHI_USER_MANAGEMENT_FORM_IDS.edit,
    version: 1,
    flags: 0,
    title: "Edit user",
    description: "Edit one site user and optionally require a password reset.",
    category: "forms",
    tags: ["users", "edit"],
    descriptor: descriptor(PHI_USER_MANAGEMENT_FORM_IDS.edit, "edit"),
    submitHandlerKey: PHI_USER_MANAGEMENT_FORM_HANDLER_KEYS.edit,
    confirmHandlerKey: null,
    previewHandlerKey: null,
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: null,
    loadLabels,
  }),
] as const;

export const PHI_USER_MANAGEMENT_FORM_HANDLER_PROVIDER_DESCRIPTORS = Object.entries(
  PHI_USER_MANAGEMENT_FORM_HANDLER_KEYS,
).map(([key, handlerKey]) => ({
  key: createPhiSharedFormProviderKey("handler", `user-management-${key}`),
  ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
  title: `User Management ${key}`,
  phase: "submit",
  handlerKey,
  category: "site",
  transport: "relay",
  method: key === "edit" ? "PUT" : "POST",
  endpointKey: null,
  upstreamPath: "/api/site/admin/users",
  csrfPath: null,
  requiresCsrf: false,
  credentialPolicy: "site-session",
})) satisfies readonly PhiFormHandlerProviderDescriptor[];
