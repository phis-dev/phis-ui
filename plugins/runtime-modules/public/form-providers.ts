import { PHI_FORM_HANDLER_PROVIDER_KEYS } from "../../../components/forms/form-provider-contract";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "./ids";

export const PHI_PUBLIC_FORM_HANDLER_PROVIDER_DESCRIPTORS = [
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.contact, ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID, title: "Contact", phase: "submit", handlerKey: "forms.contact", category: "forms", transport: "relay", method: "POST", endpointKey: null, upstreamPath: "/api/v1/forms/contact", csrfPath: null, requiresCsrf: false, credentialPolicy: "none" },
  /*
   * No credential and no CSRF, like the contact form beside it -- and for a stronger reason. Whoever holds
   * the link is who it was issued to, the signature in it says so, and the person pressing it is by
   * definition not signed in. A CSRF token would have to come from a session that does not exist.
   */
  { key: PHI_FORM_HANDLER_PROVIDER_KEYS.unsubscribe, ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID, title: "Unsubscribe", phase: "submit", handlerKey: "forms.unsubscribe", category: "forms", transport: "relay", method: "POST", endpointKey: null, upstreamPath: "/api/v1/notifications/unsubscribe", csrfPath: null, requiresCsrf: false, credentialPolicy: "none" },
] as const;
