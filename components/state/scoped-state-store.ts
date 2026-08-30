"use client";

import { useRef, useSyncExternalStore } from "react";

type ScopedStateListener = () => void;

type ScopedStateEntry<TState> = {
  value: TState;
  listeners: Set<ScopedStateListener>;
  notifyScheduled: boolean;
};

type ScopedStateStoreBucket = Map<string, ScopedStateEntry<unknown>>;

const scopedStateStoreKey = "__phiScopedStateStores__";

function normalizeScopedStateKey(scopeKey: string) {
  return scopeKey.trim() || "default";
}

function getScopedStateStoreMap() {
  const globalStore = globalThis as typeof globalThis & {
    [scopedStateStoreKey]?: Map<string, ScopedStateStoreBucket>;
  };

  if (!globalStore[scopedStateStoreKey]) {
    globalStore[scopedStateStoreKey] = new Map<string, ScopedStateStoreBucket>();
  }

  return globalStore[scopedStateStoreKey];
}

export function createScopedStateStore<TState>(
  storeId: string,
  createDefaultState: (scopeKey: string) => TState,
) {
  const hydrationSnapshots = new Map<string, TState>();

  function getHydrationSnapshot(scopeKey: string) {
    const normalizedScopeKey = normalizeScopedStateKey(scopeKey);
    let snapshot = hydrationSnapshots.get(normalizedScopeKey);

    if (snapshot === undefined) {
      snapshot = createDefaultState(normalizedScopeKey);
      hydrationSnapshots.set(normalizedScopeKey, snapshot);
    }

    return snapshot;
  }

  function getScopedBucket() {
    const map = getScopedStateStoreMap();
    let bucket = map.get(storeId);

    if (!bucket) {
      bucket = new Map<string, ScopedStateEntry<unknown>>();
      map.set(storeId, bucket);
    }

    return bucket;
  }

  function getScopedEntry(scopeKey: string) {
    const normalizedScopeKey = normalizeScopedStateKey(scopeKey);
    const bucket = getScopedBucket();
    let entry = bucket.get(normalizedScopeKey) as ScopedStateEntry<TState> | undefined;

    if (!entry) {
      entry = {
        value: createDefaultState(normalizedScopeKey),
        listeners: new Set<ScopedStateListener>(),
        notifyScheduled: false,
      };
      bucket.set(normalizedScopeKey, entry);
    }

    return entry;
  }

  function subscribe(scopeKey: string, listener: ScopedStateListener) {
    const entry = getScopedEntry(scopeKey);
    entry.listeners.add(listener);
    return () => {
      entry.listeners.delete(listener);
    };
  }

  function getSnapshot(scopeKey: string) {
    return getScopedEntry(scopeKey).value;
  }

  function patch(scopeKey: string, updater: (current: TState) => TState) {
    const entry = getScopedEntry(scopeKey);
    const nextValue = updater(entry.value);
    if (Object.is(entry.value, nextValue)) {
      return;
    }
    entry.value = nextValue;

    if (entry.notifyScheduled) {
      return;
    }

    entry.notifyScheduled = true;
    queueMicrotask(() => {
      entry.notifyScheduled = false;
      for (const listener of entry.listeners) {
        listener();
      }
    });
  }

  function replace(scopeKey: string, nextState: TState) {
    const entry = getScopedEntry(scopeKey);
    if (Object.is(entry.value, nextState)) {
      return;
    }
    entry.value = nextState;

    if (entry.notifyScheduled) {
      return;
    }

    entry.notifyScheduled = true;
    queueMicrotask(() => {
      entry.notifyScheduled = false;
      for (const listener of entry.listeners) {
        listener();
      }
    });
  }

  function useStore(scopeKey: string) {
    const normalizedScopeKey = normalizeScopedStateKey(scopeKey);
    return useSyncExternalStore(
      (listener) => subscribe(normalizedScopeKey, listener),
      () => getSnapshot(normalizedScopeKey),
      () => getHydrationSnapshot(normalizedScopeKey),
    );
  }

  function useStoreSelector<TSelected>(
    scopeKey: string,
    selector: (state: TState) => TSelected,
  ) {
    const normalizedScopeKey = normalizeScopedStateKey(scopeKey);
    const selectedSnapshotRef = useRef<{
      source: TState;
      selected: TSelected;
    } | null>(null);
    const selectedHydrationSnapshotRef = useRef<{
      selected: TSelected;
    } | null>(null);
    const getSelectedSnapshot = () => {
      const source = getSnapshot(normalizedScopeKey);
      const cached = selectedSnapshotRef.current;
      if (cached && Object.is(cached.source, source)) {
        return cached.selected;
      }

      const selected = selector(source);
      selectedSnapshotRef.current = { source, selected };
      return selected;
    };
    const getSelectedHydrationSnapshot = () => {
      const cached = selectedHydrationSnapshotRef.current;
      if (cached) {
        return cached.selected;
      }

      const selected = selector(getHydrationSnapshot(normalizedScopeKey));
      selectedHydrationSnapshotRef.current = { selected };
      return selected;
    };

    return useSyncExternalStore(
      (listener) => subscribe(normalizedScopeKey, listener),
      getSelectedSnapshot,
      getSelectedHydrationSnapshot,
    );
  }

  function reset(scopeKey: string) {
    patch(scopeKey, () => createDefaultState(normalizeScopedStateKey(scopeKey)));
  }

  function deleteScope(scopeKey: string) {
    const normalizedScopeKey = normalizeScopedStateKey(scopeKey);
    const bucket = getScopedBucket();
    bucket.delete(normalizedScopeKey);
  }

  return {
    useStore,
    useStoreSelector,
    subscribe,
    getSnapshot,
    /** The stable value to render during hydration, so server and client agree on the first paint. */
    getHydrationSnapshot,
    patch,
    replace,
    reset,
    deleteScope,
  };
}
