"use client";

import {
  createContext,
  createElement,
  useContext,
  useMemo,
  type ComponentType,
  type ReactNode,
} from "react";

import {
  isPhiRuntimeDataProviderKey,
  type PhiRuntimeDataProviderKey,
} from "../../../../types/runtime-data-provider";
import type {
  PhiTreeProviderMutationRequest,
  PhiTreeProviderMutationResult,
  PhiTreeProviderQueryRequest,
  PhiTreeProviderQueryResult,
  PhiTreeProviderResourceDescriptor,
  PhiTreeSourceBinding,
} from "../../../../types/tree-widget";

export type PhiTreeProviderRegistration = {
  key: PhiRuntimeDataProviderKey;
  resources: readonly PhiTreeProviderResourceDescriptor[];
  query: (request: PhiTreeProviderQueryRequest) => Promise<PhiTreeProviderQueryResult>;
  mutate?: (request: PhiTreeProviderMutationRequest) => Promise<PhiTreeProviderMutationResult>;
};

const EMPTY_TREE_PROVIDER_REGISTRY = new Map<PhiRuntimeDataProviderKey, PhiTreeProviderRegistration>();
const PhiTreeProviderRegistryContext = createContext<ReadonlyMap<PhiRuntimeDataProviderKey, PhiTreeProviderRegistration>>(
  EMPTY_TREE_PROVIDER_REGISTRY,
);

export function createPhiTreeProviderClient(
  registration: PhiTreeProviderRegistration,
): ComponentType<{ children: ReactNode }> {
  assertPhiTreeProviderRegistration(registration);
  return function PhiBoundTreeProviderClient({ children }) {
    return <PhiTreeProviderClient registration={registration}>{children}</PhiTreeProviderClient>;
  };
}

export function PhiTreeProviderClient({
  registration,
  children,
}: {
  registration: PhiTreeProviderRegistration;
  children: ReactNode;
}) {
  const parent = useContext(PhiTreeProviderRegistryContext);
  const registry = useMemo(() => {
    assertPhiTreeProviderRegistration(registration);
    if (parent.has(registration.key)) {
      throw new Error(`Duplicate active Tree provider "${registration.key}".`);
    }
    const next = new Map(parent);
    next.set(registration.key, registration);
    return next;
  }, [parent, registration]);
  return createElement(PhiTreeProviderRegistryContext.Provider, { value: registry }, children);
}

export function PhiTreeProviderIsolationBoundary({ children }: { children: ReactNode }) {
  return createElement(PhiTreeProviderRegistryContext.Provider, { value: EMPTY_TREE_PROVIDER_REGISTRY }, children);
}

function assertPhiTreeProviderRegistration(registration: PhiTreeProviderRegistration) {
  if (!isPhiRuntimeDataProviderKey(registration.key)) {
    throw new Error(`Invalid Tree provider key "${registration.key}".`);
  }
  if (!registration.resources.length) {
    throw new Error(`Tree provider "${registration.key}" has no resources.`);
  }
  const keys = new Set<string>();
  for (const resource of registration.resources) {
    if (!resource.resourceKey.trim() || keys.has(resource.resourceKey)) {
      throw new Error(`Tree provider "${registration.key}" has an empty or duplicate resource key.`);
    }
    keys.add(resource.resourceKey);
  }
}

export function usePhiTreeProvider(source: PhiTreeSourceBinding | null) {
  const registry = useContext(PhiTreeProviderRegistryContext);
  const provider = source ? registry.get(source.providerKey) ?? null : null;
  const resource = provider?.resources.find((candidate) => candidate.resourceKey === source?.resourceKey) ?? null;
  return {
    provider,
    resource,
    bindingError: !source
      ? "Tree data provider is not configured."
      : !provider
        ? `Tree provider "${source.providerKey}" is not available from the active runtime modules.`
        : !resource
          ? `Tree resource "${source.resourceKey}" is not declared by provider "${source.providerKey}".`
          : null,
  };
}
