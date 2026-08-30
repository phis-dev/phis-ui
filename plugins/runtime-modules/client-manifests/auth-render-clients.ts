import {
  definePhiRuntimeModuleRenderClientLoader,
  type PhiRuntimeModuleRenderClientLoader,
} from "../../../components/runtime/runtime-module-render-client-manifest";
import { PhiRuntimeRenderClientType } from "../../../constants/runtime-render-client-types";

export const PHI_AUTH_RUNTIME_MODULE_RENDER_CLIENT_LOADERS = [
  [
    PhiRuntimeRenderClientType.AuthLogout,
    definePhiRuntimeModuleRenderClientLoader(
      () => import("../auth/widgets/logout/client")
        .then((module) => module.PhiAuthLogoutWidgetClient),
    ),
  ],
  [
    PhiRuntimeRenderClientType.FormConfirm,
    definePhiRuntimeModuleRenderClientLoader(
      () => import("../../../components/widgets/client/confirm-body")
        .then((module) => module.PhiConfirmFormClient),
    ),
  ],
  [
    PhiRuntimeRenderClientType.FormLogin,
    definePhiRuntimeModuleRenderClientLoader(
      () => import("../../../components/widgets/client/login-body")
        .then((module) => module.PhiLoginWidget),
    ),
  ],
  [
    PhiRuntimeRenderClientType.FormRegistration,
    definePhiRuntimeModuleRenderClientLoader(
      () => import("../../../components/widgets/client/registration-body")
        .then((module) => module.PhiRegistrationFormClient),
    ),
  ],
  [
    PhiRuntimeRenderClientType.FormResetPassword,
    definePhiRuntimeModuleRenderClientLoader(
      () => import("../../../components/widgets/client/reset-password-body")
        .then((module) => module.PhiResetPasswordFormClient),
    ),
  ],
] as const satisfies ReadonlyArray<readonly [string, PhiRuntimeModuleRenderClientLoader]>;

export const PHI_AUTH_SECURITY_RENDER_CLIENT_LOADER = [
  PhiRuntimeRenderClientType.AuthSecurity,
  definePhiRuntimeModuleRenderClientLoader(
    () => import("../auth/widgets/security/client")
      .then((module) => module.PhiAuthSecurityWidgetClient),
  ),
] as const satisfies readonly [string, PhiRuntimeModuleRenderClientLoader];

export const PHI_CONTACT_FORM_RENDER_CLIENT_LOADER = [
  PhiRuntimeRenderClientType.FormContact,
  definePhiRuntimeModuleRenderClientLoader(
    () => import("../../../components/widgets/client/contact-body")
      .then((module) => module.PhiContactFormClient),
  ),
] as const satisfies readonly [string, PhiRuntimeModuleRenderClientLoader];
