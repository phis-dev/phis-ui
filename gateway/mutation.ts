export type PhiMutationMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export type PhiMutationTransport = "relay" | "site";

export type PhiMutationRequestShape = {
  queryMap?: Record<string, string>;
};

export type PhiMutationResponseShape = {
  okKey?: string;
  dataKey?: string;
  errorKey?: string;
  metaKey?: string;
};

export type PhiMutation =
  | {
      kind: "api";
      upstreamPath: string;
      endpointKey: string;
      method: PhiMutationMethod;
      transport?: PhiMutationTransport;
      requestShape?: PhiMutationRequestShape;
      responseShape?: PhiMutationResponseShape;
    }
  | {
      kind: "serverAction";
      actionKey: string;
    };

export type PhiMutationQueryValue = string | number | boolean | null | undefined;
export type PhiMutationQuery = Record<string, PhiMutationQueryValue>;

export type PhiMutationLoadOptions = {
  query?: PhiMutationQuery;
  body?: BodyInit | Record<string, unknown> | string | null;
  headers?: Record<string, string>;
};

export type PhiMutationFetchContext = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey?: string;
  userAgent?: string;
  extraHeaders?: Record<string, string>;
};

export function normalizePhiMutationMethod(value: string | null | undefined): PhiMutationMethod | null {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (normalized === "POST" || normalized === "PUT" || normalized === "PATCH" || normalized === "DELETE") {
    return normalized;
  }

  return null;
}

export function normalizePhiMutationTransport(value: string | null | undefined): PhiMutationTransport {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized === "site" ? "site" : "relay";
}

export function buildPhiMutationUrl(
  source: Extract<PhiMutation, { kind: "api" }>,
  options?: { query?: PhiMutationQuery },
) {
  return buildPhiGatewayRequestUrl({
    upstreamPath: source.upstreamPath,
    queryMap: source.requestShape?.queryMap,
    query: options?.query,
  });
}

export function normalizePhiMutationResponseShape(shape: PhiMutationResponseShape | null | undefined) {
  return {
    okKey: typeof shape?.okKey === "string" ? shape.okKey.trim() : "",
    dataKey: typeof shape?.dataKey === "string" ? shape.dataKey.trim() : "",
    errorKey: typeof shape?.errorKey === "string" ? shape.errorKey.trim() : "",
    metaKey: typeof shape?.metaKey === "string" ? shape.metaKey.trim() : "",
  };
}
import { buildPhiGatewayRequestUrl } from "./request-url";
