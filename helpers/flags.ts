export function hasPhiFlag(flags: number | null | undefined, flag: number) {
  return ((flags ?? 0) & flag) === flag;
}

/**
 * The flag set a stored config carries, read off its `flags` field.
 *
 * A config states its yes-or-no answers as bits (`PhiCmsFlags`), and a config that states none has none.
 * Anything else in the field is a broken record and is refused rather than read as unset -- read as
 * unset, a Sider would quietly lose its full height and the record would look as if it had never said so.
 */
/** Whether a stored config's `flags` carry the bit; the config may be absent, its field unset. */
export function hasPhiConfigFlag(config: Record<string, unknown> | null | undefined, flag: number) {
  return hasPhiFlag(readPhiFlags(config?.flags), flag);
}

export function readPhiFlags(value: unknown): number {
  if (value === undefined || value === null) {
    return 0;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`A config's "flags" must be a non-negative integer, got ${JSON.stringify(value)}.`);
  }
  return value;
}
