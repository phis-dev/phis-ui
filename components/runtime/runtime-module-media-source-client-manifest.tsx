"use client";

import { useMemo, type ReactNode } from "react";

import type {
  PhiMediaSourceClient,
  PhiMediaSourceClientDefinition,
  PhiMediaSourceKey,
} from "../../types/media-source";
import { usePhiRuntimeModuleState } from "./runtime-module-context";
import {
  createPhiRuntimeModuleClientManifestContext,
  extendPhiRuntimeModuleClientManifest,
} from "./runtime-module-client-manifest-context";

export type PhiRuntimeModuleMediaSourceClientManifest = ReadonlyMap<
  PhiMediaSourceKey,
  PhiMediaSourceClientDefinition
>;

const EMPTY_MEDIA_SOURCE_MANIFEST: PhiRuntimeModuleMediaSourceClientManifest = new Map();
const clientPromiseByLoader = new WeakMap<
  () => Promise<PhiMediaSourceClient>,
  Promise<PhiMediaSourceClient>
>();

/*
 * Not mounted means no media sources, rather than an error: no first-party Module declares one, and a
 * picker in an Area without any looks as it always did.
 */
const mediaSourceClientManifest = createPhiRuntimeModuleClientManifestContext<
  PhiRuntimeModuleMediaSourceClientManifest
>("Media source Client manifest is not mounted.");

export function createPhiRuntimeModuleMediaSourceClientManifest(
  definitions: readonly PhiMediaSourceClientDefinition[],
): PhiRuntimeModuleMediaSourceClientManifest {
  return extendPhiRuntimeModuleMediaSourceClientManifest(new Map(), definitions);
}

export function extendPhiRuntimeModuleMediaSourceClientManifest(
  base: PhiRuntimeModuleMediaSourceClientManifest,
  definitions: readonly PhiMediaSourceClientDefinition[],
): PhiRuntimeModuleMediaSourceClientManifest {
  return extendPhiRuntimeModuleClientManifest(
    base,
    definitions.map((definition) => [definition.key, definition] as const),
    (key) => `Duplicate media source Client loader for "${key}".`,
  );
}

export function PhiRuntimeModuleMediaSourceClientManifestProvider({
  manifest,
  children,
}: {
  manifest?: PhiRuntimeModuleMediaSourceClientManifest;
  children: ReactNode;
}) {
  return (
    <mediaSourceClientManifest.Provider manifest={manifest ?? EMPTY_MEDIA_SOURCE_MANIFEST}>
      {children}
    </mediaSourceClientManifest.Provider>
  );
}

/**
 * The media sources this Area offers: those the manifest holds a Client for whose Module declared them
 * and is active here. A source of a Module that is not active is not offered, and a Client without a
 * descriptor of the same owner is a wiring error to name.
 */
export function usePhiMediaSourceClientDefinitions(): readonly PhiMediaSourceClientDefinition[] {
  const manifest =
    mediaSourceClientManifest.useOptionalManifest() ?? EMPTY_MEDIA_SOURCE_MANIFEST;
  const runtimeModuleState = usePhiRuntimeModuleState();
  return useMemo(() => {
    const offered: PhiMediaSourceClientDefinition[] = [];
    for (const definition of manifest.values()) {
      const descriptor = runtimeModuleState.mediaSourceDescriptorsByKey.get(definition.key);
      if (!descriptor || !runtimeModuleState.moduleIds.has(descriptor.ownerModuleId)) {
        continue;
      }
      if (definition.ownerModuleId !== descriptor.ownerModuleId) {
        throw new Error(`Media source "${definition.key}" has inconsistent Server and Client owners.`);
      }
      offered.push(definition);
    }
    return offered;
  }, [manifest, runtimeModuleState]);
}

/** The Client of one definition, loaded once per loader. */
export function loadPhiMediaSourceClient(
  definition: PhiMediaSourceClientDefinition,
): Promise<PhiMediaSourceClient> {
  let promise = clientPromiseByLoader.get(definition.load);
  if (!promise) {
    promise = definition.load();
    clientPromiseByLoader.set(definition.load, promise);
  }
  return promise;
}
