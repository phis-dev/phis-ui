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
  PHI_RESET_PASSWORD_FORM_DESCRIPTOR,
} from "./shared-form-descriptors";
import { PHI_SHARED_FORM_IDS } from "./shared-form-ids";
import type { PhiFormLabelSetLoader } from "./form-resolution";
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

export const PHI_SHARED_FORM_DEFINITIONS: readonly PhiRuntimeModuleFormDefinition[] = [
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
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
    defaultConfig: { forgotPasswordHref: "/reset-password" },
    variant: "default",
    config: {},
    previewUpstreamPath: null,
    render: (context) => import("./form-renderers")
      .then((module) => module.renderPhiLoginForm(context)),
    loadLabels: createLabelLoader(() => import("../widgets/label-sets/account")
      .then((module) => module.getPhiLoginFormLabels)),
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
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
    render: (context) => import("./form-renderers")
      .then((module) => module.renderPhiRegistrationForm(context)),
    loadLabels: createLabelLoader(() => import("../widgets/label-sets/registration")
      .then((module) => module.getPhiRegistrationFormLabels)),
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
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
    render: (context) => import("./form-renderers")
      .then((module) => module.renderPhiContactForm(context)),
    loadLabels: createLabelLoader(() => import("../widgets/label-sets/contact")
      .then((module) => module.getPhiContactFormLabels)),
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
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
    render: (context) => import("./form-renderers")
      .then((module) => module.renderPhiConfirmForm(context)),
    loadLabels: createLabelLoader(() => import("../widgets/label-sets/confirm")
      .then((module) => module.getPhiConfirmWidgetLabels)),
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    formId: PHI_SHARED_FORM_IDS.resetPassword,
    version: 1,
    flags: 0,
    title: "Reset Password",
    description: "Shared password reset form preset.",
    category: "preset",
    tags: ["preset", "shared"],
    descriptor: PHI_RESET_PASSWORD_FORM_DESCRIPTOR,
    submitHandlerKey: "auth.reset-password",
    confirmHandlerKey: "auth.reset-password.confirm",
    previewHandlerKey: null,
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: null,
    render: (context) => import("./form-renderers")
      .then((module) => module.renderPhiResetPasswordForm(context)),
    loadLabels: createLabelLoader(() => import("../widgets/label-sets/reset-password")
      .then((module) => module.getPhiResetPasswordWidgetLabels)),
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
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
  }),
];

export const PHI_PUBLIC_RUNTIME_MODULE_FORMS = PHI_SHARED_FORM_DEFINITIONS.filter(
  (definition) => definition.ownerModuleId === PHI_PUBLIC_RUNTIME_MODULE_ID,
);

export const PHI_AUTH_RUNTIME_MODULE_FORMS = PHI_SHARED_FORM_DEFINITIONS.filter(
  (definition) => definition.ownerModuleId === PHI_AUTH_RUNTIME_MODULE_ID,
);
