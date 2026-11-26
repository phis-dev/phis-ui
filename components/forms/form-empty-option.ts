import type { PhiFormFieldDescriptor } from "@phis/contracts/forms";

/*
 * A select field's "none of these" (`emptyOption`, FORMS.md "The empty option"): an option the field
 * draws last, after a line, whose choosing leaves the field with no value. The Form never holds a value
 * for it; only the Control does, while it is the one shown.
 */

/**
 * What the Control holds while a field's empty option is chosen, and nothing a Form value can be: the
 * contract refuses an empty option value, written out or answered by an Options Provider.
 */
export const PHI_FORM_EMPTY_OPTION_CONTROL_VALUE = "";

/**
 * What a submit sends, without the fields that hold their empty option: such a field says nothing, and
 * a key present with nothing in it would be a second way of saying so. A handler reads it as absent.
 */
export function omitPhiFormEmptyOptionFields(
  fields: readonly Pick<PhiFormFieldDescriptor, "key" | "emptyOption">[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const omitted = fields.filter((field) =>
    field.emptyOption && (values[field.key] == null || values[field.key] === PHI_FORM_EMPTY_OPTION_CONTROL_VALUE));
  if (omitted.length === 0) return values;
  const kept = { ...values };
  for (const field of omitted) delete kept[field.key];
  return kept;
}
