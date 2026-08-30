"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { PhiSignalAddress } from "../../../../types/signals";
import type { PhiTableRowIdentity } from "../../../../types/table-widget";

type SelectionSnapshot = {
  rowIdentity: PhiTableRowIdentity | null;
  revision: number;
};

type SelectionStore = {
  snapshot: SelectionSnapshot;
  listeners: Set<() => void>;
};

const stores = new Map<PhiSignalAddress, SelectionStore>();
const emptySnapshot: SelectionSnapshot = { rowIdentity: null, revision: 0 };

function getStore(address: PhiSignalAddress) {
  let store = stores.get(address);
  if (!store) {
    store = { snapshot: emptySnapshot, listeners: new Set() };
    stores.set(address, store);
  }
  return store;
}

function updateSelection(address: PhiSignalAddress, rowIdentity: PhiTableRowIdentity | null) {
  const store = getStore(address);
  if (store.snapshot.rowIdentity === rowIdentity) return;
  store.snapshot = { rowIdentity, revision: store.snapshot.revision + 1 };
  for (const listener of store.listeners) listener();
}

export function setPhiObservabilitySelection(
  address: PhiSignalAddress,
  rowIdentity: PhiTableRowIdentity,
) {
  updateSelection(address, rowIdentity);
}

export function clearPhiObservabilitySelection(address: PhiSignalAddress) {
  updateSelection(address, null);
}

export function usePhiObservabilitySelection(address: PhiSignalAddress) {
  const subscribe = useCallback((listener: () => void) => {
    const store = getStore(address);
    store.listeners.add(listener);
    return () => store.listeners.delete(listener);
  }, [address]);
  const getSnapshot = useCallback(() => getStore(address).snapshot, [address]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).rowIdentity;
}
