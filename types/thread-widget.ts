/**
 * What a conversation signal carries.
 *
 * A bare `number` would say the same thing today and be the wrong contract tomorrow. The value types
 * carry Control signals, where the value *is* the thing -- a slider's number, a field's text. A
 * conversation changing is an event, and every event this package sends between Widgets travels as
 * `json` under a named schema: `tableAction`, `collectionAction`, `formResult`, `mediaAssetSelection`.
 *
 * Three things follow from the schema that a number cannot give:
 *
 * - **The match is exact.** A route is compared on its `valueSchema` as well, so a listener wired for
 *   a conversation cannot be reached by some other number that happens to travel the same channel.
 * - **It can grow.** Should a selection ever need to say which kind it is, or which ticket it belongs
 *   to, that is a field. Moving from `number` to `json` later would break every wired route instead.
 * - **It is the docking point.** A package in another repository wires itself against
 *   `PHI_SIGNAL_VALUE_SCHEMAS.threadSelection` and this reader -- not against a convention about a
 *   channel name. The identifier it resolves to carries its owner
 *   (`@phis/ui/modules/threads/signals/selection`), which is why the schema has an entry in
 *   `constants/runtime-module-ownership.ts`: a first-party key with no owner is refused at import.
 *
 * One field, and no more until something fills a second one. A descriptor nobody fills is only a
 * contract to get wrong later.
 */
export type PhiThreadSignalValue = {
  threadId: number;
};

export function readPhiThreadSignalValue(value: unknown): PhiThreadSignalValue | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const threadId = (value as { threadId?: unknown }).threadId;
  return typeof threadId === "number" && Number.isInteger(threadId) && threadId > 0
    ? { threadId }
    : null;
}
