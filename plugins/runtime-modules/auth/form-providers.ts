import {
  PHI_AUTH_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_HANDLER_PROVIDER_KEYS,
} from "../../../components/forms/form-provider-contract";
import type { PhiFormFieldTypeProviderDescriptor } from "../../../types/form-descriptor";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "./ids";

export const PHI_AUTH_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_AUTH_FORM_FIELD_PROVIDER_KEYS.termsConsent,
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    title: "Terms consent",
    valueType: "boolean",
    presentation: "control",
    settingsFields: [
      { key: "text", type: "string", label: "Consent sentence, with %1 where the link goes" },
      { key: "linkLabel", type: "string", label: "Link label" },
      { key: "href", type: "url", label: "Link URL", required: true },
    ],
  },
] as const satisfies readonly PhiFormFieldTypeProviderDescriptor[];

export const PHI_AUTH_FORM_HANDLER_PROVIDER_DESCRIPTORS = [
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authAdminInstallationCreate, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Auth Admin installation create", phase: "submit", handlerKey: "auth.admin.installation-create", category: "auth", transport: "relay", method: "POST", endpointKey: null, upstreamPath: "/api/v1/auth/admin/installations", csrfPath: "/api/v1/auth/csrf", requiresCsrf: true, credentialPolicy: "site-session" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authAdminInstallationUpdate, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Auth Admin installation update", phase: "submit", handlerKey: "auth.admin.installation-update", category: "auth", transport: "relay", method: "PATCH", endpointKey: null, upstreamPath: "/api/v1/auth/admin/installations", csrfPath: "/api/v1/auth/csrf", requiresCsrf: true, credentialPolicy: "site-session" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authAdminPolicy, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Auth Admin policy", phase: "submit", handlerKey: "auth.admin.policy", category: "auth", transport: "relay", method: "PATCH", endpointKey: null, upstreamPath: "/api/v1/auth/admin/policy", csrfPath: "/api/v1/auth/csrf", requiresCsrf: true, credentialPolicy: "site-session" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authAdminPasswordMethod, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Auth Admin password method", phase: "submit", handlerKey: "auth.admin.password-method", category: "auth", transport: "relay", method: "PATCH", endpointKey: null, upstreamPath: "/api/v1/auth/admin/password-method", csrfPath: "/api/v1/auth/csrf", requiresCsrf: true, credentialPolicy: "site-session" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authAdminTotpPolicy, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Auth Admin two-factor policy", phase: "submit", handlerKey: "auth.admin.totp-policy", category: "auth", transport: "relay", method: "PATCH", endpointKey: null, upstreamPath: "/api/v1/auth/admin/totp-policy", csrfPath: "/api/v1/auth/csrf", requiresCsrf: true, credentialPolicy: "site-session" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authLogin, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Login", phase: "submit", handlerKey: "auth.login", category: "auth", transport: "relay", method: "POST", endpointKey: null, upstreamPath: "/api/v1/auth/password/login", csrfPath: "/api/v1/auth/csrf", requiresCsrf: true, credentialPolicy: "none" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authRegistration, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Registration", phase: "submit", handlerKey: "auth.registration", category: "auth", transport: "relay", method: "POST", endpointKey: null, upstreamPath: "/api/v1/forms/register", csrfPath: null, requiresCsrf: false, credentialPolicy: "none" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authRegistrationConfirm, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Registration Confirm", phase: "confirm", handlerKey: "auth.registration.confirm", category: "auth", transport: "relay", method: "POST", endpointKey: null, upstreamPath: "/api/v1/forms/register/confirm", csrfPath: null, requiresCsrf: false, credentialPolicy: "none" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authConfirm, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Confirm", phase: "submit", handlerKey: "auth.confirm", category: "auth", transport: "relay", method: "POST", endpointKey: null, upstreamPath: "/api/v1/forms/register/confirm", csrfPath: null, requiresCsrf: false, credentialPolicy: "none" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authConfirmPreview, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Confirm Preview", phase: "preview", handlerKey: "auth.confirm.preview", category: "auth", transport: "relay", method: "GET", endpointKey: null, upstreamPath: "/api/v1/forms/register/confirm-preview", csrfPath: null, requiresCsrf: false, credentialPolicy: "none" },
  // Both reset steps verify the CSRF token now, like every other write under `/api/v1/auth`.
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authResetPassword, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Reset Password", phase: "submit", handlerKey: "auth.reset-password", category: "auth", transport: "relay", method: "POST", endpointKey: null, upstreamPath: "/api/v1/auth/password/reset/request", csrfPath: "/api/v1/auth/csrf", requiresCsrf: true, credentialPolicy: "none" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authResetPasswordConfirm, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Reset Password Confirm", phase: "confirm", handlerKey: "auth.reset-password.confirm", category: "auth", transport: "relay", method: "POST", endpointKey: null, upstreamPath: "/api/v1/auth/password/reset/confirm", csrfPath: "/api/v1/auth/csrf", requiresCsrf: true, credentialPolicy: "none" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authProviderLinkConfirm, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Provider Link Confirm", phase: "confirm", handlerKey: "auth.provider-link.confirm", category: "auth", transport: "relay", method: "POST", endpointKey: null, upstreamPath: "/api/v1/auth/providers/link/confirm", csrfPath: "/api/v1/auth/csrf", requiresCsrf: true, credentialPolicy: "auth-link" },
  /*
   * The two account credentials, reached with the session and nothing else.
   *
   * `site-session` is what makes them the asking person's own: the relay forwards the Site session
   * cookie, so the server answers about whoever is asking and no account id is ever sent. The email
   * one posts to `/request` because that is all a submit does -- the address moves when the link in
   * the mail is followed, through the registration confirm handler that already exists.
   */
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authProfilePassword, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Account password", phase: "submit", handlerKey: "auth.profile.password", category: "auth", transport: "relay", method: "PATCH", endpointKey: null, upstreamPath: "/api/v1/auth/profile/password", csrfPath: "/api/v1/auth/csrf", requiresCsrf: true, credentialPolicy: "site-session" },
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.authProfileEmail, ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, title: "Account email", phase: "submit", handlerKey: "auth.profile.email", category: "auth", transport: "relay", method: "POST", endpointKey: null, upstreamPath: "/api/v1/auth/profile/email/request", csrfPath: "/api/v1/auth/csrf", requiresCsrf: true, credentialPolicy: "site-session" },
] as const;
