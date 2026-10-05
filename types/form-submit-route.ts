import type { PhiFormHandlerCredentialPolicy } from "./form-descriptor";

export type PhiFormSubmitCategory = "auth" | "account" | "forms" | "site";

export type PhiFormSubmitTransport = "relay" | "api" | "serverAction";

export type PhiFormSubmitMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Where a Form's submit goes: the route the gateway resolves from the Form id and its handler Provider.
 *
 * Not the Form's submit button -- that is `PhiFormSubmitDescriptor` in `@phis/contracts/forms`, the
 * label, alignment and control an author declares. The two carried one name, one reachable through
 * `@phis/ui/forms` and the other through `@phis/ui/types`, so a Module importing from the wrong door
 * compiled against a type that meant something else. Declared here, in the contract layer, because the
 * gateway that builds it is `server-only` and a type in `types/` must not lead there.
 */
export type PhiFormSubmitRoute = {
  formId: string;
  submitHandlerKey: string;
  category: PhiFormSubmitCategory;
  transport: PhiFormSubmitTransport;
  method: PhiFormSubmitMethod;
  endpointKey: string | null;
  actionKey: string | null;
  upstreamPath: string | null;
  csrfPath: string | null;
  requiresCsrf: boolean;
  credentialPolicy: PhiFormHandlerCredentialPolicy;
};
