import {
  readPhiSignalRouteSet,
  type PhiSignal,
  type PhiSignalFilter,
  type PhiSignalReceiver,
  type PhiSignalRoute,
  type PhiSignalRouteSet,
} from "../../../../types/signals";
import { findPhiControlListenRoute } from "../../../../components/widgets/client/shared/phi-control-signal-routing";

/**
 * What a conversation Widget is configured with: a padding, and where its signals go.
 *
 * The three surfaces of a conversation -- a listing, the conversation itself, the reply beneath it -- are
 * placed separately and find each other over the `thread` channel, and none of them holds a conversation
 * of its own. Two of the three are not this Widget: the listing is Core's Table over a Provider, and the
 * reply is a declared Form, which is told its conversation as a field value rather than by listening. That
 * only works if the wiring is part of the configuration rather than a channel name agreed on inside two
 * clients: a Site places them and wires them, and a package from another repository can dock onto the same
 * routes ([THREADS.md] section 13).
 */
export type PhiThreadWidgetConfig = {
  padding?: number | string;
  /**
   * Offer a Reply in the conversation's heading. It writes nothing itself: it says `reply` with the
   * thread as its row (`signals/table-action`, `actionKey: "reply"`), and the placement routes that to a
   * dialog holding Core's Reply Form, which reads the thread from that row. Not offered on an archived
   * conversation, which takes no new messages.
   */
  reply?: boolean;
  signalRoutes?: PhiSignalRouteSet | null;
};

export function parsePhiThreadWidgetConfig(
  rawConfig: Record<string, unknown> | null | undefined,
): PhiThreadWidgetConfig {
  const raw = rawConfig ?? {};
  const padding = raw.padding;

  return {
    padding: typeof padding === "number" || typeof padding === "string" ? padding : undefined,
    reply: raw.reply === true,
    signalRoutes: readPhiSignalRouteSet(raw.signalRoutes),
  };
}

/**
 * The configured route a signal arrived on, or none -- which is also the answer *why* it arrived.
 *
 * A capability id rather than a channel is what the client then branches on, so the same Widget reads
 * `select` whether a Site wired it to a listing, to an address or to something nobody has written yet.
 *
 * `valueSchema` narrows a `json` route only. For every other value type there is no schema on either
 * side, and comparing null to null would read as a rule where there is none.
 */
export function findPhiThreadListenRoute(
  routes: readonly PhiSignalRoute[] | null | undefined,
  signal: PhiSignal,
): PhiSignalRoute | null {
  // The one route match every Control uses, the scope included -- this copy compared everything but it.
  return findPhiControlListenRoute(routes ?? [], signal);
}

/**
 * What the bus needs to deliver anything at all, narrowed to what this Widget was wired for.
 *
 * `null` when nothing is wired, which is how the bus is told to deliver nothing: an unwired Widget is
 * silent rather than listening to every conversation on the page.
 */
export function buildPhiThreadListenFilter(
  routes: readonly PhiSignalRoute[] | null | undefined,
  receiver: PhiSignalReceiver | null | undefined,
): PhiSignalFilter | null {
  if (!routes || routes.length === 0) {
    return null;
  }
  return {
    scopes: Array.from(new Set(routes.map((route) => route.scope))),
    channels: Array.from(new Set(routes.map((route) => route.channel))),
    receiver: receiver ?? undefined,
  };
}

/**
 * The conversation named on the address bar, or none.
 *
 * Signals do not come through here -- they carry `signals/thread-selection` and are read with
 * `readPhiThreadSignalValue`. This is `?thread=`, which is a string somebody may have typed, and it is
 * what a link in a notification points at.
 */
export function readPhiThreadAddressId(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
