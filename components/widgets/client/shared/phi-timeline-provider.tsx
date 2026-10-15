"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";

import { readPhiTimelineEntries, type PhiTimelineEntry, type PhiTimelineProviderResult } from "@phis/contracts/timeline";
import {
  isPhiRuntimeDataProviderKey,
  type PhiRuntimeDataProviderBinding,
  type PhiRuntimeDataProviderKey,
} from "../../../../types/runtime-data-provider";

/*
 * Timeline Providers: a Module's answer to "what happened", for a Timeline Widget to draw.
 *
 * A Provider of its own kind rather than an options or collection one. Options are values a person
 * picks, and a Collection Provider draws its items itself; a timeline entry is a moment with a time, a
 * tone and a state, and the Widget draws it. Like every Provider it runs in the Client, registered by
 * its Module's client manifest, and nested Providers form a registry in which a key is active once.
 */

export type PhiTimelineProviderRequest = {
  scopeKey?: string;
  params?: Record<string, unknown>;
};

export type PhiTimelineProviderRegistration = {
  key: PhiRuntimeDataProviderKey;
  load: (request: PhiTimelineProviderRequest) => Promise<PhiTimelineProviderResult>;
  /**
   * What the answer depends on beyond scope and params -- a revision the Module bumps when its data
   * changes. Left out, the same request is answered once for every Widget that asks it.
   */
  resolveLoadKey?: (request: PhiTimelineProviderRequest) => string;
};

const EMPTY_TIMELINE_PROVIDER_REGISTRY = new Map<PhiRuntimeDataProviderKey, PhiTimelineProviderRegistration>();
const PhiTimelineProviderRegistryContext = createContext<ReadonlyMap<PhiRuntimeDataProviderKey, PhiTimelineProviderRegistration>>(
  EMPTY_TIMELINE_PROVIDER_REGISTRY,
);

function assertPhiTimelineProviderRegistration(registration: PhiTimelineProviderRegistration) {
  if (!isPhiRuntimeDataProviderKey(registration.key)) {
    throw new Error(`Invalid Timeline provider key "${registration.key}".`);
  }
}

export function createPhiTimelineProviderClient(
  registration: PhiTimelineProviderRegistration,
): ComponentType<{ children: ReactNode }> {
  assertPhiTimelineProviderRegistration(registration);
  return function PhiBoundTimelineProviderClient({ children }) {
    return <PhiTimelineProviderClient registration={registration}>{children}</PhiTimelineProviderClient>;
  };
}

export function PhiTimelineProviderClient({
  registration,
  children,
}: {
  registration: PhiTimelineProviderRegistration;
  children: ReactNode;
}) {
  const parent = useContext(PhiTimelineProviderRegistryContext);
  const registry = useMemo(() => {
    assertPhiTimelineProviderRegistration(registration);
    if (parent.has(registration.key)) {
      throw new Error(`Duplicate active Timeline provider "${registration.key}".`);
    }
    const next = new Map(parent);
    next.set(registration.key, registration);
    return next;
  }, [parent, registration]);
  return createElement(PhiTimelineProviderRegistryContext.Provider, { value: registry }, children);
}

export function PhiTimelineProviderIsolationBoundary({ children }: { children: ReactNode }) {
  return createElement(PhiTimelineProviderRegistryContext.Provider, { value: EMPTY_TIMELINE_PROVIDER_REGISTRY }, children);
}

/* One request in flight per Provider and load key, shared by every Widget that asks it at once. */
const pendingLoads = new WeakMap<PhiTimelineProviderRegistration, Map<string, Promise<PhiTimelineEntry[]>>>();

function loadEntries(registration: PhiTimelineProviderRegistration, request: PhiTimelineProviderRequest, loadKey: string) {
  const byKey = pendingLoads.get(registration) ?? new Map<string, Promise<PhiTimelineEntry[]>>();
  pendingLoads.set(registration, byKey);
  const pending = byKey.get(loadKey);
  if (pending) return pending;
  const next = registration.load(request)
    /* The answer is read as the contract spells it: whatever else a Provider sends is not an entry. */
    .then((result) => readPhiTimelineEntries(result?.entries))
    .finally(() => byKey.delete(loadKey));
  byKey.set(loadKey, next);
  return next;
}

export type PhiTimelineProviderEntries = {
  entries: PhiTimelineEntry[];
  loading: boolean;
  /** Why there are no entries from the Provider, for the author: not configured, not active, failed. */
  error: string | null;
  /** Asks the Provider again, for a Widget told its data changed. */
  reload: () => void;
};

const NO_ENTRIES: PhiTimelineEntry[] = [];

/** The entries a bound Timeline Provider answers; `null` binding is no Provider and no entries. */
export function usePhiTimelineProviderEntries(binding: PhiRuntimeDataProviderBinding | null): PhiTimelineProviderEntries {
  const registry = useContext(PhiTimelineProviderRegistryContext);
  const provider = binding ? registry.get(binding.providerKey) ?? null : null;
  const [revision, setRevision] = useState(0);
  const scopeKey = binding?.scopeKey;
  const params = binding?.params;
  const request = useMemo<PhiTimelineProviderRequest>(() => ({
    ...(scopeKey ? { scopeKey } : {}),
    ...(params ? { params } : {}),
  }), [params, scopeKey]);
  const loadKey = provider
    ? [
        provider.key,
        JSON.stringify(request),
        provider.resolveLoadKey?.(request) ?? "",
        revision,
      ].join(":")
    : null;
  const [state, setState] = useState<{ key: string | null; entries: PhiTimelineEntry[]; error: string | null }>({
    key: null,
    entries: NO_ENTRIES,
    error: null,
  });

  useEffect(() => {
    if (!provider || !loadKey) return;
    let cancelled = false;
    loadEntries(provider, request, loadKey).then(
      (entries) => {
        if (!cancelled) setState({ key: loadKey, entries, error: null });
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({
            key: loadKey,
            entries: NO_ENTRIES,
            error: `Timeline provider "${provider.key}" failed to load: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [loadKey, provider, request]);

  const reload = useCallback(() => setRevision((current) => current + 1), [setRevision]);

  if (!binding) {
    return { entries: NO_ENTRIES, loading: false, error: null, reload };
  }
  if (!provider) {
    return {
      entries: NO_ENTRIES,
      loading: false,
      error: `Timeline provider "${binding.providerKey}" is not available from the active runtime modules.`,
      reload,
    };
  }
  const settled = state.key === loadKey;
  /* While a reload runs, the entries it replaces stay drawn rather than the list going blank. */
  return {
    entries: state.entries,
    loading: !settled,
    error: settled ? state.error : null,
    reload,
  };
}
