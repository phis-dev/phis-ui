import {
  definePhiRuntimeModuleForm,
  PHI_FORM_PURPOSES,
  type PhiRuntimeModuleFormDefinition,
} from "../../../components/forms/form-registry";
import {
  PHI_CONFIRM_FORM_DESCRIPTOR,
  PHI_LOGIN_FORM_DESCRIPTOR,
  PHI_PROFILE_EMAIL_FORM_DESCRIPTOR,
  PHI_PROFILE_PASSWORD_FORM_DESCRIPTOR,
  PHI_PROVIDER_LINK_CONFIRMATION_FORM_DESCRIPTOR,
  PHI_REGISTRATION_FORM_DESCRIPTOR,
  PHI_RESET_PASSWORD_CONFIRM_FORM_DESCRIPTOR,
  PHI_RESET_PASSWORD_FORM_DESCRIPTOR,
} from "../../../components/forms/shared-form-descriptors";
import { PHI_SHARED_FORM_IDS } from "../../../components/forms/shared-form-ids";
import { createPhiFormLabelSetLoader, loadPhiFormLocale } from "../../../components/forms/shared-form-loaders";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "./ids";

/** The Forms the Auth Module registers: signing in, registering, confirming, the account credentials. */
export const PHI_AUTH_RUNTIME_MODULE_FORMS: readonly PhiRuntimeModuleFormDefinition[] = [
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    areas: ["public", "app"],
    formId: PHI_SHARED_FORM_IDS.login,
    version: 1,
    flags: 0,
    title: "Login",
    description: "Shared login form preset.",
    category: "preset",
    tags: ["preset", "shared"],
    descriptor: PHI_LOGIN_FORM_DESCRIPTOR,
    submitHandlerKey: "auth.login",
    loadLabels: createPhiFormLabelSetLoader(() => import("../../../components/widgets/label-sets/account")
      .then((module) => module.getPhiLoginFormLabels)),
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    areas: ["public", "app"],
    formId: PHI_SHARED_FORM_IDS.registration,
    version: 1,
    flags: 0,
    title: "Registration",
    description: "Shared registration form preset.",
    category: "preset",
    tags: ["preset", "shared"],
    descriptor: PHI_REGISTRATION_FORM_DESCRIPTOR,
    submitHandlerKey: "auth.registration",
    confirmHandlerKey: "auth.registration.confirm",
    loadLabels: createPhiFormLabelSetLoader(() => import("../../../components/widgets/label-sets/registration")
      .then((module) => module.getPhiRegistrationFormLabels)),
    loadInitialValues: loadPhiFormLocale,
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    areas: ["public", "app"],
    formId: PHI_SHARED_FORM_IDS.confirm,
    version: 1,
    flags: 0,
    title: "Confirm",
    description: "Shared confirmation form preset.",
    category: "preset",
    tags: ["preset", "shared"],
    descriptor: PHI_CONFIRM_FORM_DESCRIPTOR,
    submitHandlerKey: "auth.confirm",
    previewHandlerKey: "auth.confirm.preview",
    previewUpstreamPath: "/api/v1/forms/register/confirm-preview",
    loadLabels: createPhiFormLabelSetLoader(() => import("../../../components/widgets/label-sets/confirm")
      .then((module) => module.getPhiConfirmFormLabels)),
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    areas: ["public", "app"],
    formId: PHI_SHARED_FORM_IDS.resetPassword,
    version: 1,
    flags: 0,
    title: "Reset Password",
    description: "Shared password reset form preset.",
    category: "preset",
    tags: ["preset", "shared"],
    descriptor: PHI_RESET_PASSWORD_FORM_DESCRIPTOR,
    submitHandlerKey: "auth.reset-password",
    loadLabels: createPhiFormLabelSetLoader(() => import("../../../components/widgets/label-sets/reset-password")
      .then((module) => module.getPhiResetPasswordRequestFormLabels)),
    loadInitialValues: loadPhiFormLocale,
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    areas: ["public", "app"],
    formId: PHI_SHARED_FORM_IDS.resetPasswordConfirm,
    version: 1,
    flags: 0,
    title: "Reset Password Confirmation",
    description: "Second stage of a password reset: the token from the link and the new password.",
    category: "preset",
    tags: ["preset", "shared"],
    descriptor: PHI_RESET_PASSWORD_CONFIRM_FORM_DESCRIPTOR,
    submitHandlerKey: null,
    confirmHandlerKey: "auth.reset-password.confirm",
    loadLabels: createPhiFormLabelSetLoader(() => import("../../../components/widgets/label-sets/reset-password")
      .then((module) => module.getPhiResetPasswordConfirmFormLabels)),
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    areas: ["public", "app"],
    formId: PHI_SHARED_FORM_IDS.providerLinkConfirmation,
    version: 1,
    flags: 0,
    title: "Provider link confirmation",
    description: "Confirm linking an external authentication provider to an existing account.",
    category: "preset",
    tags: ["preset", "auth", "provider-link"],
    descriptor: PHI_PROVIDER_LINK_CONFIRMATION_FORM_DESCRIPTOR,
    submitHandlerKey: null,
    confirmHandlerKey: "auth.provider-link.confirm",
    loadLabels: createPhiFormLabelSetLoader(() => import("../../../components/widgets/label-sets/account")
      .then((module) => module.getPhiProviderLinkConfirmationFormLabels)),
  }),
  /*
   * App only, and that is the whole of the access rule: the Area is authenticated, and a Form that
   * changes a credential has nobody to change it for until somebody is signed in.
   */
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    areas: ["app"],
    formId: PHI_SHARED_FORM_IDS.profilePassword,
    version: 1,
    flags: 0,
    title: "Password",
    description: "Change the password of the signed-in account.",
    category: "preset",
    tags: ["account", "security"],
    descriptor: PHI_PROFILE_PASSWORD_FORM_DESCRIPTOR,
    purpose: PHI_FORM_PURPOSES.accountPasswordChange,
    submitHandlerKey: "auth.profile.password",
    loadLabels: createPhiFormLabelSetLoader(() => import("../../../components/widgets/label-sets/profile")
      .then((module) => module.getPhiProfilePasswordFormLabels)),
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    areas: ["app"],
    formId: PHI_SHARED_FORM_IDS.profileEmail,
    version: 1,
    flags: 0,
    title: "Email",
    description: "Ask for the account's email address to be moved to another one.",
    category: "preset",
    tags: ["account", "security"],
    descriptor: PHI_PROFILE_EMAIL_FORM_DESCRIPTOR,
    submitHandlerKey: "auth.profile.email",
    loadLabels: createPhiFormLabelSetLoader(() => import("../../../components/widgets/label-sets/profile")
      .then((module) => module.getPhiProfileEmailFormLabels)),
  }),
];
