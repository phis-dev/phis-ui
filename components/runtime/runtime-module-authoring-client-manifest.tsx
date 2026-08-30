"use client";

import { createContext, useContext, type ComponentType, type ReactNode } from "react";

import type {
  PhiRuntimeModuleAuthoringClientProps,
  PhiRuntimeModuleId,
} from "../../types/cms-plugins";

export type PhiRuntimeModuleAuthoringClientLoader =
  () => Promise<ComponentType<PhiRuntimeModuleAuthoringClientProps>>;

export type PhiRuntimeModuleAuthoringClientManifest = ReadonlyMap<
  PhiRuntimeModuleId,
  PhiRuntimeModuleAuthoringClientLoader
>;

const PhiRuntimeModuleAuthoringClientManifestContext =
  createContext<PhiRuntimeModuleAuthoringClientManifest | null>(null);

export function PhiRuntimeModuleAuthoringClientManifestProvider({
  manifest,
  children,
}: {
  manifest: PhiRuntimeModuleAuthoringClientManifest;
  children: ReactNode;
}) {
  return (
    <PhiRuntimeModuleAuthoringClientManifestContext.Provider value={manifest}>
      {children}
    </PhiRuntimeModuleAuthoringClientManifestContext.Provider>
  );
}

export function usePhiRuntimeModuleAuthoringClientManifest() {
  const manifest = useContext(PhiRuntimeModuleAuthoringClientManifestContext);
  if (!manifest) {
    throw new Error("Runtime module Authoring Client manifest is not mounted.");
  }
  return manifest;
}
