import "server-only";

import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";
import {
  buildPhiDataSourceUrl,
  normalizePhiDataSourceCacheMode,
  type PhiDataSource,
  type PhiDataLoadOptions,
} from "./data-source";

export type PhiDataSourceFetchContext = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey?: string;
  userAgent?: string;
  extraHeaders?: Record<string, string>;
};

export async function fetchPhiDataSourceJson<T>(
  source: Extract<PhiDataSource, { kind: "api" }>,
  context: PhiDataSourceFetchContext,
  options: PhiDataLoadOptions = {},
): Promise<T> {
  if (!context.apiBaseUrl.trim()) {
    throw new Error("Missing apiBaseUrl for fetchPhiDataSourceJson.");
  }

  const url = buildApiUrl(context.apiBaseUrl, buildPhiDataSourceUrl(source, { query: options.query }));
  if (!url) {
    throw new Error("Missing upstreamPath for fetchPhiDataSourceJson.");
  }

  const headers = buildApiHeaders({
    token: context.internalToken,
    siteKey: context.siteKey ?? "",
    includeToken: Boolean(context.internalToken.trim()),
    includeSiteKey: Boolean(context.siteKey?.trim()),
    extra: {
      Accept: "application/json",
      ...(context.userAgent ? { "User-Agent": context.userAgent } : {}),
      ...(context.extraHeaders ?? {}),
      ...(options.headers ?? {}),
    },
  });

  const cacheMode = normalizePhiDataSourceCacheMode(source.cache?.mode);
  const cacheTags = source.cache?.tags?.length ? [...source.cache.tags] : undefined;
  const nextOptions =
    cacheMode === "revalidate" || cacheTags
      ? {
          revalidate:
            typeof source.cache?.revalidateSeconds === "number" && source.cache.revalidateSeconds > 0
              ? source.cache.revalidateSeconds
              : undefined,
          tags: cacheTags,
        }
      : undefined;

  const response = await fetch(url, {
    method: source.method ?? "GET",
    headers,
    body: source.method === "GET" ? undefined : options.body ? JSON.stringify(options.body) : undefined,
    cache: cacheMode === "no-store" ? "no-store" : "force-cache",
    ...(nextOptions ? { next: nextOptions } : {}),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || `Failed to fetch data source at ${source.upstreamPath}.`);
  }

  return (await response.json()) as T;
}
