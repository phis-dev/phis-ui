const DEFAULT_API_BASE_URL = "";

export const API_PATHS = {
  shop: "/api/shop",
  v1: "/api/v1",
  auth: "/api/auth",
} as const;

export const PHI_SERVER_API_CACHE_TAG = "phi-server-api-v1" as const;
export const DEFAULT_GET_REVALIDATE_SECONDS = 86400 as const;

export const MEDUSA_API_PREFIXES = [API_PATHS.auth] as const;

export type ApiHeaderOptions = {
  token?: string;
  publishableApiKey?: string;
  siteKey?: string;
  locale?: string;
  includeToken?: boolean;
  includePublishable?: boolean;
  includeSiteKey?: boolean;
  includeLocale?: boolean;
  extra?: HeadersInit;
};

export function normalizePath(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  return path.startsWith("/") ? path : `/${path}`;
}

export function isApiV1Path(path: string) {
  const normalized = normalizePath(path);
  return normalized === API_PATHS.v1 || normalized.startsWith(`${API_PATHS.v1}/`);
}

export function isMedusaApiPath(path: string) {
  const normalized = normalizePath(path);
  return MEDUSA_API_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

export function buildApiUrl(baseUrl: string | undefined, path: string) {
  const normalizedBase = (baseUrl ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
  const normalizedPath = normalizePath(path);

  if (/^https?:\//.test(normalizedPath) || !normalizedBase) {
    return normalizedPath;
  }

  return `${normalizedBase}${normalizedPath}`;
}

export function buildLocalProxyPath(path: string) {
  return normalizePath(path);
}

export function buildApiHeaders({
  token = "",
  publishableApiKey = "",
  siteKey = "",
  locale = "",
  includeToken = false,
  includePublishable = false,
  includeSiteKey = false,
  includeLocale = false,
  extra = {},
}: ApiHeaderOptions = {}) {
  const headers = new Headers(extra);

  if (includeToken && token) {
    headers.set("x-phi-token", token);
  }

  if (includePublishable && publishableApiKey) {
    headers.set("x-publishable-api-key", publishableApiKey);
  }

  if (includeSiteKey && siteKey) {
    headers.set("x-phi-site-key", siteKey);
  }

  if (includeLocale && locale) {
    headers.set("x-locale", locale);
  }

  return headers;
}
