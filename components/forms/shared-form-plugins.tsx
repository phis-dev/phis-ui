import {
  definePhiRuntimeModuleForm,
  type PhiRuntimeModuleFormDefinition,
} from "./form-registry";
import {
  PHI_CONFIRM_FORM_DESCRIPTOR,
  PHI_CONTACT_FORM_DESCRIPTOR,
  PHI_LOGIN_FORM_DESCRIPTOR,
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
 * The guard token a public form needs before anyone can fill it in.
 *
 * Minted per render and per form, so it cannot be a constant and cannot be asked for from the browser.
 * It reaches the fields the way any other known value does -- as an initial value for the hidden fields
 * that carry it -- which is why a public form no longer needs a component of its own to be rendered.
 */
function createFormGuardLoader(form: string): PhiFormInitialValuesLoader {
  return async ({ runtime }) => {
    const [{ fetchFormGuard }, { phiRuntime }] = await Promise.all([
      import("../../gateway/form-guard"),
      import("../../server-helpers/phi-runtime"),
    ]);
    const rt = phiRuntime(runtime);
    const guard = await fetchFormGuard({
      apiBaseUrl: rt.apiBaseUrl,
      internalToken: rt.internalToken,
      siteKey: rt.siteKey,
      form,
    });
    return { issuedAt: guard.issuedAt, formToken: guard.formToken };
  };
}

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
    defaultConfig: { forgotPasswordHref: "/reset-password", registerHref: "/register" },
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
    loadInitialValues: createFormGuardLoader(PHI_SHARED_FORM_IDS.registration),
    loadLabels: createLabelLoader(() => import("../widgets/label-sets/registration")
      .then((module) => module.getPhiRegistrationFormLabels)),
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
    loadInitialValues: createFormGuardLoader(PHI_SHARED_FORM_IDS.contact),
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
];

export const PHI_PUBLIC_RUNTIME_MODULE_FORMS = PHI_SHARED_FORM_DEFINITIONS.filter(
  (definition) => definition.ownerModuleId === PHI_PUBLIC_RUNTIME_MODULE_ID,
);

export const PHI_AUTH_RUNTIME_MODULE_FORMS = PHI_SHARED_FORM_DEFINITIONS.filter(
  (definition) => definition.ownerModuleId === PHI_AUTH_RUNTIME_MODULE_ID,
);
