import { collectPhiRuntimeValueConditions } from "../../types/runtime-condition";
import type { PhiFormFieldDescriptor } from "../../types/form-descriptor";

/**
 * The fields whose chosen option an `optionFlag` condition of the Form reads, by key.
 *
 * Only these report their option's flags upward: every other field's options stay its own business, so
 * a Form without such a condition renders exactly as before.
 */
export function collectFormOptionFlagFieldKeys(fields: readonly PhiFormFieldDescriptor[]): ReadonlySet<string> {
  const keys = new Set<string>();
  for (const field of fields) {
    for (const expression of [field.visibleWhen, field.disabledWhen]) {
      for (const condition of collectPhiRuntimeValueConditions(expression)) {
        if (condition.operator === "optionFlag") keys.add(condition.valuePath);
      }
    }
  }
  return keys;
}

/**
 * The flags of what a field holds, among the options it offers: every chosen option's `flags` together,
 * 0 for a field that holds nothing.
 *
 * `undefined` where a held value is among none of the options -- the list still loading, or a value the
 * answer left out -- because then nobody knows what was chosen, and an `optionFlag` condition on it is
 * unavailable rather than false.
 */
export function resolveFormChosenOptionFlags(
  options: readonly { value: string | number; flags?: number }[] | null | undefined,
  held: unknown,
): number | undefined {
  const values = (Array.isArray(held) ? held : [held]).filter((entry): entry is string | number =>
    (typeof entry === "string" && entry !== "") || (typeof entry === "number" && Number.isFinite(entry)));
  let flags = 0;
  for (const value of values) {
    const option = options?.find((entry) => entry.value === value);
    if (!option) return undefined;
    flags |= option.flags ?? 0;
  }
  return flags;
}
