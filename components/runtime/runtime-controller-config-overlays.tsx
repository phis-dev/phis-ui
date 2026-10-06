"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import type { PhiSignalAddress } from "../../types/signals";
import { joinPhiSignalRouteSets } from "../../helpers/signal-route-set-join";
import {
  usePhiSignalRuntimePartition,
  type PhiSignalRuntimePartition,
} from "./runtime-signal-partition";

/**
 * What a Page tells a Controller its Area already runs, for as long as the Page is shown.
 *
 * The Area mounts such a Controller once and keeps it across navigations, so the Page cannot hand it a
 * setting the way it mounts its own Controllers. It registers its config here instead, under the
 * Controller's address and in its own signal partition -- a Canvas preview configures nothing outside
 * the Canvas -- and `PhiMountedRuntimeController` lays it over the Area's config. Leaving the Page takes
 * the config with it, so the next Page starts from what the Area said.
 */
type ConfigOverlayEntry = {
  config: Record<string, unknown>;
  token: symbol;
};

/*
 * A stack per address rather than one slot: a Page renders its hosts once per Region slot it fills,
 * and every one of them registers the same config. The newest registration answers; each removes only
 * its own.
 */
type ConfigOverlayStore = {
  entries: Map<PhiSignalAddress, ConfigOverlayEntry[]>;
  listeners: Set<() => void>;
};

const storesByPartition = new WeakMap<PhiSignalRuntimePartition, ConfigOverlayStore>();

function readStore(partition: PhiSignalRuntimePartition) {
  let store = storesByPartition.get(partition);
  if (!store) {
    store = { entries: new Map(), listeners: new Set() };
    storesByPartition.set(partition, store);
  }
  return store;
}

function notify(store: ConfigOverlayStore) {
  for (const listener of store.listeners) listener();
}

export type PhiRuntimeControllerConfigOverlay = {
  address: PhiSignalAddress;
  config: Record<string, unknown>;
};

export function PhiRuntimeControllerConfigOverlays({
  overlays,
}: {
  overlays: readonly PhiRuntimeControllerConfigOverlay[];
}) {
  const partition = usePhiSignalRuntimePartition();

  useEffect(() => {
    const store = readStore(partition);
    const token = Symbol("phi-controller-config-overlay");
    for (const overlay of overlays) {
      store.entries.set(overlay.address, [
        ...(store.entries.get(overlay.address) ?? []),
        { config: overlay.config, token },
      ]);
    }
    notify(store);
    return () => {
      for (const overlay of overlays) {
        const remaining = (store.entries.get(overlay.address) ?? []).filter((entry) => entry.token !== token);
        if (remaining.length > 0) {
          store.entries.set(overlay.address, remaining);
        } else {
          store.entries.delete(overlay.address);
        }
      }
      notify(store);
    };
  }, [overlays, partition]);

  return null;
}

/** The config the shown Page gives the Controller at this address, or null when it gives none. */
export function usePhiRuntimeControllerConfigOverlay(address: PhiSignalAddress) {
  const partition = usePhiSignalRuntimePartition();
  const store = readStore(partition);
  const subscribe = useCallback((listener: () => void) => {
    store.listeners.add(listener);
    return () => {
      store.listeners.delete(listener);
    };
  }, [store]);
  return useSyncExternalStore(
    subscribe,
    () => store.entries.get(address)?.at(-1)?.config ?? null,
    () => null,
  );
}

/**
 * The Area's config of a Controller with what the shown Page adds to it.
 *
 * A key the Page sets replaces the Area's, except `signalRoutes`: the Area's receivers -- its own
 * Overlays, standing on every Page -- do not stop existing while a Page is shown, so the Page's routes
 * join them rather than replace them. A Page route with the routeKey of an Area route is the Page's
 * answer to the same question and takes its place.
 */
export function mergePhiRuntimeControllerConfigOverlay<TAreaConfig extends Record<string, unknown> | null | undefined>(
  areaConfig: TAreaConfig,
  pageConfig: Record<string, unknown> | null,
): TAreaConfig | Record<string, unknown> {
  if (!pageConfig) return areaConfig;
  const merged: Record<string, unknown> = { ...areaConfig, ...pageConfig };
  const signalRoutes = joinPhiSignalRouteSets(areaConfig?.signalRoutes, pageConfig.signalRoutes, {
    duplicate: "replace",
    label: "A Page's Controller config",
  });
  if (signalRoutes) merged.signalRoutes = signalRoutes;
  return merged;
}
