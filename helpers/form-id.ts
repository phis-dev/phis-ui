/**
 * A Form id or a submit handler key as the registry files it: trimmed, lower-case.
 *
 * Three files normalised a Form id for themselves and a fourth its handler key, each `trim().toLowerCase()`;
 * a registry that compares keys has to spell the comparison once, or a key written one way is filed
 * under another.
 */
export function normalizePhiFormKey(value: string) {
  return value.trim().toLowerCase();
}
