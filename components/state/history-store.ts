"use client";

import { createPhiPluginStateStore } from "./plugin-state-store";

export type PhiHistoryEntry<TSnapshot> = {
  label: string;
  before: TSnapshot;
  after: TSnapshot;
  /**
   * What makes two records the same authoring gesture. A control that emits while it is being used --
   * a slider dragged across its track, a colour picked by moving a cursor -- reaches this store once
   * per intermediate value, and each of those is a step of one movement rather than a decision of its
   * own. Consecutive records carrying the same non-empty key collapse into one entry, so undo takes
   * back the gesture rather than one of its steps. What ends a gesture is an event, not a delay:
   * touching a different field, undoing, or `endGesture` when the surface that was being edited is put
   * away. Callers that leave the key undefined always get their own entry.
   */
  coalesceKey?: string;
};

type PhiHistoryState<TSnapshot> = {
  past: PhiHistoryEntry<TSnapshot>[];
  future: PhiHistoryEntry<TSnapshot>[];
};

export function createPhiHistoryStore<TSnapshot>(
  storeId: string,
  options?: { limit?: number },
) {
  const limit = Math.max(1, options?.limit ?? 50);
  const openGestures = new Map<string, string>();
  const store = createPhiPluginStateStore<PhiHistoryState<TSnapshot>>(
    storeId,
    () => ({ past: [], future: [] }),
  );

  function record(scopeKey: string, entry: PhiHistoryEntry<TSnapshot>) {
    const continues =
      entry.coalesceKey != null &&
      entry.coalesceKey !== "" &&
      openGestures.get(scopeKey) === entry.coalesceKey;
    if (entry.coalesceKey) openGestures.set(scopeKey, entry.coalesceKey);
    else openGestures.delete(scopeKey);

    store.patch(scopeKey, (current) => {
      const last = current.past.at(-1);
      // The gesture keeps its original starting point; only where it has got to is updated.
      if (continues && last) {
        return {
          past: [...current.past.slice(0, -1), { ...last, after: entry.after }],
          future: [],
        };
      }
      return {
        past: [...current.past.slice(-(limit - 1)), entry],
        future: [],
      };
    });
  }

  function undo(scopeKey: string, apply: (snapshot: TSnapshot) => void) {
    openGestures.delete(scopeKey);
    const current = store.getSnapshot(scopeKey);
    const entry = current.past.at(-1);
    if (!entry) {
      return false;
    }

    apply(entry.before);
    store.replace(scopeKey, {
      past: current.past.slice(0, -1),
      future: [...current.future, entry],
    });
    return true;
  }

  function redo(scopeKey: string, apply: (snapshot: TSnapshot) => void) {
    openGestures.delete(scopeKey);
    const current = store.getSnapshot(scopeKey);
    const entry = current.future.at(-1);
    if (!entry) {
      return false;
    }

    apply(entry.after);
    store.replace(scopeKey, {
      past: [...current.past, entry],
      future: current.future.slice(0, -1),
    });
    return true;
  }

  /**
   * Ends whatever gesture is still open, so the next record starts an entry of its own. Called when the
   * surface the edits were made on is put away -- the value that stands at that moment is the one the
   * entry keeps.
   */
  function endGesture(scopeKey?: string) {
    if (scopeKey == null) openGestures.clear();
    else openGestures.delete(scopeKey);
  }

  function clear(scopeKey: string) {
    openGestures.delete(scopeKey);
    store.replace(scopeKey, { past: [], future: [] });
  }

  function getAvailability(scopeKey: string) {
    const state = store.getSnapshot(scopeKey);
    return {
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
    };
  }

  function useAvailability(scopeKey: string) {
    const state = store.useStore(scopeKey);
    return {
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
    };
  }

  return {
    clear,
    endGesture,
    getAvailability,
    record,
    redo,
    subscribe: store.subscribe,
    undo,
    useAvailability,
  };
}
