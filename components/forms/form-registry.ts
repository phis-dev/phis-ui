import type { PhiFormRenderer } from "./form-resolution";
import type { PhiFormLabelSetLoader } from "./form-resolution";
import type { PhiFormDescriptor } from "../../types/form-descriptor";
import type { PhiRuntimeModuleId } from "../../types/cms-module-descriptors";
import type { PhiFormId } from "../../types/form-id";
import { isPhiFormId, normalizePhiFormId } from "../../types/form-id";
import { parsePhiFormDescriptor } from "./form-descriptor-contract";

export type PhiRuntimeModuleFormDefinition = {
  ownerModuleId: PhiRuntimeModuleId;
  formId: PhiFormId;
  version: number;
  flags: number;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[];
  descriptor: PhiFormDescriptor;
  submitHandlerKey: string | null;
  confirmHandlerKey: string | null;
  previewHandlerKey: string | null;
  defaultConfig: Record<string, unknown>;
  variant: string | null;
  config: Record<string, unknown>;
  previewUpstreamPath: string | null;
  render?: PhiFormRenderer;
  loadLabels?: PhiFormLabelSetLoader;
};

export function definePhiRuntimeModuleForm(
  definition: PhiRuntimeModuleFormDefinition,
): PhiRuntimeModuleFormDefinition {
  const formId = normalizePhiFormId(definition.formId);
  if (!isPhiFormId(formId)) {
    throw new Error(`Invalid namespaced Form id "${definition.formId}".`);
  }
  const descriptor = parsePhiFormDescriptor(definition.descriptor);
  if (descriptor.key !== formId) {
    throw new Error(
      `Form descriptor key "${descriptor.key}" must match formId "${formId}".`,
    );
  }
  if (!Number.isInteger(definition.version) || definition.version < 1) {
    throw new Error(`Form "${formId}" must declare a positive integer version.`);
  }
  return {
    ...definition,
    descriptor,
    formId,
  };
}
