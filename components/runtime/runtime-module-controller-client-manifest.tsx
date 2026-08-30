"use client";

import { createContext, useContext, type ComponentType, type ReactNode } from "react";

import type {
  PhiRuntimeModuleControllerClientProps,
  PhiRuntimeModuleId,
} from "../../types/cms-plugins";

export type PhiRuntimeModuleControllerClientLoader =
  () => Promise<ComponentType<PhiRuntimeModuleControllerClientProps>>;

export type PhiRuntimeModuleControllerClientManifest = ReadonlyMap<
  PhiRuntimeModuleId,
  PhiRuntimeModuleControllerClientLoader
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
