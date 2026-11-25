"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  PhiCollectionProviderQuery,
  PhiCollectionViewBindingModel,
} from "../../../../types/collection-provider";
import type { PhiProviderResourceSource } from "../../../../types/runtime-data-provider";
import { usePhiIntlLocale, usePhiIntlTimeZone } from "../../../root/phi-intl-locale";
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
  source: PhiProviderResourceSource | null;
  initialQuery?: PhiCollectionProviderQuery;
  pageSize?: number;
}) {
  const { provider, resource, bindingError } = usePhiCollectionProvider(source);
  // Sent with every query and part of its key, so a live language switch asks again.
  const locale = usePhiIntlLocale();
  const timeZone = usePhiIntlTimeZone();
  const [query, setQuery] = useState<PhiCollectionProviderQuery>(() => buildInitialQuery(initialQuery, pageSize));
  const [data, setData] = useState<PhiCollectionViewBindingModel["data"]>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /*
   * What the last read of the source failed with, apart from `error`.
   *
   * `error` is also where an action's refusal lands -- a delete the Provider turned down -- and that is
   * the reader's to see. A read that failed is the source's failure, which the Widget hands to
   * `PhiWidgetFailure` instead: nothing on a live page, the cause in the Builder. Only the query writes
   * it, so an action can never make the Widget disappear.
   */
  const [queryError, setQueryError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [openPanelKey, setOpenPanelKey] = useState<string | null>(null);
  /*
   * Which request may still write `data`. Every query and every action takes the next number, and an
   * answer lands only while its number is the latest -- so a delete that returns after the person has
   * searched on cannot put the old list back over the new one. A query is also aborted when the next
   * one starts; an action is not, because what it does on the Server has to finish either way.
   */
  const latestRequestRef = useRef(0);
  const initialQueryKey = JSON.stringify(buildInitialQuery(initialQuery, pageSize));
  // The params belong to the source: a new set (the Widget's `bindingParamsChange`) starts the list over.
  const sourceKey = JSON.stringify([source?.providerKey ?? "", source?.resourceKey ?? "", source?.params ?? null]);
  const requestKey = useMemo(() => JSON.stringify([
    source?.providerKey ?? null,
    source?.resourceKey ?? null,
    source?.params ?? null,
    query,
    locale,
    timeZone,
    refreshToken,
  ]), [locale, query, refreshToken, source, timeZone]);

  useEffect(() => {
    const nextQuery = JSON.parse(initialQueryKey) as PhiCollectionProviderQuery;
    const timer = window.setTimeout(() => {
      setQuery((current) => JSON.stringify(current) === JSON.stringify(nextQuery) ? current : nextQuery);
      setData(null);
      setError(null);
      setQueryError(null);
      setOpenPanelKey(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialQueryKey, sourceKey]);

  useEffect(() => {
    if (!provider || !source || bindingError) return;
    const abortController = new AbortController();
    const requestId = ++latestRequestRef.current;
    const isCurrent = () => !abortController.signal.aborted && requestId === latestRequestRef.current;
    let loadingTimer: number | undefined;
    const queryTimer = window.setTimeout(() => {
      if (abortController.signal.aborted) return;
      setError(null);
      setQueryError(null);
      // Reset the source first, and only show loading if its answer actually remains pending.
      loadingTimer = window.setTimeout(() => {
        if (isCurrent()) setLoading(true);
      }, 0);
      void Promise.resolve().then(() => provider.query({
        resourceKey: source.resourceKey,
        query,
        params: source.params,
        locale,
        timeZone,
        signal: abortController.signal,
      })).then((nextData) => {
        if (!isCurrent()) return;
        setData(nextData);
        setError(nextData.error);
        setQueryError(nextData.error);
      }).catch((nextError: unknown) => {
        if (isCurrent()) {
          const message = nextError instanceof Error ? nextError.message : "Collection request failed.";
          setError(message);
          setQueryError(message);
        }
      }).finally(() => {
        window.clearTimeout(loadingTimer);
        // Superseded by an action is still finished loading; only a newer query takes the flag over.
        if (!abortController.signal.aborted) setLoading(false);
      });
    }, 0);
    return () => {
      window.clearTimeout(queryTimer);
      window.clearTimeout(loadingTimer);
      abortController.abort();
    };
  }, [bindingError, locale, provider, query, requestKey, source, timeZone]);

  const reload = useCallback(() => setRefreshToken((current) => current + 1), []);
  const activate = useCallback<PhiCollectionViewBindingModel["activate"]>(async (request) => {
    if (!provider || !source || bindingError) {
      throw new Error(bindingError ?? "Collection provider is unavailable.");
    }
    if (!provider.action) throw new Error(`Collection provider "${source.providerKey}" is read-only.`);
    const abortController = new AbortController();
    const requestId = ++latestRequestRef.current;
    const nextData = await provider.action({
      ...request,
      resourceKey: source.resourceKey,
      params: source.params,
      query: request.query ?? query,
      signal: abortController.signal,
    });
    if (requestId === latestRequestRef.current) {
      setData(nextData);
      setError(nextData.error);
    }
    return nextData;
  }, [bindingError, provider, query, source]);

  // One object while nothing in it changes, so a View can depend on the binding without restarting
  // whatever it runs on every render of the Widget around it.
  const binding = useMemo<PhiCollectionViewBindingModel>(() => ({
    query,
    data,
    loading,
    error,
    openPanelKey,
    setQuery,
    setOpenPanelKey,
    reload,
    activate,
  }), [activate, data, error, loading, openPanelKey, query, reload]);

  return { provider, resource, bindingError, queryError, binding };
}
