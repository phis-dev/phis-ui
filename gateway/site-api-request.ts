import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";
import { throwPhiCmsGatewayError } from "./errors";

export type PhiSiteApiRequest = {
  /** The caller's name, for the sentence a missing credential gets: "Missing apiBaseUrl for getExactSiteArea." */
  context: string;
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  /** The Core path, `/api/v1/...`. */
  path: string;
  searchParams?: URLSearchParams | Record<string, string>;
  /** Sent as the locale header when given. */
  locale?: string | null;
  /** The viewer's cookies, where the answer depends on who asks. */
  cookieHeader?: string | null;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** A JSON body; sets the content type with it. */
  body?: unknown;
  /** The sentence a refusal gets, without the status: "Failed to fetch exact CMS area". */
  failure: string;
  /** Whether `404` is an answer (`null`) rather than a refusal. Default: a refusal. */
  notFoundIsNull?: boolean;
  /** A caller that names itself to Core differently from the Site UI (the sitemap). */
  userAgent?: string;
};

/**
 * One request to Core on the Site's behalf, as every Gateway reader makes it.
 *
 * Eighteen Gateway files carried this hull word for word: the three credential checks, the URL with its
 * query, the headers with token, Site key and locale, `no-store`, `404` as "none" where that is an
 * answer, and the Gateway error for every other refusal. Only the payload reading is each reader's own,
 * and that stays with it -- what Core answers is the caller's contract, how it is asked is this one's.
 */
export async function fetchPhiSiteApi<T>({
  context,
  apiBaseUrl,
  internalToken,
  siteKey,
  path,
  searchParams,
  locale,
  cookieHeader,
  method,
  body,
  failure,
  notFoundIsNull = false,
  userAgent,
}: PhiSiteApiRequest): Promise<T | null> {
  if (!apiBaseUrl.trim()) {
    throw new Error(`Missing apiBaseUrl for ${context}.`);
  }
  if (!internalToken.trim()) {
    throw new Error(`Missing internalToken for ${context}.`);
  }
  if (!siteKey.trim()) {
    throw new Error(`Missing siteKey for ${context}.`);
  }

  const url = new URL(buildApiUrl(apiBaseUrl, path));
  for (const [key, value] of new URLSearchParams(searchParams)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    ...(method ? { method } : {}),
    headers: buildApiHeaders({
      token: internalToken,
      siteKey,
      ...(locale ? { locale, includeLocale: true } : {}),
      includeToken: true,
      includeSiteKey: true,
      gateway: true,
      cookie: cookieHeader,
      jsonBody: body !== undefined,
      ...(userAgent ? { userAgent } : {}),
    }),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });

  if (response.status === 404 && notFoundIsNull) {
    return null;
  }
  if (!response.ok) {
    throwPhiCmsGatewayError(`${failure} (${response.status}).`, response.status);
  }
  return (await response.json()) as T;
}
