"use client";

import {
  createContext,
  createElement,
  useCallback,
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
  PhiTableProviderMutationRequest,
  PhiTableProviderMutationResult,
  PhiTableProviderActionMutationRequest,
  PhiTableProviderRecordRequest,
  PhiTableProviderQueryRequest,
  PhiTableProviderQueryResult,
  PhiTableProviderResourceDescriptor,
  PhiTableSourceBinding,
} from "../../../../types/table-widget";

export type PhiTableProviderRegistration = {
  key: PhiRuntimeDataProviderKey;
  resources: readonly PhiTableProviderResourceDescriptor[];
  query: (request: PhiTableProviderQueryRequest) => Promise<PhiTableProviderQueryResult>;
  readRecord?: (request: PhiTableProviderRecordRequest) => Promise<Record<string, unknown>>;
  mutate?: (request: PhiTableProviderMutationRequest) => Promise<PhiTableProviderMutationResult>;
};

const EMPTY_TABLE_PROVIDER_REGISTRY = new Map<
  PhiRuntimeDataProviderKey,
  PhiTableProviderRegistration
>();
const PhiTableProviderRegistryContext = createContext<
  ReadonlyMap<PhiRuntimeDataProviderKey, PhiTableProviderRegistration>
>(EMPTY_TABLE_PROVIDER_REGISTRY);

export function createPhiTableProviderClient(
  registration: PhiTableProviderRegistration,
): ComponentType<{ children: ReactNode }> {
  if (!isPhiRuntimeDataProviderKey(registration.key)) {
    throw new Error(`Invalid table provider key "${registration.key}".`);
  }
  assertPhiTableProviderRegistration(registration);

  return function PhiBoundTableProviderClient({ children }) {
    return (
      <PhiTableProviderClient registration={registration}>
        {children}
      </PhiTableProviderClient>
    );
  };
}

export function PhiTableProviderClient({
  registration,
  children,
}: {
  registration: PhiTableProviderRegistration;
  children: ReactNode;
}) {
  const parent = useContext(PhiTableProviderRegistryContext);
  const registry = useMemo(() => {
    if (!isPhiRuntimeDataProviderKey(registration.key)) {
      throw new Error(`Invalid table provider key "${registration.key}".`);
    }
    assertPhiTableProviderRegistration(registration);
    if (parent.has(registration.key)) {
      throw new Error(`Duplicate active table provider "${registration.key}".`);
    }
    const next = new Map(parent);
    next.set(registration.key, registration);
    return next;
  }, [parent, registration]);

  return createElement(PhiTableProviderRegistryContext.Provider, { value: registry }, children);
}

export function PhiTableProviderIsolationBoundary({ children }: { children: ReactNode }) {
  return createElement(
    PhiTableProviderRegistryContext.Provider,
    { value: EMPTY_TABLE_PROVIDER_REGISTRY },
    children,
  );
}

function assertPhiTableProviderRegistration(registration: PhiTableProviderRegistration) {
  if (registration.resources.length === 0) {
    throw new Error(`Table provider "${registration.key}" has no resources.`);
  }
  const keys = new Set<string>();
  for (const resource of registration.resources) {
    if (!resource.resourceKey.trim() || keys.has(resource.resourceKey)) {
      throw new Error(`Table provider "${registration.key}" has an empty or duplicate resource key.`);
    }
    keys.add(resource.resourceKey);
  }
}

export function usePhiTableProvider(source: PhiTableSourceBinding | null) {
  const registry = useContext(PhiTableProviderRegistryContext);
  const provider = source ? registry.get(source.providerKey) ?? null : null;
  const resource = provider?.resources.find((candidate) =>
    candidate.resourceKey === source?.resourceKey) ?? null;

  return {
    provider,
    resource,
    bindingError: !source
      ? "Table data provider is not configured."
      : !provider
        ? `Table provider "${source.providerKey}" is not available from the active runtime modules.`
        : !resource
          ? `Table resource "${source.resourceKey}" is not declared by provider "${source.providerKey}".`
        : null,
  };
}

export function usePhiTableProviderMutation(source: PhiTableSourceBinding | null) {
  const { provider, resource, bindingError } = usePhiTableProvider(source);

  return useCallback(async (
    value: Omit<PhiTableProviderActionMutationRequest, "kind" | "resourceKey" | "params" | "signal" | "query"> & {
      query?: PhiTableProviderActionMutationRequest["query"];
    },
  ) => {
    if (bindingError || !provider || !source) {
      throw new Error(bindingError ?? "Table provider is unavailable.");
    }
    if (!provider.mutate) {
      throw new Error(`Table provider "${source.providerKey}" is read-only.`);
    }
    if (!resource?.actions?.some((action) => action.key === value.actionKey)) {
      throw new Error(
        `Table action "${value.actionKey}" is not declared by resource "${source.resourceKey}".`,
      );
    }
    const abortController = new AbortController();
    return provider.mutate({
      ...value,
      kind: "action",
      resourceKey: source.resourceKey,
      params: source.params,
      query: value.query ?? {},
      signal: abortController.signal,
    });
  }, [bindingError, provider, resource, source]);
}
