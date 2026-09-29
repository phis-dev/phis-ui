// About thirty files each carried a private copy of this predicate, and "plain object record" had two
// possible answers for arrays. One export means the answer is chosen once: arrays are not records, so a
// JSON array never passes as a keyed config object.
export function isPhiRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
