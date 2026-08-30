"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  PhiCollectionProviderDataSource,
  PhiCollectionProviderQuery,
  PhiCollectionViewBindingModel,
} from "../../../../types/collection-provider";
import { usePhiCollectionProvider } from "./phi-collection-provider";

function buildInitialQuery(initialQuery: PhiCollectionProviderQuery | undefined, pageSize: number | undefined) {
  return {
    ...initialQuery,
    page: initialQuery?.page ?? 1,
    pageSize: initialQuery?.pageSize ?? pageSize ?? 20,
    filters: { ...(initialQuery?.filters ?? {}) },
  } satisfies PhiCollectionProviderQuery;
}

export function usePhiCollectionViewBinding({
  source,
  initialQuery,
  pageSize,
}: {
  source: PhiCollectionProviderDataSource | null;
  initialQuery?: PhiCollectionProviderQuery;
  pageSize?: number;
}) {
  const { provider, resource, bindingError } = usePhiCollectionProvider(source);
  const [query, setQuery] = useState<PhiCollectionProviderQuery>(() => buildInitialQuery(initialQuery, pageSize));
  const [data, setData] = useState<PhiCollectionViewBindingModel["data"]>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [openPanelKey, setOpenPanelKey] = useState<string | null>(null);
  const initialQueryKey = JSON.stringify(buildInitialQuery(initialQuery, pageSize));
  const sourceKey = `${source?.providerKey ?? ""}:${source?.resourceKey ?? ""}`;
  const requestKey = useMemo(() => JSON.stringify([
    source?.providerKey ?? null,
    source?.resourceKey ?? null,
    source?.params ?? null,
    query,
    refreshToken,
  ]), [query, refreshToken, source]);

  useEffect(() => {
    const nextQuery = JSON.parse(initialQueryKey) as PhiCollectionProviderQuery;
    const timer = window.setTimeout(() => {
      setQuery((current) => JSON.stringify(current) === JSON.stringify(nextQuery) ? current : nextQuery);
      setData(null);
      setError(null);
      setOpenPanelKey(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialQueryKey, sourceKey]);

  useEffect(() => {
    if (!provider || !source || bindingError) return;
    const abortController = new AbortController();
    const loadingTimer = window.setTimeout(() => {
      if (abortController.signal.aborted) return;
      setLoading(true);
      setError(null);
    }, 0);
    void provider.query({
      resourceKey: source.resourceKey,
      query,
      params: source.params,
      signal: abortController.signal,
    }).then((nextData) => {
      if (abortController.signal.aborted) return;
      setData(nextData);
      setError(nextData.error);
    }).catch((nextError: unknown) => {
      if (!abortController.signal.aborted) {
        setError(nextError instanceof Error ? nextError.message : "Collection request failed.");
      }
    }).finally(() => {
      if (!abortController.signal.aborted) setLoading(false);
    });
    return () => {
      window.clearTimeout(loadingTimer);
      abortController.abort();
    };
  }, [bindingError, provider, query, requestKey, source]);

  const reload = useCallback(() => setRefreshToken((current) => current + 1), []);
  const activate = useCallback<PhiCollectionViewBindingModel["activate"]>(async (request) => {
    if (!provider || !source || bindingError) {
      throw new Error(bindingError ?? "Collection provider is unavailable.");
    }
    if (!provider.action) throw new Error(`Collection provider "${source.providerKey}" is read-only.`);
    const abortController = new AbortController();
    const nextData = await provider.action({
      ...request,
      resourceKey: source.resourceKey,
      params: source.params,
      query: request.query ?? query,
      signal: abortController.signal,
    });
    setData(nextData);
    setError(nextData.error);
    return nextData;
  }, [bindingError, provider, query, source]);

  return {
    provider,
    resource,
    bindingError,
    binding: {
      query,
      data,
      loading,
      error,
      openPanelKey,
      setQuery,
      setOpenPanelKey,
      reload,
      activate,
    } satisfies PhiCollectionViewBindingModel,
  };
}
