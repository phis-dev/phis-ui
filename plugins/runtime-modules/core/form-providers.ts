import {
  PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS,
  PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS,
} from "../../../components/forms/form-provider-contract";
import type { PhiRuntimeModuleFormProviderDescriptors } from "../../../types/form-descriptor";
import { PHI_CORE_RUNTIME_MODULE_ID } from "./ids";
import { PHI_CORE_MESSAGING_FORM_HANDLER_DESCRIPTORS } from "./messaging/forms";

/** The shared field types and validation rules, registered by the Module every Site carries. */
export const PHI_CORE_FORM_PROVIDER_DESCRIPTORS = {
  fieldTypes: PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS.map((descriptor) => ({
    ...descriptor,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
  })),
  validationRules: PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS.map((descriptor) => ({
    ...descriptor,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
  })),
  // Writing into a conversation: the handler of Core's Reply Form (`messaging/forms.ts`).
  handlers: PHI_CORE_MESSAGING_FORM_HANDLER_DESCRIPTORS,
} as const satisfies PhiRuntimeModuleFormProviderDescriptors;
