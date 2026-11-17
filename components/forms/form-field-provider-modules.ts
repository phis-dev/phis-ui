import type { PhiFormFieldDescriptor, PhiFormProviderKey } from "../../types/form-descriptor";
import type { PhiRuntimeModuleId } from "../../types/cms-module-descriptors";

/**
 * Which Modules a Form's field types belong to, other than the Form's own.
 *
 * A field type is a Module's to offer, and a Form of any Module may use it. For each field whose type an
 * installed Module owns:
 * - the owner is the Form's own Module: nothing to add, its UI provider is mounted anyway;
 * - the owner is active in the Area and brings a UI provider: that provider is mounted for this Form;
 * - the owner is not active in the Area: the field is marked unavailable, and the Form says so in its place.
 *
 * A key no installed Module owns (the shared registry's) is not this question's business.
 */
export function readPhiFormFieldProviderModules({
  fields,
  formOwnerModuleId,
  ownerModuleIdByFieldTypeKey,
  activeModuleIds,
  uiProviderModuleIds,
}: {
  fields: readonly Pick<PhiFormFieldDescriptor, "key" | "fieldProviderKey">[];
  formOwnerModuleId: PhiRuntimeModuleId;
  ownerModuleIdByFieldTypeKey: ReadonlyMap<PhiFormProviderKey, PhiRuntimeModuleId>;
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>;
  uiProviderModuleIds: ReadonlySet<PhiRuntimeModuleId>;
}) {
  const providerModuleIds = new Set<PhiRuntimeModuleId>();
  const unavailableFieldKeys: string[] = [];
  for (const field of fields) {
    const owner = ownerModuleIdByFieldTypeKey.get(field.fieldProviderKey);
    if (!owner || owner === formOwnerModuleId) {
      continue;
    }
    if (!activeModuleIds.has(owner)) {
      unavailableFieldKeys.push(field.key);
    } else if (uiProviderModuleIds.has(owner)) {
      providerModuleIds.add(owner);
    }
  }
  return { providerModuleIds: [...providerModuleIds], unavailableFieldKeys };
}
