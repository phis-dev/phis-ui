import type { PhiCmsConfigField } from "./cms-plugins";
import type { PhiRuntimeModuleId } from "./cms-plugins";
import type { PhiFormProviderKey } from "@phis/contracts/forms";
import type {
  PhiFormSubmitCategory,
  PhiFormSubmitMethod,
  PhiFormSubmitTransport,
} from "./form-submit-route";

/*
 * The descriptor itself is stored by phis-server and written by Module presets and the Form Builder, so
 * it is `@phis/contracts/forms`. What stays here is the Module registry around it: which field types,
 * validation rules and handlers the active Modules provide.
 */
export {
  PHI_FORM_DEFAULT_SUBMIT_LABEL,
  PHI_FORM_DESCRIPTOR_SCHEMA_VERSION,
  PHI_FORM_GRID_TRACKS,
  type PhiFormDescriptor,
  type PhiFormErrorTemplateDescriptor,
  type PhiFormErrorTextDescriptor,
  type PhiFormFieldDescriptor,
  type PhiFormFieldPlacementDescriptor,
  type PhiFormGridRange,
  type PhiFormLabelSetKey,
  type PhiFormLayoutDescriptor,
  type PhiFormLogicalAlignment,
  type PhiFormOptionDescriptor,
  type PhiFormProviderKey,
  type PhiFormResponsiveGridRange,
  type PhiFormSubmitDescriptor,
  type PhiFormSuccessDescriptor,
  type PhiFormTextDescriptor,
  type PhiFormValidationRuleDescriptor,
} from "@phis/contracts/forms";

export type PhiFormHandlerPhase = "submit" | "confirm" | "preview";
export type PhiFormHandlerCredentialPolicy = "none" | "site-session" | "auth-link";

export type PhiFormFieldTypeProviderDescriptor = {
  key: PhiFormProviderKey;
  ownerModuleId: PhiRuntimeModuleId;
  title: string;
  description?: string;
  valueType: "string" | "number" | "boolean" | "string[]" | "json";
  presentation: "control" | "hidden" | "honeypot";
  settingsFields?: readonly PhiCmsConfigField[];
};

export type PhiFormValidationProviderDescriptor = {
  key: PhiFormProviderKey;
  ownerModuleId: PhiRuntimeModuleId;
  title: string;
  description?: string;
  settingsFields?: readonly PhiCmsConfigField[];
};

export type PhiFormHandlerProviderDescriptor = {
  key: PhiFormProviderKey;
  ownerModuleId: PhiRuntimeModuleId;
  title: string;
  description?: string;
  phase: PhiFormHandlerPhase;
  handlerKey: string;
  category: PhiFormSubmitCategory;
  transport: PhiFormSubmitTransport;
  method: PhiFormSubmitMethod;
  endpointKey: string | null;
  upstreamPath: string | null;
  csrfPath: string | null;
  requiresCsrf: boolean;
  credentialPolicy: PhiFormHandlerCredentialPolicy;
  /**
   * How the relay turns the Form's flat values into the request a Core route takes, where it is not the
   * values as they are (FORMS.md, "Request shape"). A `{key}` segment of `upstreamPath` is the value of
   * that field, percent-encoded, and leaves the body; `objects` gathers the named fields under one body
   * key; `flags` folds the named boolean fields into one bit-flag number under one body key, a bit per
   * field that is `true`. A field the shape does not name stays at the top of the body. Absent, the
   * values are the body, as they always were.
   */
  request?: {
    objects?: Readonly<Record<string, readonly string[]>>;
    flags?: Readonly<Record<string, Readonly<Record<string, number>>>>;
  };
};

export type PhiRuntimeModuleFormProviderDescriptors = {
  fieldTypes?: readonly PhiFormFieldTypeProviderDescriptor[];
  validationRules?: readonly PhiFormValidationProviderDescriptor[];
  handlers?: readonly PhiFormHandlerProviderDescriptor[];
};
