"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * The React context an Area's Client manifest travels in, with its Provider and hooks.
 *
 * Five manifests -- Controller, Authoring, Render, Data Provider and Calendar adapter Clients -- each
 * wrote the same context, Provider and "is it mounted" hook out by hand. What differs is only what the
 * map holds and what a missing Provider means, so each manifest keeps its own exported names and
 * decides that for itself: `useManifest` refuses to go on without one, `useOptionalManifest` leaves the
 * answer to the caller.
 */
export function createPhiRuntimeModuleClientManifestContext<TManifest>(notMountedMessage: string) {
  const ManifestContext = createContext<TManifest | null>(null);

  function Provider({ manifest, children }: { manifest: TManifest; children: ReactNode }) {
    return <ManifestContext.Provider value={manifest}>{children}</ManifestContext.Provider>;
  }

  function useManifest(): TManifest {
    const manifest = useContext(ManifestContext);
    if (!manifest) {
      throw new Error(notMountedMessage);
    }
    return manifest;
  }

  function useOptionalManifest(): TManifest | null {
    return useContext(ManifestContext);
  }

  return { Provider, useManifest, useOptionalManifest };
}

/**
 * A manifest with more entries, refusing a key that is already there.
 *
 * Modules contribute their Clients one list at a time, and two Modules claiming one key is a wiring
 * error to name, not a race for whichever Module registered last.
 */
export function extendPhiRuntimeModuleClientManifest<TKey, TEntry>(
  base: ReadonlyMap<TKey, TEntry>,
  entries: Iterable<readonly [TKey, TEntry]>,
  duplicateMessage: (key: TKey) => string,
): ReadonlyMap<TKey, TEntry> {
  const manifest = new Map(base);
  for (const [key, entry] of entries) {
    if (manifest.has(key)) {
      throw new Error(duplicateMessage(key));
    }
    manifest.set(key, entry);
  }
  return manifest;
}
