import type { PhiCmsConfigField } from "./cms-plugins";
import type { PhiRuntimeModuleId } from "./cms-plugins";
import type { PhiControlOption } from "../components/controls/phi-control-options";
import type { PhiControlOptionsProviderConfig } from "../components/controls/phi-control-options";
import type { PhiResponsiveValue } from "./responsive";
import type { PhiRuntimeConditionExpression } from "./runtime-condition";
import type { PhiSpacingToken } from "./spacing";
import type {
  PhiFormSubmitCategory,
  PhiFormSubmitMethod,
  PhiFormSubmitTransport,
} from "../gateway/form-submit";

export type PhiFormProviderKey = `${string}/${string}`;

export type PhiFormLabelSetKey = `${string}/${string}`;

export const PHI_FORM_DESCRIPTOR_SCHEMA_VERSION = 1 as const;

export type PhiFormTextDescriptor =
  | {
      kind: "literal";
      value: string;
    }
  | {
      kind: "label";
      key: string;
      fallback: string;
    };

export type PhiFormGridPlacement = {
  span?: number;
  offset?: number;
  order?: number;
};

export type PhiFormResponsiveGridPlacement =
  PhiResponsiveValue<PhiFormGridPlacement>;

export type PhiFormColumnCount = 1 | 2 | 3 | 4;

export type PhiFormLabelPlacement = "top" | "side";

export type PhiFormLogicalAlignment = "start" | "center" | "end";

export type PhiFormLayoutDescriptor = {
  columns?: PhiResponsiveValue<PhiFormColumnCount>;
  gap?: PhiResponsiveValue<PhiSpacingToken>;
  labelPlacement?: PhiFormLabelPlacement;
  labelAlign?: Exclude<PhiFormLogicalAlignment, "center">;
  labelGrid?: PhiFormResponsiveGridPlacement;
  controlGrid?: PhiFormResponsiveGridPlacement;
};

export type PhiFormFieldPlacementDescriptor = {
  cell?: PhiFormResponsiveGridPlacement;
  label?: PhiFormResponsiveGridPlacement;
  control?: PhiFormResponsiveGridPlacement;
};

export type PhiFormValidationRuleDescriptor = {
  providerKey: PhiFormProviderKey;
  message?: PhiFormTextDescriptor;
  config?: Record<string, unknown>;
};

export type PhiFormOptionDescriptor = Omit<
  PhiControlOption,
  "label" | "description"
> & {
  label: PhiFormTextDescriptor;
  description?: PhiFormTextDescriptor;
};

export type PhiFormFieldDescriptor = {
  key: string;
  fieldProviderKey: PhiFormProviderKey;
  label?: PhiFormTextDescriptor;
  controlLabel?: PhiFormTextDescriptor;
  description?: PhiFormTextDescriptor;
  placeholder?: PhiFormTextDescriptor;
  autoComplete?: string;
  initialValue?: unknown;
  options?: readonly PhiFormOptionDescriptor[];
  optionsProvider?: PhiControlOptionsProviderConfig | null;
  validation?: readonly PhiFormValidationRuleDescriptor[];
  visibleWhen?: PhiRuntimeConditionExpression;
  disabledWhen?: PhiRuntimeConditionExpression;
  placement?: PhiFormFieldPlacementDescriptor;
  config?: Record<string, unknown>;
};

export type PhiFormDescriptor = {
  schemaVersion: typeof PHI_FORM_DESCRIPTOR_SCHEMA_VERSION;
  key: string;
  labelSetKey?: PhiFormLabelSetKey;
  fields: readonly PhiFormFieldDescriptor[];
  layout?: PhiFormLayoutDescriptor;
};

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
};

export type PhiRuntimeModuleFormProviderDescriptors = {
  fieldTypes?: readonly PhiFormFieldTypeProviderDescriptor[];
  validationRules?: readonly PhiFormValidationProviderDescriptor[];
  handlers?: readonly PhiFormHandlerProviderDescriptor[];
};
