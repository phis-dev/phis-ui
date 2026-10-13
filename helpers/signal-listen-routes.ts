import type { PhiSignal, PhiSignalFilter, PhiSignalReceiver, PhiSignalRoute } from "../types/signals";

/**
 * The listen route a signal arrived on, for a Widget that answers to its own address and to broadcasts.
 *
 * A route matches on channel, action and value type, and on the schema only where the value is `json`;
 * a route without a receiver listens to nothing. A signal aimed at somebody else is not this Widget's,
 * whichever route it would have matched. The Overlay container is the one listener with a different
 * rule (it matches the receiver exactly) and keeps its own.
 */
export function findPhiSignalListenRoute(
  routes: readonly PhiSignalRoute[],
  signal: PhiSignal,
  receiver: PhiSignalReceiver | null | undefined,
): PhiSignalRoute | null {
  if (signal.receiver !== "broadcast" && signal.receiver !== receiver) return null;
  return routes.find((route) =>
    route.receiver !== null &&
    route.channel === signal.channel &&
    route.action === signal.action &&
    route.valueType === signal.valueType &&
    (route.valueType !== "json" || route.valueSchema === signal.valueSchema)) ?? null;
}

/**
 * What the bus delivers to a Widget with these listen routes; `null` (no subscription) when it has none.
 */
export function resolvePhiSignalListenFilter(routes: readonly PhiSignalRoute[]): PhiSignalFilter | null {
  if (routes.length === 0) return null;
  return {
    scopes: Array.from(new Set(routes.map((route) => route.scope))),
    channels: Array.from(new Set(routes.map((route) => route.channel))),
    // Only a route set where every route names a schema can filter by schema: a route that names
    // none accepts a signal that carries none, and listing the others would drop exactly those.
    ...(routes.every((route) => route.valueSchema)
      ? { valueSchemas: Array.from(new Set(routes.map((route) => route.valueSchema!))) }
      : {}),
  };
}
