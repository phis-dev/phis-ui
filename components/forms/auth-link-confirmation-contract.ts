import { PHI_SHARED_FORM_IDS } from "./shared-form-ids";

export const PHI_AUTH_LINK_CONFIRMATION_CONTRACT = {
  formId: PHI_SHARED_FORM_IDS.providerLinkConfirmation,
  submitHandlerKey: "auth.provider-link.confirm",
  upstreamPath: "/api/v1/auth/providers/link/confirm",
  csrfPath: "/api/v1/auth/csrf",
  cookieName: "phis_auth_link",
} as const;
