"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ComponentType,
  type ReactNode,
} from "react";

import {
  isPhiNamespacedRuntimeKey,
  isPhiRuntimeDataProviderKey,
  type PhiRuntimeDataProviderKey,
} from "../../../../types/runtime-data-provider";
import type {
  PhiCollectionProviderActionRequest,
  PhiCollectionProviderData,
  PhiCollectionProviderQueryRequest,
  PhiCollectionProviderRecordRequest,
} from "../../../../types/collection-provider";
import type { PhiProviderResourceSource } from "../../../../types/runtime-data-provider";
import { PhiCollectionSourceFailureText } from "../../shared/collection-source-failure";

export type PhiCollectionProviderRegistration = {
  key: PhiRuntimeDataProviderKey;
  query: (request: PhiCollectionProviderQueryRequest) => Promise<PhiCollectionProviderData>;
  action?: (request: PhiCollectionProviderActionRequest) => Promise<PhiCollectionProviderData>;
  /**
   * One item by its key, for a record-bound Form opened from one of the View's items (FORMS.md, "A
   * record opened from a Collection View"): the Table Provider's `readRecord`, in its request shape. Only
   * for a resource that declares `recordRead: true`, and required by one.
   */
  readRecord?: (request: PhiCollectionProviderRecordRequest) => Promise<Record<string, unknown>>;
  resources: readonly {
    resourceKey: string;
    /**
     * The Render Client that draws this resource's items.
     *
     * A key rather than the component itself, so the renderer is one entry in the Area's Render Client
     * manifest like every other Client -- which is what lets a Module that does not own this resource
     * register another one for the same items, and a Site choose it. The provider names the one it
     * ships; `PhiCmsCollectionViewWidgetConfig.itemRendererKey` names a different one.
     */
    itemRendererKey: `${string}/${string}`;
    /** As the resource's declaration says it (`PhiCollectionProviderResourceDescriptor.recordRead`). */
    recordRead?: boolean;
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
    registration.resources.some((resource) =>
      !resource.resourceKey.trim() || !isPhiNamespacedRuntimeKey(resource.itemRendererKey))) {
    throw new Error(`Collection provider "${registration.key}" has invalid Client resources.`);
  }
  // As a Table Provider's: a record read declared and not served is worse than one never offered.
  const unserved = registration.resources.find((resource) => resource.recordRead === true);
  if (unserved && !registration.readRecord) {
    throw new Error(
      `Collection provider "${registration.key}" declares recordRead on resource "${unserved.resourceKey}" but has no readRecord.`,
    );
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

export function usePhiCollectionProvider(source: PhiProviderResourceSource | null) {
  const registry = useContext(PhiCollectionProviderRegistryContext);
  const provider = source ? registry.get(source.providerKey) ?? null : null;
  const resource = source && provider
    ? provider.resources.find((entry) => entry.resourceKey === source.resourceKey) ?? null
    : null;

  return {
    provider,
    resource,
    bindingError: !source
      ? PhiCollectionSourceFailureText.notConfigured()
      : !provider
        ? PhiCollectionSourceFailureText.providerUnavailable(source.providerKey)
        : !resource
          ? PhiCollectionSourceFailureText.resourceUnavailable(source.resourceKey, source.providerKey)
        : null,
  };
}

export function usePhiCollectionProviderAction(source: PhiProviderResourceSource | null) {
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
