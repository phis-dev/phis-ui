"use client";

import { createContext, use, useContext, type ReactNode } from "react";

import type {
  PhiCalendarAdapterClient,
  PhiCalendarAdapterClientDefinition,
  PhiCalendarAdapterKey,
} from "../../types/calendar";
import { usePhiRuntimeModuleState } from "./runtime-module-context";

export type PhiRuntimeModuleCalendarAdapterClientManifest = ReadonlyMap<
  PhiCalendarAdapterKey,
  PhiCalendarAdapterClientDefinition
>;

const EMPTY_CALENDAR_ADAPTER_MANIFEST: PhiRuntimeModuleCalendarAdapterClientManifest = new Map();
const adapterPromiseByLoader = new WeakMap<
  () => Promise<PhiCalendarAdapterClient>,
  Promise<PhiCalendarAdapterClient>
>();

const PhiRuntimeModuleCalendarAdapterClientManifestContext =
  createContext<PhiRuntimeModuleCalendarAdapterClientManifest>(EMPTY_CALENDAR_ADAPTER_MANIFEST);

export function createPhiRuntimeModuleCalendarAdapterClientManifest(
  definitions: readonly PhiCalendarAdapterClientDefinition[],
): PhiRuntimeModuleCalendarAdapterClientManifest {
  return extendPhiRuntimeModuleCalendarAdapterClientManifest(new Map(), definitions);
}

export function extendPhiRuntimeModuleCalendarAdapterClientManifest(
  base: PhiRuntimeModuleCalendarAdapterClientManifest,
  definitions: readonly PhiCalendarAdapterClientDefinition[],
): PhiRuntimeModuleCalendarAdapterClientManifest {
  const manifest = new Map(base);
  for (const definition of definitions) {
    if (manifest.has(definition.key)) {
      throw new Error(`Duplicate Calendar adapter Client loader for "${definition.key}".`);
    }
    manifest.set(definition.key, definition);
  }
  return manifest;
}

export function PhiRuntimeModuleCalendarAdapterClientManifestProvider({
  manifest,
  children,
}: {
  manifest?: PhiRuntimeModuleCalendarAdapterClientManifest;
  children: ReactNode;
}) {
  return (
    <PhiRuntimeModuleCalendarAdapterClientManifestContext.Provider
      value={manifest ?? EMPTY_CALENDAR_ADAPTER_MANIFEST}
    >
      {children}
    </PhiRuntimeModuleCalendarAdapterClientManifestContext.Provider>
  );
}

export function usePhiCalendarAdapterClient(key: PhiCalendarAdapterKey) {
  const manifest = useContext(PhiRuntimeModuleCalendarAdapterClientManifestContext);
  const runtimeModuleState = usePhiRuntimeModuleState();
  const descriptor = runtimeModuleState.calendarAdapterDescriptorsByKey.get(key);
  if (!descriptor) {
    throw new Error(`Calendar adapter "${key}" is not available from the active runtime modules.`);
  }
  const definition = manifest.get(key);
  if (!definition) {
    throw new Error(`Calendar adapter "${key}" has no Client loader in the active Area manifest.`);
  }
  if (definition.ownerModuleId !== descriptor.ownerModuleId) {
    throw new Error(`Calendar adapter "${key}" has inconsistent Server and Client owners.`);
  }
  const loader = definition.load;
  let promise = adapterPromiseByLoader.get(loader);
  if (!promise) {
    promise = loader();
    adapterPromiseByLoader.set(loader, promise);
  }
  const adapter = use(promise);
  if (adapter.key !== key) {
    throw new Error(`Calendar adapter loader for "${key}" returned "${adapter.key}".`);
  }
  return adapter;
}
