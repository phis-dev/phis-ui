"use client";

import type { PhiControlOptionsProviderContext } from "./phi-options-provider";

/**
 * A revision an options provider can subscribe to, so a fetching provider reloads when what it reads
 * has changed.
 *
 * The reload path is entirely key-driven: a provider is asked again when its load key changes, and a
 * provider that fetches a route has no reason to produce a different key on its own. So it loads once
 * per page view, and a group created a moment ago is only offered after a reload -- which is a stale
 * answer presented as a current one.
 *
 * What was missing is not the mechanism but the occasion. `subscribe`/`getSnapshot` already reach the
 * provider, and the snapshot is in the context `resolveLoadKey` reads, so a revision in that key is
 * enough: whoever writes announces it, and every provider that reads the same resource asks again.
 *
 * The revision is one number per store, not per resource. Reloading a list that did not change costs
 * one request; missing one that did is the defect this exists to remove.
 *
 * It reaches only this browser tab. A group someone else creates still appears on the next load --
 * telling one viewer about another's write is a server question, and this is not it.
 */
export type PhiOptionsRevisionStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => number;
  getServerSnapshot: () => number;
  /** Announces that what the subscribing providers read has changed. */
  bump: () => void;
};

export function createPhiOptionsRevisionStore(): PhiOptionsRevisionStore {
  const listeners = new Set<() => void>();
  let revision = 0;
  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => revision,
    /*
     * The server render and the first client render have to agree, and they do: the revision starts at
     * zero on both. It is a counter, never data -- nothing about what the provider will answer with is
     * decided here, so there is nothing for the markup to disagree about.
     */
    getServerSnapshot: () => 0,
    bump: () => {
      revision += 1;
      for (const listener of listeners) listener();
    },
  };
}

/**
 * The revision as a load-key fragment.
 *
 * A provider that subscribes to a store must put this into its `resolveLoadKey`, or it will re-render
 * on a change and answer with what it loaded the first time.
 */
export function readPhiOptionsRevision(
  context: Pick<PhiControlOptionsProviderContext<string | number>, "snapshot">,
) {
  return typeof context.snapshot === "number" ? context.snapshot : 0;
}
