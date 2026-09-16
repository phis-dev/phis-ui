"use client";

import { createContext, useContext, type ComponentType, type ReactNode } from "react";

import type {
  PhiRuntimeModuleControllerClientProps,
  PhiRuntimeModuleId,
} from "../../types/cms-plugins";

/**
 * A Module's Controller Client, as the manifest holds it.
 *
 * A component made with `next/dynamic(() => import(...))` at the Module's client entry, not a loader
 * function. Controllers render during the server render, and only a literal `dynamic()` call is entered
 * into the route's loadable manifest: the server then writes a preload hint for the Controller's chunks
 * into the HTML, where a loader behind `React.lazy` was only requested once hydration reached it.
 */
export type PhiRuntimeModuleControllerClient = ComponentType<PhiRuntimeModuleControllerClientProps>;

export type PhiRuntimeModuleControllerClientManifest = ReadonlyMap<
  PhiRuntimeModuleId,
  PhiRuntimeModuleControllerClient
>;

const PhiRuntimeModuleControllerClientManifestContext =
  createContext<PhiRuntimeModuleControllerClientManifest | null>(null);

export function PhiRuntimeModuleControllerClientManifestProvider({
  manifest,
  children,
}: {
  manifest: PhiRuntimeModuleControllerClientManifest;
  children: ReactNode;
}) {
  return (
    <PhiRuntimeModuleControllerClientManifestContext.Provider value={manifest}>
      {children}
    </PhiRuntimeModuleControllerClientManifestContext.Provider>
  );
}

export function usePhiRuntimeModuleControllerClientManifest() {
  const manifest = useContext(PhiRuntimeModuleControllerClientManifestContext);
  if (!manifest) {
    throw new Error("Runtime module Controller Client manifest is not mounted.");
  }
  return manifest;
}
