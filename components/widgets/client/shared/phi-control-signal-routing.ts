import type { PhiSignal, PhiSignalValue } from "../../../../types";
import type { PhiSignalRoute } from "../../../../types/signals";

/**
 * What a signal a Control receives asks it to do.
 *
 * Read from `channel` and `action` alone. The value is data and never a command: a text Control told
 * `value/change` with the string `"clear"` shows the word "clear", it does not empty itself. Clearing is
 * `action: "clear"`, toggling is `action: "toggle"`, enabling is `enabled/change` with a boolean, focus
 * is `focused/change` with a boolean ([SIGNALS.md](../../../../SIGNALS.md#actions)).
 */
export type PhiControlSignalCommand =
  | { kind: "clear" }
  | { kind: "toggle" }
  | { kind: "focus" }
  | { kind: "blur" }
  | { kind: "enabled"; enabled: boolean }
  | { kind: "set"; value: PhiSignalValue };

/**
 * The listen route a delivered signal arrived through, or `null` when none of this Control's routes
 * carries it.
 *
 * Every addressing fact on the route has to agree: scope, channel, action, value type, and for `json`
 * the value schema. Scope is part of it because the bus puts the receiver's registered scope on the signal,
 * so a route written for another scope is not the wire the signal came through.
 */
export function findPhiControlListenRoute(
  listenRoutes: readonly PhiSignalRoute[],
  signal: Pick<PhiSignal, "scope" | "channel" | "action" | "valueType" | "valueSchema">,
): PhiSignalRoute | null {
  return listenRoutes.find((candidate) =>
    candidate.receiver !== null &&
    candidate.scope === signal.scope &&
    candidate.channel === signal.channel &&
    candidate.action === signal.action &&
    candidate.valueType === signal.valueType &&
    (
      candidate.valueType !== "json" ||
      (candidate.valueSchema != null && candidate.valueSchema === signal.valueSchema)
    ),
  ) ?? null;
}

export function readPhiControlSignalCommand(
  signal: Pick<PhiSignal, "channel" | "action" | "value">,
): PhiControlSignalCommand | null {
  if (signal.action === "clear") {
    return { kind: "clear" };
  }
  if (signal.action === "toggle") {
    return { kind: "toggle" };
  }
  if (signal.action !== "change") {
    return null;
  }
  if (signal.channel === "focused") {
    return signal.value === false ? { kind: "blur" } : { kind: "focus" };
  }
  if (signal.channel === "enabled") {
    return typeof signal.value === "boolean" ? { kind: "enabled", enabled: signal.value } : null;
  }
  return { kind: "set", value: signal.value };
}
