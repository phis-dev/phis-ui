"use client";

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from "react";

import type {
  PhiControlOption,
  PhiControlOptionsProviderConfig,
  PhiControlOptionsProviderDependency,
} from "./phi-control-options";
import {
  isPhiRuntimeDataProviderKey,
  type PhiRuntimeDataProviderKey,
} from "../../types/runtime-data-provider";

export type PhiResolvedControlOptions<TValue extends string | number = string> = {
  options: PhiControlOption<TValue>[];
  value?: TValue;
  valueMode?: "fallback" | "authoritative";
  warning?: string;
};

/**
 * What a control has to know about searching, once the declared configuration is read.
 *
 * Derived from `optionsProvider.loadMode` and `optionsProvider.search` rather than reported by the
 * provider: both are declared on the field, so a control knows before the first answer arrives -- and
 * one declaration cannot disagree with another.
 */
export type PhiControlOptionsSearchState = {
  /** Whether the control should offer a search box that reaches the provider at all. */
  enabled: boolean;
  /** How many characters before the provider is asked. */
  minChars: number;
  /**
   * `false` where the provider answered the search itself. Filtering such an answer again would drop
   * matches the route made on an address or an alias the label never shows.
   */
  filterLocally: boolean;
};

export type PhiControlOptionsProviderContext<TValue extends string | number = string> = {
  options: PhiControlOption<TValue>[];
  optionsProvider?: PhiControlOptionsProviderConfig | null;
  sourceConfig?: Record<string, unknown> | null;
  /**
   * What the person has typed into the control, already debounced by it.
   *
   * Empty unless the control has a search box and something is in it. A provider that resolves from
   * what it already holds ignores this; one that asks a route takes it into `resolveLoadKey` and into
   * the request, and answers with `searchMode: "server"`.
   */
  search: string;
  /**
   * The values other fields hold, resolved from what this provider declared it needs.
   *
   * Keyed by the `param` name each dependency named, so a provider reads `dependencies.groupId` without
   * knowing which field supplies it or where that field lives.
   */
  dependencies: Record<string, unknown>;
  snapshot: unknown;
  asyncData: unknown;
};

export type PhiControlOptionsProviderRegistration<TValue extends string | number = string> = {
  key: PhiRuntimeDataProviderKey;
  resolve: (context: PhiControlOptionsProviderContext<TValue>) => PhiResolvedControlOptions<TValue>;
  load?: (context: Omit<PhiControlOptionsProviderContext<TValue>, "asyncData">) => Promise<unknown>;
  resolveLoadKey?: (context: Omit<PhiControlOptionsProviderContext<TValue>, "asyncData">) => string;
  subscribe?: (listener: () => void) => () => void;
  getSnapshot?: () => unknown;
  /**
   * Snapshot React uses for the server render and for hydration. It must not read a Client store: a
   * store that filled before React hydrated would render a label the server could not know, and the
   * markup would disagree. Defaults to the empty snapshot, so options appear after hydration.
   */
  getServerSnapshot?: () => unknown;
};

export type PhiStaticControlOptionsProviderRegistration<TValue extends string | number = string> = Pick<
  PhiControlOptionsProviderRegistration<TValue>,
  "key" | "resolve"
>;

type AnyOptionsProviderRegistration = PhiControlOptionsProviderRegistration<string | number>;

const EMPTY_OPTIONS_PROVIDER_REGISTRY = new Map<
  PhiRuntimeDataProviderKey,
  AnyOptionsProviderRegistration
>();
const PhiControlOptionsProviderRegistryContext = createContext<
  ReadonlyMap<PhiRuntimeDataProviderKey, AnyOptionsProviderRegistration>
>(EMPTY_OPTIONS_PROVIDER_REGISTRY);
const EMPTY_PROVIDER_SNAPSHOT = null;
/** Shared, so a provider without dependencies keeps the same object across renders. */
const EMPTY_DEPENDENCY_VALUES: Record<string, unknown> = Object.freeze({});
/** One pause, not one request per keystroke. */
const PHI_OPTIONS_SEARCH_DEBOUNCE_MS = 250;
const IN_FLIGHT_PROVIDER_LOADS = new WeakMap<
  object,
  Map<string, Promise<unknown>>
>();

function loadProviderData<TValue extends string | number>(
  provider: PhiControlOptionsProviderRegistration<TValue>,
  loadKey: string,
  context: Omit<PhiControlOptionsProviderContext<TValue>, "asyncData">,
) {
  if (!provider.load) {
    return Promise.resolve(null);
  }
  let providerLoads = IN_FLIGHT_PROVIDER_LOADS.get(provider);
  if (!providerLoads) {
    providerLoads = new Map();
    IN_FLIGHT_PROVIDER_LOADS.set(provider, providerLoads);
  }
  const activeLoad = providerLoads.get(loadKey);
  if (activeLoad) {
    return activeLoad;
  }
  const nextLoad = provider.load(context);
  providerLoads.set(loadKey, nextLoad);
  void nextLoad.then(
    () => {
      if (providerLoads.get(loadKey) === nextLoad) providerLoads.delete(loadKey);
    },
    () => {
      if (providerLoads.get(loadKey) === nextLoad) providerLoads.delete(loadKey);
    },
  );
  return nextLoad;
}

function normalizeStaticOptions<TValue extends string | number>(
  options?: readonly { value: TValue; label?: string; disabled?: boolean; description?: string; icon?: string }[] | null,
): PhiControlOption<TValue>[] {
  return (options ?? []).map((option) => ({
    value: option.value,
    label: option.label ?? String(option.value),
    disabled: option.disabled,
    description: option.description,
    icon: option.icon,
  }));
}

export function readPhiControlOptionsProviderParam(
  provider: PhiControlOptionsProviderConfig | null | undefined,
  key: string,
): string | undefined {
  const value = provider?.params?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

/**
 * What a declared dependency currently resolves to, and whether the provider may be asked at all.
 *
 * Resolved here rather than by each provider for the same reason the search policy is: it has to reach
 * the load key, and a provider that resolved its own dependencies would be reading them after the
 * decision to reload was already made. `satisfied` is false while a required parent has no value --
 * the provider is then not asked and answers with nothing, which is the honest state.
 */
export function resolvePhiControlOptionsDependencies(
  dependencies: readonly PhiControlOptionsProviderDependency[] | undefined,
  sources: { form?: Record<string, unknown> | null; config?: Record<string, unknown> | null },
): { values: Record<string, unknown>; satisfied: boolean } {
  if (!dependencies || dependencies.length === 0) {
    return { values: EMPTY_DEPENDENCY_VALUES, satisfied: true };
  }
  const values: Record<string, unknown> = {};
  let satisfied = true;
  for (const dependency of dependencies) {
    const source = dependency.source === "form" ? sources.form : sources.config;
    const value = dependency.valuePath.split(".").filter(Boolean).reduce<unknown>((current, segment) =>
      current && typeof current === "object" && !Array.isArray(current)
        ? (current as Record<string, unknown>)[segment]
        : undefined, source ?? undefined);
    // An empty string is no value: a cleared select reports one, and asking the route with it would
    // narrow to nothing rather than to the parent that is missing.
    const present = value != null && value !== "";
    if (present) values[dependency.param] = value;
    if (!present && dependency.required) satisfied = false;
  }
  return { values, satisfied };
}

export function readPhiControlOptionsProviderSourceValue(
  context: Pick<PhiControlOptionsProviderContext<string | number>, "optionsProvider" | "sourceConfig">,
  paramKey: string,
) {
  const path = readPhiControlOptionsProviderParam(context.optionsProvider, paramKey);
  if (!path) {
    return undefined;
  }
  return path.split(".").filter(Boolean).reduce<unknown>((current, segment) =>
    current && typeof current === "object" && !Array.isArray(current)
      ? (current as Record<string, unknown>)[segment]
      : undefined, context.sourceConfig);
}

function subscribeEmptyProvider() {
  return () => undefined;
}

function getEmptyProviderSnapshot() {
  return EMPTY_PROVIDER_SNAPSHOT;
}

/**
 * Whether a provider's resolver may run for the snapshot it was handed.
 *
 * A store-backed provider has no state on the server: `getServerSnapshot` answers with the empty
 * snapshot on purpose, so the markup cannot disagree with what hydration produces. A resolver reads that
 * snapshot as its own store's shape, so calling it with nothing throws -- the Builder's
 * `resolveProviderArea` read `.area` off it and took the whole server render down with it. The provider
 * simply has no options yet; they arrive on the client one render later.
 *
 * The check lives here rather than in each resolver so a new provider inherits it instead of having to
 * remember it.
 */
export function canPhiControlOptionsResolverRun(
  provider: Pick<PhiControlOptionsProviderRegistration<never>, "getSnapshot"> | null | undefined,
  snapshot: unknown,
) {
  return !provider?.getSnapshot || snapshot !== EMPTY_PROVIDER_SNAPSHOT;
}

export function createPhiControlOptionsProviderClient<TValue extends string | number = string>(
  registration: PhiControlOptionsProviderRegistration<TValue>,
): ComponentType<{ children: ReactNode }> {
  if (!isPhiRuntimeDataProviderKey(registration.key)) {
    throw new Error(`Invalid control options provider key "${registration.key}".`);
  }
  if (registration.load && !registration.resolveLoadKey) {
    throw new Error(`Async options provider "${registration.key}" must define resolveLoadKey().`);
  }

  return function PhiControlOptionsProviderClient({ children }) {
    const parent = useContext(PhiControlOptionsProviderRegistryContext);
    const registry = useMemo(() => {
      if (parent.has(registration.key)) {
        throw new Error(`Duplicate active control options provider "${registration.key}".`);
      }
      const next = new Map(parent);
      next.set(registration.key, registration as unknown as AnyOptionsProviderRegistration);
      return next;
    }, [parent]);

    return createElement(
      PhiControlOptionsProviderRegistryContext.Provider,
      { value: registry },
      children,
    );
  };
}

export function createPhiStaticControlOptionsProviderClient<TValue extends string | number = string>(
  registration: PhiStaticControlOptionsProviderRegistration<TValue>,
) {
  return createPhiControlOptionsProviderClient(registration);
}

export function PhiControlOptionsProviderIsolationBoundary({ children }: { children: ReactNode }) {
  return createElement(
    PhiControlOptionsProviderRegistryContext.Provider,
    { value: EMPTY_OPTIONS_PROVIDER_REGISTRY },
    children,
  );
}

export function usePhiControlOptionsProvider<TValue extends string | number = string>({
  options,
  optionsProvider,
  sourceConfig,
  searchDraft = "",
  formValues,
}: {
  options?: readonly { value: TValue; label?: string; disabled?: boolean; description?: string; icon?: string }[] | null;
  optionsProvider?: PhiControlOptionsProviderConfig | null;
  sourceConfig?: Record<string, unknown> | null;
  /** Raw text from the control. Debouncing and the minimum length are applied here, once, for everyone. */
  searchDraft?: string;
  /**
   * The live values of the surrounding form, where there is one.
   *
   * Only a declared dependency reads them, so a control that passes them changes nothing for a provider
   * that asked for nothing. A surface without a form -- the Builder Inspector, a Table cell editor --
   * passes none, and a `form` dependency simply has no value there.
   */
  formValues?: Record<string, unknown> | null;
}): PhiResolvedControlOptions<TValue> & { search: PhiControlOptionsSearchState } {
  const registry = useContext(PhiControlOptionsProviderRegistryContext);
  const staticOptions = useMemo(() => normalizeStaticOptions(options), [options]);
  /*
   * The declared search policy, applied in one place. A field states whether its provider can be
   * searched and from how many characters; the load mode states who narrows the list. Debouncing lives
   * here too, because the alternative is every provider reinventing the same guard.
   */
  const searchState: PhiControlOptionsSearchState = useMemo(() => ({
    enabled: optionsProvider?.search?.enabled === true,
    minChars: Math.max(optionsProvider?.search?.minChars ?? 2, 1),
    filterLocally: optionsProvider?.loadMode !== "server",
  }), [optionsProvider?.loadMode, optionsProvider?.search?.enabled, optionsProvider?.search?.minChars]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    const normalized = searchState.enabled ? searchDraft.trim() : "";
    const next = normalized.length >= searchState.minChars ? normalized : "";
    if (next === search) return undefined;
    const timer = setTimeout(() => setSearch(next), PHI_OPTIONS_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, searchDraft, searchState.enabled, searchState.minChars]);
  const registeredProvider = optionsProvider?.providerKey
    ? registry.get(optionsProvider.providerKey) as unknown as PhiControlOptionsProviderRegistration<TValue> ?? null
    : null;
  const providerSnapshot = useSyncExternalStore(
    registeredProvider?.subscribe ?? subscribeEmptyProvider,
    registeredProvider?.getSnapshot ?? getEmptyProviderSnapshot,
    // Hydration has to reproduce the server's markup, so it must not read the live Client store. The
    // Builder Page Cascader rendered the raw storage path on the server and the resolved title on the
    // client whenever the catalog won the race, which React reports as a hydration mismatch.
    registeredProvider?.getServerSnapshot ?? getEmptyProviderSnapshot,
  );
  const [asyncDataState, setAsyncDataState] = useState<{
    key: string;
    data: unknown;
    error: string | null;
  } | null>(null);
  /*
   * Part of every load key, not left to each provider: a provider that forgot a dependency would answer
   * with what it loaded for the previous parent value -- the same stale answer the revision store exists
   * to prevent, only harder to see, because the list is plausible. `resolveLoadKey` replaces the default
   * key entirely, so the dependencies are prefixed outside it where nothing can drop them.
   */
  const { values: dependencyValues, satisfied: dependenciesSatisfied } = useMemo(
    () => resolvePhiControlOptionsDependencies(optionsProvider?.dependencies, {
      form: formValues,
      config: sourceConfig,
    }),
    [optionsProvider?.dependencies, formValues, sourceConfig],
  );
  const defaultProviderLoadKey = JSON.stringify({
    providerKey: optionsProvider?.providerKey ?? null,
    area: optionsProvider?.area ?? null,
    scopeKey: optionsProvider?.scopeKey ?? null,
    params: optionsProvider?.params ?? null,
    dependencies: dependencyValues,
  });
  const loadContext = {
    options: staticOptions,
    optionsProvider,
    sourceConfig,
    // Not part of the default load key: a provider that does not search must not reload on every
    // keystroke, so taking the search into account is the searching provider's own decision.
    search,
    dependencies: dependencyValues,
    snapshot: providerSnapshot,
  };
  const providerLoadKey = registeredProvider?.load
    ? [
        registeredProvider.key,
        JSON.stringify(dependencyValues),
        registeredProvider.resolveLoadKey?.(loadContext) ?? defaultProviderLoadKey,
      ].join(":")
    : defaultProviderLoadKey;
  const asyncData = asyncDataState?.key === providerLoadKey ? asyncDataState.data : null;
  const asyncError = asyncDataState?.key === providerLoadKey ? asyncDataState.error : null;
  // A provider whose required parent has no value yet is not waiting for an answer; there is no
  // question. Counting it as pending would leave the control loading for as long as the field is empty.
  const mayLoad = Boolean(registeredProvider?.load) && dependenciesSatisfied;
  const asyncPending = mayLoad && asyncDataState?.key !== providerLoadKey;
  const loadCurrentProviderData = useEffectEvent(() => {
    if (!mayLoad || !registeredProvider?.load) {
      return Promise.resolve(null);
    }
    return loadProviderData(registeredProvider, providerLoadKey, loadContext);
  });

  useEffect(() => {
    if (!mayLoad || !registeredProvider?.load) {
      return undefined;
    }

    let cancelled = false;
    void loadCurrentProviderData()
      .then((nextData) => {
        if (!cancelled) {
          setAsyncDataState({ key: providerLoadKey, data: nextData, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setAsyncDataState({
            key: providerLoadKey,
            data: null,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    mayLoad,
    providerLoadKey,
    registeredProvider,
  ]);

  return useMemo(() => {
    if (!optionsProvider?.providerKey) {
      return { options: staticOptions, search: searchState };
    }
    if (!registeredProvider) {
      return {
        options: [],
        search: searchState,
        warning: `Options provider "${optionsProvider.providerKey}" is not available from the active runtime modules.`,
      };
    }
    if (!dependenciesSatisfied) {
      // Nothing to offer until the field this one depends on has a value. Not a warning: the form is
      // simply not far enough along yet.
      return { options: [], search: searchState };
    }
    if (asyncError) {
      return {
        options: [],
        search: searchState,
        warning: `Options provider "${optionsProvider.providerKey}" failed to load: ${asyncError}`,
      };
    }
    if (asyncPending) {
      return { options: [], search: searchState };
    }
    if (!canPhiControlOptionsResolverRun(registeredProvider, providerSnapshot)) {
      // The configured options are not store-backed, so they survive the server render.
      return { options: staticOptions, search: searchState };
    }

    return {
      ...registeredProvider.resolve({
        options: staticOptions,
        optionsProvider,
        sourceConfig,
        search,
        dependencies: dependencyValues,
        snapshot: providerSnapshot,
        asyncData,
      }),
      search: searchState,
    };
  }, [
    search,
    searchState,
    dependenciesSatisfied,
    dependencyValues,
    asyncData,
    asyncError,
    asyncPending,
    optionsProvider,
    providerSnapshot,
    registeredProvider,
    sourceConfig,
    staticOptions,
  ]);
}
