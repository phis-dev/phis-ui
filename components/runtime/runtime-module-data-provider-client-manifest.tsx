"use client";

import {
  lazy,
  Suspense,
  type ComponentType,
  type ReactNode,
} from "react";

import type {
  PhiRuntimeModuleDataProviderClientProps,
  PhiRuntimeModuleDataProviderClientDefinition,
} from "../../types/cms-plugins";
import type { PhiRuntimeDataProviderKey } from "../../types/runtime-data-provider";
import {
  createPhiRuntimeModuleClientManifestContext,
  extendPhiRuntimeModuleClientManifest,
} from "./runtime-module-client-manifest-context";

type PhiRuntimeModuleDataProviderClients = {
  Live: ComponentType<PhiRuntimeModuleDataProviderClientProps>;
  Authoring?: ComponentType<PhiRuntimeModuleDataProviderClientProps>;
};

export type PhiRuntimeModuleDataProviderClientManifest = ReadonlyMap<
  PhiRuntimeDataProviderKey,
  PhiRuntimeModuleDataProviderClients
>;

const dataProviderClientManifest = createPhiRuntimeModuleClientManifestContext<
  PhiRuntimeModuleDataProviderClientManifest
>("Runtime Data Provider Client manifest is not mounted.");

export function createPhiRuntimeModuleDataProviderClientManifest(
  definitions: readonly PhiRuntimeModuleDataProviderClientDefinition[],
): PhiRuntimeModuleDataProviderClientManifest {
  return extendPhiRuntimeModuleDataProviderClientManifest(new Map(), definitions);
}

export function extendPhiRuntimeModuleDataProviderClientManifest(
  base: PhiRuntimeModuleDataProviderClientManifest,
  definitions: readonly PhiRuntimeModuleDataProviderClientDefinition[],
): PhiRuntimeModuleDataProviderClientManifest {
  return extendPhiRuntimeModuleClientManifest(
    base,
    definitions.map((definition) => [definition.key, {
      Live: lazy(async () => ({ default: await definition.loadLive() })),
      ...(definition.loadAuthoring
        ? { Authoring: lazy(async () => ({ default: await definition.loadAuthoring!() })) }
        : {}),
    }] as const),
    (key) => `Duplicate Runtime Data Provider Client loader for "${key}".`,
  );
}

export const PhiRuntimeModuleDataProviderClientManifestProvider = dataProviderClientManifest.Provider;

export function PhiRuntimeModuleDataProviderClientHost({
  providerKeys,
  mode,
  children,
}: {
  providerKeys: readonly PhiRuntimeDataProviderKey[];
  mode: "live" | "authoring";
  children: ReactNode;
}) {
  const manifest = dataProviderClientManifest.useManifest();
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
