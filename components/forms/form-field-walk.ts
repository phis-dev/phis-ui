import type { PhiFormFieldDescriptor } from "../../types/form-descriptor";

/**
 * Every field of a Form at every level: its own, and the entry fields of each of its list fields
 * (`PhiFormFieldDescriptor.fields`), depth first. What a Form needs of its Area -- the field types, the
 * validation rules, the Modules that own them, the words a field type says -- is needed as much by a field
 * of an entry as by a field of the Form: the entry dialog draws them.
 */
export function listPhiFormFieldsDeep(fields: readonly PhiFormFieldDescriptor[]): PhiFormFieldDescriptor[] {
  return fields.flatMap((field) => [field, ...listPhiFormFieldsDeep(field.fields ?? [])]);
}
