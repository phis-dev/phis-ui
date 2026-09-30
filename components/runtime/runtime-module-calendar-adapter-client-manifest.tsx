"use client";

import { use, type ReactNode } from "react";

import type {
  PhiCalendarAdapterClient,
  PhiCalendarAdapterClientDefinition,
  PhiCalendarAdapterKey,
} from "../../types/calendar";
import { usePhiRuntimeModuleState } from "./runtime-module-context";
import {
  createPhiRuntimeModuleClientManifestContext,
  extendPhiRuntimeModuleClientManifest,
} from "./runtime-module-client-manifest-context";

export type PhiRuntimeModuleCalendarAdapterClientManifest = ReadonlyMap<
  PhiCalendarAdapterKey,
  PhiCalendarAdapterClientDefinition
>;

const EMPTY_CALENDAR_ADAPTER_MANIFEST: PhiRuntimeModuleCalendarAdapterClientManifest = new Map();
const adapterPromiseByLoader = new WeakMap<
  () => Promise<PhiCalendarAdapterClient>,
  Promise<PhiCalendarAdapterClient>
>();

/*
 * Not mounted means no Calendar adapters, rather than an error: most Areas carry no calendar, and a
 * Widget asking for an adapter still fails below, naming the adapter it could not find.
 */
const calendarAdapterClientManifest = createPhiRuntimeModuleClientManifestContext<
  PhiRuntimeModuleCalendarAdapterClientManifest
>("Calendar adapter Client manifest is not mounted.");

export function createPhiRuntimeModuleCalendarAdapterClientManifest(
  definitions: readonly PhiCalendarAdapterClientDefinition[],
): PhiRuntimeModuleCalendarAdapterClientManifest {
  return extendPhiRuntimeModuleCalendarAdapterClientManifest(new Map(), definitions);
}

export function extendPhiRuntimeModuleCalendarAdapterClientManifest(
  base: PhiRuntimeModuleCalendarAdapterClientManifest,
  definitions: readonly PhiCalendarAdapterClientDefinition[],
): PhiRuntimeModuleCalendarAdapterClientManifest {
  return extendPhiRuntimeModuleClientManifest(
    base,
    definitions.map((definition) => [definition.key, definition] as const),
    (key) => `Duplicate Calendar adapter Client loader for "${key}".`,
  );
}

export function PhiRuntimeModuleCalendarAdapterClientManifestProvider({
  manifest,
  children,
}: {
  manifest?: PhiRuntimeModuleCalendarAdapterClientManifest;
  children: ReactNode;
}) {
  return (
    <calendarAdapterClientManifest.Provider manifest={manifest ?? EMPTY_CALENDAR_ADAPTER_MANIFEST}>
      {children}
    </calendarAdapterClientManifest.Provider>
  );
}

export function usePhiCalendarAdapterClient(key: PhiCalendarAdapterKey) {
  const manifest =
    calendarAdapterClientManifest.useOptionalManifest() ?? EMPTY_CALENDAR_ADAPTER_MANIFEST;
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
