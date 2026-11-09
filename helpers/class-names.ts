/**
 * The class names that are there, joined by a space; undefined where none is.
 *
 * `[a, b].filter(Boolean).join(" ")` stood in sixteen files, half of them with `|| undefined` after it
 * and half without, so some elements carried `class=""` and some did not. One helper, one answer.
 */
export function joinPhiClassNames(...parts: readonly (string | false | null | undefined)[]): string | undefined {
  const joined = parts.filter((part): part is string => typeof part === "string" && part.length > 0).join(" ");
  return joined.length > 0 ? joined : undefined;
}
