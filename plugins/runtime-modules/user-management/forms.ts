import { createPhiFormLabelSetLoader } from "../../../components/forms/shared-form-loaders";
import { PHI_BASE_ROLE_OPTIONS } from "../../../constants/phi-base-role-metadata";
import {
  PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS,
  PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
} from "../../../plugins/runtime-modules/user-management/ids";
import type {
  PhiFormDescriptor,
  PhiFormHandlerProviderDescriptor,
  PhiRuntimeValueCondition,
} from "../../../types";
import { createPhiFormId } from "../../../types/form-id";
import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
  createPhiSharedFormProviderKey,
} from "../../../components/forms/form-provider-contract";
import { definePhiRuntimeModuleForm } from "../../../components/forms/form-registry";
import { createPhiUserManagementControllerAddress } from "./controller/address";
import { phiFormLabel as label, phiFormRequired as required } from "../../../components/forms/form-descriptor-text";
import { PHI_USER_MANAGEMENT_ADDON_ROLE_IMPLIED_LIST } from "./addon-roles";

export const PHI_USER_MANAGEMENT_FORM_IDS = {
  create: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "user-management/create"),
  edit: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "user-management/edit"),
  usersAccessRetention: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "user-management/users-access-retention"),
} as const;

const PHI_USER_MANAGEMENT_FORM_HANDLER_KEYS = {
  create: "site.user-management.create",
  edit: "site.user-management.edit",
} as const;

const PHI_USER_MANAGEMENT_USERS_ACCESS_RETENTION_HANDLER_KEY = "site.user-management.users-access-retention";

const LABEL_SET_KEY = "@phis/ui/modules/user-management/labels/forms" as const;
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
/*
 * A Site Admin holds every Add-on role whatever is stored, so choosing some says nothing. Read off the form's
 * own Core roles rather than the record: whoever takes `admin` away in the same dialog may then choose.
 */
const siteAdminTargetCondition = {
  source: "form",
  valuePath: "roles",
  operator: "contains",
  value: "admin",
  reason: "A Site Admin holds every Add-on role.",
} as const satisfies PhiRuntimeValueCondition;
const selfEnabledCondition = {
  source: "controller",
  controllerAddress,
  valuePath: "selection.self",
  operator: "truthy",
  reason: "Your own account cannot be enabled or disabled here.",
} as const satisfies PhiRuntimeValueCondition;


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
  // The name a reader is shown where it is not the first and last name; empty is those two.
  {
    key: "displayName",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
    label: label("displayName", "Display name"),
    autoComplete: "nickname",
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
      /*
       * Edit only: the Core's create takes no Add-on roles. The value is the whole list the person is to hold
       * afterwards; a held role the actor may not grant is a disabled option, so it stays in the value and is
       * sent unchanged (`buildPhiAddonRoleChoiceOptions`).
       */
      ...(edit ? [
        {
          key: "addonRoles",
          fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.multiSelect,
          label: label("addonRoles", "Add-on roles"),
          placeholder: label("addonRolesPlaceholder", "Choose Add-on roles"),
          description: label(
            "addonRolesHint",
            "A Site Admin holds every Add-on role. Your own Add-on roles cannot be changed here.",
          ),
          optionsProvider: {
            providerKey: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.addonRoleChoiceOptions,
            /*
             * Which roles the person holds decides which ones the actor may not grant are still listed. Required,
             * so the catalog is asked once the record has filled the form, not once before it as well.
             */
            dependencies: [{ param: "userId", source: "form" as const, valuePath: "userId", required: true }],
          },
          initialValue: [],
          disabledWhen: {
            match: "any",
            conditions: [readOnlyCondition, selfRoleCondition, siteAdminTargetCondition],
          } as const,
        },
        /*
         * What a Site access gives without a grant, beside the grants: shown, never edited. The record carries
         * it as `"<addonId>:<role>"` strings (null where there are none, which hides the field); the options are
         * the same answer's `implied`, each labelled with its access. The save sends the field along under its
         * own key, which the Core does not read, so nothing here is ever stored or taken back.
         */
        {
          key: "impliedAddonRoles",
          fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.multiSelect,
          label: label("impliedAddonRoles", "Add-on roles through Core roles"),
          description: label(
            "impliedAddonRolesHint",
            "Held without a grant while the person has the Core role that implies them. They cannot be removed here.",
          ),
          optionsProvider: {
            providerKey: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.addonRoleChoiceOptions,
            params: { list: PHI_USER_MANAGEMENT_ADDON_ROLE_IMPLIED_LIST },
            dependencies: [{ param: "userId", source: "form" as const, valuePath: "userId", required: true }],
          },
          config: { disabled: true },
          visibleWhen: { source: "form", valuePath: "impliedAddonRoles", operator: "truthy" } as const,
        },
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
      gap: { compact: "sm", medium: "base" },
    },
  };
}

/**
 * How many days the `users:v1` access log keeps an entry (Admin -> Settings, phis-server
 * `PUT /api/site/admin/users-access/retention`, which takes `{ days }` and nothing else). One value, so one
 * field and the Form's Save; the placement binds it to the customer data access Provider's `retention`
 * record, which the Form reads when it mounts and again after it saved.
 *
 * The bounds are the route's: a whole number from 1 to 3650 (`PHIS_USERS_ACCESS_LOG_MAX_DAYS`). They are a
 * rule rather than the Control's `min`/`max`, because a Control with bounds puts a number out of range back
 * inside them when the field is left -- 5000 would quietly become 3650 and be saved, where the reader should
 * be told that 5000 is not offered.
 */
const USERS_ACCESS_LOG_MIN_DAYS = 1;
const USERS_ACCESS_LOG_MAX_DAYS = 3650;
const usersAccessRetentionDescriptor: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_USER_MANAGEMENT_FORM_IDS.usersAccessRetention,
  labelSetKey: "@phis/ui/modules/user-management/labels/users-access-retention",
  fields: [{
    key: "days",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
    label: label("days", "Kept for"),
    // The unit belongs to the value, not to the label.
    config: { step: 1, precision: 0, prefix: label("daysUnit", "days") },
    validation: [
      ...required("daysRequired", "Enter how many days the log keeps an entry."),
      {
        providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.number,
        message: label("daysInvalid", "A whole number of days from 1 to 3650."),
        config: { min: USERS_ACCESS_LOG_MIN_DAYS, max: USERS_ACCESS_LOG_MAX_DAYS, integer: true },
      },
    ],
  }],
  layout: { gap: { compact: "sm", medium: "base" } },
};

const loadUsersAccessRetentionLabels = createPhiFormLabelSetLoader(
  () => import("./trees/admin-users-access-label-set").then((module) => module.getPhiAdminUsersAccessLabels),
  (labels) => ({ ...labels.retention, actions: { submitLabel: labels.retention.save } }),
);

const loadLabels = createPhiFormLabelSetLoader(
  () => import("../../../components/widgets/label-sets/admin-users").then((module) => module.getPhiAdminUsersTableWidgetLabels),
  (labels) => ({
    firstName: labels.editor.firstName,
    firstNameRequired: labels.editor.firstNameRequired,
    lastName: labels.editor.lastName,
    lastNameRequired: labels.editor.lastNameRequired,
    email: labels.editor.email,
    emailRequired: labels.editor.emailRequired,
    emailInvalid: labels.editor.emailInvalid,
    displayName: labels.editor.displayName,
    company: labels.editor.company,
    roles: labels.editor.roles,
    rolesPlaceholder: labels.editor.rolesPlaceholder,
    rolesHint: labels.editor.selfRoleHint,
    addonRoles: labels.editor.addonRoles,
    addonRolesPlaceholder: labels.editor.addonRolesPlaceholder,
    addonRolesHint: labels.editor.addonRolesHint,
    impliedAddonRoles: labels.editor.impliedAddonRoles,
    impliedAddonRolesHint: labels.editor.impliedAddonRolesHint,
    authOnlyHint: labels.editor.authOnlyHint,
    createPasswordHint: labels.editor.createPasswordHint,
    enabled: labels.columns.enabled,
    changePassword: labels.editor.changePassword,
    create: labels.editor.createButton,
    creating: labels.editor.creatingButton,
    save: labels.editor.saveButton,
    saving: labels.editor.savingButton,
    cancel: labels.confirm.cancel,
    ...Object.fromEntries(PHI_BASE_ROLE_OPTIONS.map((option) => [`role_${option.value}`, option.label])),
  }),
);

export const PHI_USER_MANAGEMENT_RUNTIME_MODULE_FORMS = [
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
    areas: ["admin"],
    formId: PHI_USER_MANAGEMENT_FORM_IDS.create,
    version: 1,
    flags: 0,
    title: "Create user",
    description: "Create a site user and send the initial password-reset link.",
    category: "forms",
    tags: ["users", "create"],
    descriptor: descriptor(PHI_USER_MANAGEMENT_FORM_IDS.create, "create"),
    submitHandlerKey: PHI_USER_MANAGEMENT_FORM_HANDLER_KEYS.create,
    loadLabels,
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
    areas: ["admin"],
    formId: PHI_USER_MANAGEMENT_FORM_IDS.edit,
    version: 1,
    flags: 0,
    title: "Edit user",
    description: "Edit one site user and optionally require a password reset.",
    category: "forms",
    tags: ["users", "edit"],
    descriptor: descriptor(PHI_USER_MANAGEMENT_FORM_IDS.edit, "edit"),
    submitHandlerKey: PHI_USER_MANAGEMENT_FORM_HANDLER_KEYS.edit,
    loadLabels,
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
    areas: ["admin"],
    formId: PHI_USER_MANAGEMENT_FORM_IDS.usersAccessRetention,
    version: 1,
    flags: 0,
    title: "Access log retention",
    description: "How many days the access log of customer data keeps an entry.",
    category: "forms",
    tags: ["settings", "users", "admin"],
    descriptor: usersAccessRetentionDescriptor,
    submitHandlerKey: PHI_USER_MANAGEMENT_USERS_ACCESS_RETENTION_HANDLER_KEY,
    loadLabels: loadUsersAccessRetentionLabels,
  }),
] as const;

export const PHI_USER_MANAGEMENT_FORM_HANDLER_PROVIDER_DESCRIPTORS = [...Object.entries(
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
}) as const), {
  key: createPhiSharedFormProviderKey("handler", "user-management-users-access-retention"),
  ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
  title: "Access log retention",
  phase: "submit",
  handlerKey: PHI_USER_MANAGEMENT_USERS_ACCESS_RETENTION_HANDLER_KEY,
  category: "site",
  transport: "relay",
  method: "PUT",
  endpointKey: null,
  upstreamPath: "/api/site/admin/users-access/retention",
  csrfPath: null,
  requiresCsrf: false,
  credentialPolicy: "site-session",
} as const] satisfies readonly PhiFormHandlerProviderDescriptor[];
