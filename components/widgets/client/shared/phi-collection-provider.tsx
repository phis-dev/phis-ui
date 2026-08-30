"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ComponentType,
  type ReactNode,
} from "react";

import type { PhiCmsInstanceId } from "../../../../types/cms-instance-id";
import type { PhiCmsCollectionViewWidgetConfig } from "../../../../plugins/runtime-modules/core/widgets/collection-view/config";

import {
  isPhiRuntimeDataProviderKey,
  type PhiRuntimeDataProviderKey,
} from "../../../../types/runtime-data-provider";
import type {
  PhiCollectionProviderActionRequest,
  PhiCollectionProviderData,
  PhiCollectionProviderDataSource,
  PhiCollectionProviderQueryRequest,
  PhiCollectionViewBindingModel,
} from "../../../../types/collection-provider";

export type PhiCollectionProviderRegistration = {
  key: PhiRuntimeDataProviderKey;
  query: (request: PhiCollectionProviderQueryRequest) => Promise<PhiCollectionProviderData>;
  action?: (request: PhiCollectionProviderActionRequest) => Promise<PhiCollectionProviderData>;
  resources: readonly {
    resourceKey: string;
    View: ComponentType<{
      config: PhiCmsCollectionViewWidgetConfig;
      binding: PhiCollectionViewBindingModel;
      labels?: unknown;
      widgetId?: PhiCmsInstanceId | null;
    }>;
  }[];
};

const EMPTY_COLLECTION_PROVIDER_REGISTRY = new Map<
  PhiRuntimeDataProviderKey,
  PhiCollectionProviderRegistration
>();
const PhiCollectionProviderRegistryContext = createContext<
  ReadonlyMap<PhiRuntimeDataProviderKey, PhiCollectionProviderRegistration>
>(EMPTY_COLLECTION_PROVIDER_REGISTRY);

export function createPhiCollectionProviderClient(
  registration: PhiCollectionProviderRegistration,
): ComponentType<{ children: ReactNode }> {
  if (!isPhiRuntimeDataProviderKey(registration.key)) {
    throw new Error(`Invalid collection provider key "${registration.key}".`);
  }
  if (registration.resources.length === 0 ||
    new Set(registration.resources.map((resource) => resource.resourceKey)).size !== registration.resources.length ||
    registration.resources.some((resource) => !resource.resourceKey.trim())) {
    throw new Error(`Collection provider "${registration.key}" has invalid Client resources.`);
  }

  return function PhiBoundCollectionProviderClient({ children }) {
    return (
      <PhiCollectionProviderClient registration={registration}>
        {children}
      </PhiCollectionProviderClient>
    );
  };
}

export function PhiCollectionProviderClient({
  registration,
  children,
}: {
  registration: PhiCollectionProviderRegistration;
  children: ReactNode;
}) {
  const parent = useContext(PhiCollectionProviderRegistryContext);
  const registry = useMemo(() => {
    if (!isPhiRuntimeDataProviderKey(registration.key)) {
      throw new Error(`Invalid collection provider key "${registration.key}".`);
    }
    if (parent.has(registration.key)) {
      throw new Error(`Duplicate active collection provider "${registration.key}".`);
    }
    const next = new Map(parent);
    next.set(registration.key, registration);
    return next;
  }, [parent, registration]);

  return (
    <PhiCollectionProviderRegistryContext.Provider value={registry}>
      {children}
    </PhiCollectionProviderRegistryContext.Provider>
  );
}

export function PhiCollectionProviderIsolationBoundary({ children }: { children: ReactNode }) {
  return (
    <PhiCollectionProviderRegistryContext.Provider value={EMPTY_COLLECTION_PROVIDER_REGISTRY}>
      {children}
    </PhiCollectionProviderRegistryContext.Provider>
  );
}

export function usePhiCollectionProvider(source: PhiCollectionProviderDataSource | null) {
  const registry = useContext(PhiCollectionProviderRegistryContext);
  const provider = source ? registry.get(source.providerKey) ?? null : null;
  const resource = source && provider
    ? provider.resources.find((entry) => entry.resourceKey === source.resourceKey) ?? null
    : null;

  return {
    provider,
    resource,
    bindingError: !source
      ? "Collection data provider is not configured."
      : !provider
        ? `Collection provider "${source.providerKey}" is not available from the active runtime modules.`
        : !resource
          ? `Collection resource "${source.resourceKey}" is not available from provider "${source.providerKey}".`
        : null,
  };
}

export function usePhiCollectionProviderAction(source: PhiCollectionProviderDataSource | null) {
  const { provider, bindingError } = usePhiCollectionProvider(source);

  return useCallback(async (
    value: Omit<PhiCollectionProviderActionRequest, "resourceKey" | "params" | "signal">,
  ) => {
    if (bindingError || !provider || !source) {
      throw new Error(bindingError ?? "Collection provider is unavailable.");
    }
    if (!provider.action) {
      throw new Error(`Collection provider "${source.providerKey}" is read-only.`);
    }
    const abortController = new AbortController();
    return provider.action({
      ...value,
      resourceKey: source.resourceKey,
      params: source.params,
      signal: abortController.signal,
    });
  }, [bindingError, provider, source]);
}
