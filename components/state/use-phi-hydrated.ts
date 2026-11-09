"use client";

import { useSyncExternalStore } from "react";

const subscribeNever = () => () => {};

/**
 * Whether this render runs in a hydrated browser: false on the server and during hydration -- the HTML a
 * crawler reads -- and true in the render that follows. Seven Controls each kept a copy of this with a
 * `subscribe` that never fires; one hook, so a lazily mounted shell and a protected mail agree on when.
 */
export function usePhiHydrated() {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}
