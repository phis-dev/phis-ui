import { isPhiRecord } from "./is-record";

/*
 * The one reading of a dot path in this package: a config field's key (`presentation.columns`), a
 * condition's `valuePath`, a Form field's key -- the Inspector reads and writes with it, the Widget text
 * pass finds its texts with it, and it reads as `@phis/contracts`' own reader (`record.ts`) does, which
 * evaluates conditions and is not exported. A second spelling of the walk is how the text pass came to
 * look for a key named "presentation.columns" at the top of a config and translate nothing under it
 * (owner, 2026-11-26).
 */

/** The segments of a dot path, empty ones skipped: `"presentation.columns"` is `["presentation", "columns"]`. */
export function splitPhiDotPath(path: string): string[] {
  return path.split(".").filter(Boolean);
}

/**
 * The value a dotted path names inside a record: `"author.name"` reads `input.author.name`.
 *
 * Empty segments are skipped, so `""` names the input itself, and only records are walked -- an array
 * or a primitive on the way ends the walk with `undefined` rather than being indexed into.
 */
export function readPhiDotPath(input: unknown, path: string): unknown {
  let current = input;
  for (const segment of splitPhiDotPath(path)) {
    if (!isPhiRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
}

/**
 * A copy of `config` with `value` at the dot path, copied only along the path. A numeric segment into a
 * list stays a list -- `emits.0.value` writes the first emit's value and keeps the rest, rather than
 * turning `emits` into an object keyed "0".
 */
export function writePhiDotPath(config: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const segments = splitPhiDotPath(path);
  if (segments.length === 0) return config;
  const next = { ...config };
  let target: Record<string, unknown> | unknown[] = next;
  const write = (container: Record<string, unknown> | unknown[], segment: string, child: unknown) => {
    if (Array.isArray(container)) container[Number(segment)] = child;
    else container[segment] = child;
  };
  const read = (container: Record<string, unknown> | unknown[], segment: string) =>
    Array.isArray(container) ? container[Number(segment)] : container[segment];
  for (const segment of segments.slice(0, -1)) {
    const current = read(target, segment);
    const child: Record<string, unknown> | unknown[] = Array.isArray(current)
      ? [...current]
      : isPhiRecord(current)
        ? { ...current }
        : {};
    write(target, segment, child);
    target = child;
  }
  write(target, segments[segments.length - 1]!, value);
  return next;
}
