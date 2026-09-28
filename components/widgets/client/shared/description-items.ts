/**
 * The item list at a new length: kept entries stay, new ones start empty, a shorter list drops its tail.
 * Out-of-range and empty input answers with the list unchanged -- clearing the field on the way to
 * typing a new number must not be read as "no items".
 */
export function resizePhiDescriptionItems(
  items: readonly string[] | null | undefined,
  count: number | null | undefined,
) {
  const current = Array.isArray(items) ? [...items] : [];
  if (count == null || !Number.isFinite(count)) return current;
  const nextCount = Math.max(0, Math.min(12, Math.trunc(count)));
  return Array.from({ length: nextCount }, (_, index) => current[index] ?? "");
}
