import "server-only";

import type { PhiDashboardCardContext } from "../types/dashboard-cards";

/*
 * A read that several cards of one Dashboard ask for, done once for that Dashboard.
 *
 * The cards of a list request are resolved side by side in a Route Handler, which is outside a render,
 * so `definePhiRequestMemo` (React's request scope) loads every time there. What they do share is the
 * card context: the route resolves it once and hands the same object to every card it resolves. Keying
 * by that object is the request scope a card has -- four cards reading one Add-on route make one call,
 * and a card refreshed on its own gets a fresh context and so a fresh read. Nothing outlives the
 * context, so nothing goes stale.
 *
 * `load` must answer from the context alone; anything else a card wants to vary belongs in its own call.
 * A rejected load stays rejected for that context, so every card sharing the read reports the same error.
 */
export function definePhiDashboardCardRead<TResult>(
  load: (context: PhiDashboardCardContext) => Promise<TResult>,
): (context: PhiDashboardCardContext) => Promise<TResult> {
  const reads = new WeakMap<PhiDashboardCardContext, Promise<TResult>>();
  return (context) => {
    let result = reads.get(context);
    if (!result) {
      result = load(context);
      reads.set(context, result);
    }
    return result;
  };
}
