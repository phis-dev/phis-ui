import { PHIS_SITE_KEY_HEADER, PHIS_TOKEN_HEADER } from "../constants/http-headers";

const DEFAULT_API_BASE_URL = "";

/** The `User-Agent` this package's gateway requests identify themselves with. */
export const PHIS_UI_USER_AGENT = "phis-ui/1.0" as const;

export type ApiHeaderOptions = {
  token?: string;
  publishableApiKey?: string;
  siteKey?: string;
  locale?: string;
  includeToken?: boolean;
  includePublishable?: boolean;
  includeSiteKey?: boolean;
  includeLocale?: boolean;
  /** Adds the gateway block: `Accept: application/json` and the `User-Agent`. */
  gateway?: boolean;
  /** Overrides {@link PHIS_UI_USER_AGENT} for a gateway request. */
  userAgent?: string;
  /** Adds `Content-Type: application/json` for a request with a JSON body. */
  jsonBody?: boolean;
  /** The viewer's `Cookie` header, forwarded only when it is not blank. */
  cookie?: string | null;
  extra?: HeadersInit;
};

export function normalizePath(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  return path.startsWith("/") ? path : `/${path}`;
}

export function buildApiUrl(baseUrl: string | undefined, path: string) {
  const normalizedBase = (baseUrl ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
  const normalizedPath = normalizePath(path);

  if (/^https?:\//.test(normalizedPath) || !normalizedBase) {
    return normalizedPath;
  }

  return `${normalizedBase}${normalizedPath}`;
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
  gateway = false,
  userAgent = PHIS_UI_USER_AGENT,
  jsonBody = false,
  cookie,
  extra = {},
}: ApiHeaderOptions = {}) {
  const headers = new Headers(extra);

  if (gateway) {
    headers.set("Accept", "application/json");
    headers.set("User-Agent", userAgent);
  }

  if (jsonBody) {
    headers.set("Content-Type", "application/json");
  }

  if (cookie?.trim()) {
    headers.set("Cookie", cookie.trim());
  }

  if (includeToken && token) {
    headers.set(PHIS_TOKEN_HEADER, token);
  }

  if (includePublishable && publishableApiKey) {
    headers.set("x-publishable-api-key", publishableApiKey);
  }

  if (includeSiteKey && siteKey) {
    headers.set(PHIS_SITE_KEY_HEADER, siteKey);
  }

  if (includeLocale && locale) {
    headers.set("x-locale", locale);
  }

  return headers;
}
