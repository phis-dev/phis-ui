import { isPhiRecord } from "./is-record";

/**
 * The value a dotted path names inside a record: `"author.name"` reads `input.author.name`.
 *
 * Empty segments are skipped, so `""` names the input itself, and only records are walked -- an array
 * or a primitive on the way ends the walk with `undefined` rather than being indexed into.
 */
export function readPhiDotPath(input: unknown, path: string): unknown {
  let current = input;
  for (const segment of path.split(".")) {
    if (!segment) continue;
    if (!isPhiRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
}
