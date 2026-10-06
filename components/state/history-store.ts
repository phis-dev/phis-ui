"use client";

import { createPhiPluginStateStore } from "./plugin-state-store";

/**
 * One step a history can take back.
 *
 * `action` says what the step was, in the terms of whoever recorded it -- a Builder edit names its kind
 * and the node it touched, a Theme edit the part of the Theme it changed. It is data rather than a
 * sentence because the sentence belongs to the reader: the undo message and the button's tooltip are
 * written in the visitor's language at the moment they are shown, from the Label Set that reader holds.
 */
export type PhiHistoryEntry<TSnapshot, TAction> = {
  action: TAction;
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

type PhiHistoryState<TSnapshot, TAction> = {
  past: PhiHistoryEntry<TSnapshot, TAction>[];
  future: PhiHistoryEntry<TSnapshot, TAction>[];
};

/** What can be taken back and brought back next, as the toolbar shows it. */
export type PhiHistoryAvailability<TAction> = {
  canUndo: boolean;
  canRedo: boolean;
  /** The step an undo would take back, or null. */
  undoAction: TAction | null;
  /** The step a redo would bring back, or null. */
  redoAction: TAction | null;
};

export function createPhiHistoryStore<TSnapshot, TAction>(
  storeId: string,
  options?: { limit?: number },
) {
  const limit = Math.max(1, options?.limit ?? 50);
  const openGestures = new Map<string, string>();
  const store = createPhiPluginStateStore<PhiHistoryState<TSnapshot, TAction>>(
    storeId,
    () => ({ past: [], future: [] }),
  );

  function record(scopeKey: string, entry: PhiHistoryEntry<TSnapshot, TAction>) {
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

  /** Takes the newest step back and answers with it, so the caller can say what it took back. */
  function undo(scopeKey: string, apply: (snapshot: TSnapshot) => void): PhiHistoryEntry<TSnapshot, TAction> | null {
    openGestures.delete(scopeKey);
    const current = store.getSnapshot(scopeKey);
    const entry = current.past.at(-1);
    if (!entry) {
      return null;
    }

    apply(entry.before);
    store.replace(scopeKey, {
      past: current.past.slice(0, -1),
      future: [...current.future, entry],
    });
    return entry;
  }

  /** Brings the last step taken back again and answers with it. */
  function redo(scopeKey: string, apply: (snapshot: TSnapshot) => void): PhiHistoryEntry<TSnapshot, TAction> | null {
    openGestures.delete(scopeKey);
    const current = store.getSnapshot(scopeKey);
    const entry = current.future.at(-1);
    if (!entry) {
      return null;
    }

    apply(entry.after);
    store.replace(scopeKey, {
      past: [...current.past, entry],
      future: current.future.slice(0, -1),
    });
    return entry;
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

  function getAvailability(scopeKey: string): PhiHistoryAvailability<TAction> {
    const state = store.getSnapshot(scopeKey);
    return {
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      undoAction: state.past.at(-1)?.action ?? null,
      redoAction: state.future.at(-1)?.action ?? null,
    };
  }

  /**
   * The newest entry still standing, or null. A saved state can remember it and later ask whether the
   * history has moved since: a new record, a gesture continuing, an undo or a redo all change it, and
   * undoing back to where it stood brings the same entry back.
   */
  function getHead(scopeKey: string): PhiHistoryEntry<TSnapshot, TAction> | null {
    return store.getSnapshot(scopeKey).past.at(-1) ?? null;
  }

  function useHead(scopeKey: string): PhiHistoryEntry<TSnapshot, TAction> | null {
    return store.useStoreSelector(scopeKey, (state) => state.past.at(-1) ?? null);
  }

  function useAvailability(scopeKey: string): PhiHistoryAvailability<TAction> {
    const state = store.useStore(scopeKey);
    return {
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      undoAction: state.past.at(-1)?.action ?? null,
      redoAction: state.future.at(-1)?.action ?? null,
    };
  }

  return {
    clear,
    endGesture,
    getAvailability,
    getHead,
    record,
    redo,
    subscribe: store.subscribe,
    undo,
    useAvailability,
    useHead,
  };
}
