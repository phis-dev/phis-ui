import {
  definePhiRuntimeModuleForm,
  PHI_FORM_PURPOSES,
  type PhiRuntimeModuleFormDefinition,
} from "./form-registry";
import {
  PHI_CONFIRM_FORM_DESCRIPTOR,
  PHI_CONTACT_FORM_DESCRIPTOR,
  PHI_LOGIN_FORM_DESCRIPTOR,
  PHI_PROFILE_EMAIL_FORM_DESCRIPTOR,
  PHI_PROFILE_PASSWORD_FORM_DESCRIPTOR,
  PHI_PROVIDER_LINK_CONFIRMATION_FORM_DESCRIPTOR,
  PHI_REGISTRATION_FORM_DESCRIPTOR,
  PHI_RESET_PASSWORD_CONFIRM_FORM_DESCRIPTOR,
  PHI_RESET_PASSWORD_FORM_DESCRIPTOR,
} from "./shared-form-descriptors";
import { PHI_SHARED_FORM_IDS } from "./shared-form-ids";
import type { PhiFormInitialValuesLoader, PhiFormLabelSetLoader } from "./form-resolution";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../../plugins/runtime-modules/public/ids";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../../plugins/runtime-modules/auth/ids";

function createLabelLoader(
  load: () => Promise<
    (options: { apiBaseUrl: string; internalToken: string; locale: string }) => Promise<unknown>
  >,
): PhiFormLabelSetLoader {
  return async ({ runtime }) => {
    const [{ flattenPhiFormLabels }, { phiRuntime }, loadLabels] = await Promise.all([
      import("./form-labels"),
      import("../../server-helpers/phi-runtime"),
      load(),
    ]);
    const rt = phiRuntime(runtime);
    return flattenPhiFormLabels(await loadLabels({
      apiBaseUrl: rt.apiBaseUrl,
      internalToken: rt.internalToken,
      locale: runtime.locale.current,
    }));
  };
}

/**
 * The language the form was read in, handed to the handler as one of its values.
 *
 * A form that makes the server write an email is the case: the address, the name and the password say
 * nothing about which language the person was reading, and the handler falls back to the Site's default
 * -- so a Site that answers in English by default sent an English email to somebody who had just filled
 * in a German form. The Site's locale is known where the form is rendered, on the server, and a hidden
 * field is where a value nobody types belongs.
 *
 * Read on the render rather than resolved again in the handler, because the two would then be separate
 * answers to one question: what a person was reading is what the page was drawn in, not what a request
 * arriving later happens to negotiate.
 */
const loadFormLocale: PhiFormInitialValuesLoader = ({ runtime }) => ({
  locale: runtime.locale.current,
});

export const PHI_SHARED_FORM_DEFINITIONS: readonly PhiRuntimeModuleFormDefinition[] = [
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
    confirmHandlerKey: null,
    previewHandlerKey: null,
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: null,
    loadLabels: createLabelLoader(() => import("../widgets/label-sets/account")
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
    previewHandlerKey: null,
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: null,
    loadLabels: createLabelLoader(() => import("../widgets/label-sets/registration")
      .then((module) => module.getPhiRegistrationFormLabels)),
    loadInitialValues: loadFormLocale,
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    areas: ["public"],
    formId: PHI_SHARED_FORM_IDS.contact,
    version: 1,
    flags: 0,
    title: "Contact",
    description: "Shared contact form preset.",
    category: "preset",
    tags: ["preset", "shared"],
    descriptor: PHI_CONTACT_FORM_DESCRIPTOR,
    submitHandlerKey: "forms.contact",
    confirmHandlerKey: null,
    previewHandlerKey: null,
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: null,
    loadLabels: createLabelLoader(() => import("../widgets/label-sets/contact")
      .then((module) => module.getPhiContactFormLabels)),
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
    confirmHandlerKey: null,
    previewHandlerKey: "auth.confirm.preview",
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: "/api/v1/forms/register/confirm-preview",
    loadLabels: createLabelLoader(() => import("../widgets/label-sets/confirm")
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
    confirmHandlerKey: null,
    previewHandlerKey: null,
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: null,
    loadLabels: createLabelLoader(() => import("../widgets/label-sets/reset-password")
      .then((module) => module.getPhiResetPasswordRequestFormLabels)),
    loadInitialValues: loadFormLocale,
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
    previewHandlerKey: null,
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: null,
    loadLabels: createLabelLoader(() => import("../widgets/label-sets/reset-password")
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
    previewHandlerKey: null,
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: null,
    loadLabels: createLabelLoader(() => import("../widgets/label-sets/account")
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
    confirmHandlerKey: null,
    previewHandlerKey: null,
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: null,
    loadLabels: createLabelLoader(() => import("../widgets/label-sets/profile")
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
    confirmHandlerKey: null,
    previewHandlerKey: null,
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: null,
    loadLabels: createLabelLoader(() => import("../widgets/label-sets/profile")
      .then((module) => module.getPhiProfileEmailFormLabels)),
  }),
];

export const PHI_PUBLIC_RUNTIME_MODULE_FORMS = PHI_SHARED_FORM_DEFINITIONS.filter(
  (definition) => definition.ownerModuleId === PHI_PUBLIC_RUNTIME_MODULE_ID,
);

export const PHI_AUTH_RUNTIME_MODULE_FORMS = PHI_SHARED_FORM_DEFINITIONS.filter(
  (definition) => definition.ownerModuleId === PHI_AUTH_RUNTIME_MODULE_ID,
);
