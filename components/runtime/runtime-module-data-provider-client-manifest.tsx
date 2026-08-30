"use client";

import {
  createContext,
  lazy,
  Suspense,
  useContext,
  type ComponentType,
  type ReactNode,
} from "react";

import type {
  PhiRuntimeModuleDataProviderClientProps,
  PhiRuntimeModuleDataProviderClientDefinition,
} from "../../types/cms-plugins";
import type { PhiRuntimeDataProviderKey } from "../../types/runtime-data-provider";

type PhiRuntimeModuleDataProviderClients = {
  Live: ComponentType<PhiRuntimeModuleDataProviderClientProps>;
  Authoring?: ComponentType<PhiRuntimeModuleDataProviderClientProps>;
};

export type PhiRuntimeModuleDataProviderClientManifest = ReadonlyMap<
  PhiRuntimeDataProviderKey,
  PhiRuntimeModuleDataProviderClients
>;

const PhiRuntimeModuleDataProviderClientManifestContext =
  createContext<PhiRuntimeModuleDataProviderClientManifest | null>(null);

export function createPhiRuntimeModuleDataProviderClientManifest(
  definitions: readonly PhiRuntimeModuleDataProviderClientDefinition[],
): PhiRuntimeModuleDataProviderClientManifest {
  return extendPhiRuntimeModuleDataProviderClientManifest(new Map(), definitions);
}

export function extendPhiRuntimeModuleDataProviderClientManifest(
  base: PhiRuntimeModuleDataProviderClientManifest,
  definitions: readonly PhiRuntimeModuleDataProviderClientDefinition[],
): PhiRuntimeModuleDataProviderClientManifest {
  const manifest = new Map(base);

  for (const definition of definitions) {
    if (manifest.has(definition.key)) {
      throw new Error(`Duplicate Runtime Data Provider Client loader for "${definition.key}".`);
    }
    manifest.set(definition.key, {
      Live: lazy(async () => ({ default: await definition.loadLive() })),
      ...(definition.loadAuthoring
        ? { Authoring: lazy(async () => ({ default: await definition.loadAuthoring!() })) }
        : {}),
    });
  }

  return manifest;
}

export function PhiRuntimeModuleDataProviderClientManifestProvider({
  manifest,
  children,
}: {
  manifest: PhiRuntimeModuleDataProviderClientManifest;
  children: ReactNode;
}) {
  return (
    <PhiRuntimeModuleDataProviderClientManifestContext.Provider value={manifest}>
      {children}
    </PhiRuntimeModuleDataProviderClientManifestContext.Provider>
  );
}

function usePhiRuntimeModuleDataProviderClientManifest() {
  const manifest = useContext(PhiRuntimeModuleDataProviderClientManifestContext);
  if (!manifest) {
    throw new Error("Runtime Data Provider Client manifest is not mounted.");
  }
  return manifest;
}

export function PhiRuntimeModuleDataProviderClientHost({
  providerKeys,
  mode,
  children,
}: {
  providerKeys: readonly PhiRuntimeDataProviderKey[];
  mode: "live" | "authoring";
  children: ReactNode;
}) {
  const manifest = usePhiRuntimeModuleDataProviderClientManifest();
  const clients = providerKeys.map((providerKey) => {
    const entry = manifest.get(providerKey);
    const Client = mode === "live" ? entry?.Live : entry?.Authoring;
    if (!Client) {
      throw new Error(
        `Runtime Data Provider Client loader for "${providerKey}" is not available in ${mode}.`,
      );
    }
    return { providerKey, Client };
  });
  const content = clients.reduceRight<ReactNode>(
    (nestedChildren, { providerKey, Client }) => (
      <Client key={providerKey}>{nestedChildren}</Client>
    ),
    children,
  );

  return <Suspense fallback={null}>{content}</Suspense>;
}
