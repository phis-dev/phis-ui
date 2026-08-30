export type PhiDataSourceCacheMode = "no-store" | "force-cache" | "revalidate";

export type PhiDataSourceCache = {
  mode?: PhiDataSourceCacheMode;
  revalidateSeconds?: number;
  tags?: readonly string[];
};

export type PhiDataSourceApiTransport = "relay" | "site";

export type PhiDataSourceRequestShape = {
  queryMap?: Record<string, string>;
};

export type PhiDataSourceResponseShape = {
  rowsKey?: string;
  totalKey?: string;
};

export type PhiDataSource =
  | {
      kind: "api";
      upstreamPath: string;
      endpointKey: string;
      method?: "GET" | "POST";
      transport?: PhiDataSourceApiTransport;
      requestShape?: PhiDataSourceRequestShape;
      responseShape?: PhiDataSourceResponseShape;
      cache?: PhiDataSourceCache;
    }
  | {
      kind: "serverAction";
      actionKey: string;
    }
  | {
      kind: "inline";
      rows: readonly unknown[];
    };

export type PhiDataQueryValue = string | number | boolean | null | undefined;

export type PhiDataQuery = Record<string, PhiDataQueryValue>;

export type PhiDataLoadOptions = {
  query?: PhiDataQuery;
  body?: unknown;
  headers?: Record<string, string>;
  cache?: PhiDataSourceCache;
};

export type PhiDataResult<T = unknown> = {
  ok: boolean;
  data: T;
  total?: number;
  meta?: Record<string, unknown>;
  error?: string | null;
};

export function normalizePhiDataSourceCacheMode(value: string | null | undefined): PhiDataSourceCacheMode {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "no-store" || normalized === "force-cache" || normalized === "revalidate") {
    return normalized;
  }

  return "no-store";
}

export function normalizePhiDataSourceTags(tags: readonly string[] | null | undefined) {
  if (!tags?.length) {
    return [];
  }

  return tags
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function buildPhiDataSourceUrl(
  source: Extract<PhiDataSource, { kind: "api" }>,
  options?: { query?: PhiDataQuery },
) {
  return buildPhiGatewayRequestUrl({
    upstreamPath: source.upstreamPath,
    queryMap: source.requestShape?.queryMap,
    query: options?.query,
  });
}
import { buildPhiGatewayRequestUrl } from "./request-url";
