import "server-only";

import {
  PHI_SEARCH_QUERY_PARAM,
  type PhiSearchDocument,
  type PhiSearchHit,
  type PhiSearchIndexState,
  type PhiSearchIndexWriteResult,
  type PhiSearchResponse,
} from "@phis/contracts/search";

import { isPhiRecord } from "../helpers/is-record";
import type { PhiCmsAreaKey } from "../constants/cms-areas";
import { fetchPhiSiteApi } from "./site-api-request";

type PhiSiteSearchCredentials = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
};

export type FetchPhiSiteSearchOptions = PhiSiteSearchCredentials & {
  /** The query as `readPhiSearchQuery` read it. */
  query: string;
  locale: string;
  /** The Areas this visitor may search; the Widget decided from where it stands. */
  areas: readonly PhiCmsAreaKey[];
  limit: number;
};

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readHit(value: unknown): PhiSearchHit | null {
  if (!isPhiRecord(value)) return null;
  const path = readString(value.path);
  if (!path) return null;
  return {
    path,
    areaMask: typeof value.areaMask === "number" ? value.areaMask : 1,
    title: readString(value.title),
    description: readString(value.description),
    snippet: Array.isArray(value.snippet)
      ? value.snippet.flatMap((segment) =>
          isPhiRecord(segment) && typeof segment.text === "string"
            ? [{ text: segment.text, match: segment.match === true }]
            : [])
      : [],
    rank: typeof value.rank === "number" ? value.rank : 0,
  };
}

/**
 * The Pages matching a visitor's query, read while the results Page is drawn (SEARCH.md).
 *
 * A Gateway read with the internal token: Core answers only the Site, and the Site has already decided
 * which Areas this visitor may search. The request carries a query, so the Page is never static and
 * every visitor gets their own answer.
 */
export async function fetchPhiSiteSearch(options: FetchPhiSiteSearchOptions): Promise<PhiSearchResponse> {
  const payload = await fetchPhiSiteApi<unknown>({
    context: "fetchPhiSiteSearch",
    apiBaseUrl: options.apiBaseUrl,
    internalToken: options.internalToken,
    siteKey: options.siteKey,
    path: "/api/v1/site/search",
    searchParams: {
      [PHI_SEARCH_QUERY_PARAM]: options.query,
      areas: options.areas.join(","),
      limit: String(options.limit),
    },
    locale: options.locale,
    failure: "Search failed",
    userAgent: "phis-ui-search/1.0",
  });
  if (!isPhiRecord(payload) || !Array.isArray(payload.hits)) {
    throw new Error("Search answered without a list.");
  }
  return {
    query: readString(payload.query),
    locale: readString(payload.locale) || options.locale,
    areaMask: typeof payload.areaMask === "number" ? payload.areaMask : 0,
    hits: payload.hits.map(readHit).filter((hit): hit is PhiSearchHit => hit !== null),
    total: typeof payload.total === "number" ? payload.total : 0,
  };
}

function readState(value: unknown): PhiSearchIndexState | null {
  if (!isPhiRecord(value)) return null;
  if (typeof value.areaMask !== "number" || typeof value.locale !== "string" || typeof value.fingerprint !== "string") {
    return null;
  }
  return {
    areaMask: value.areaMask,
    locale: value.locale,
    fingerprint: value.fingerprint,
    documentCount: typeof value.documentCount === "number" ? value.documentCount : 0,
    indexedAt: readString(value.indexedAt),
  };
}

/** The sets Core holds of this Site, so the indexer writes only the ones that are behind. */
export async function fetchPhiSiteSearchIndexStates(credentials: PhiSiteSearchCredentials): Promise<PhiSearchIndexState[]> {
  const payload = await fetchPhiSiteApi<unknown>({
    context: "fetchPhiSiteSearchIndexStates",
    ...credentials,
    path: "/api/v1/site/search/index",
    failure: "Search index states fetch failed",
    userAgent: "phis-ui-search-index/1.0",
  });
  if (!isPhiRecord(payload) || !Array.isArray(payload.sets)) {
    throw new Error("The search index answered without its sets.");
  }
  return payload.sets.map(readState).filter((state): state is PhiSearchIndexState => state !== null);
}

export type PutPhiSiteSearchIndexSetOptions = PhiSiteSearchCredentials & {
  area: PhiCmsAreaKey;
  locale: string;
  fingerprint: string;
  documents: readonly PhiSearchDocument[];
};

/** One set, replacing what Core held of that Area and language. */
export async function putPhiSiteSearchIndexSet(
  options: PutPhiSiteSearchIndexSetOptions,
): Promise<PhiSearchIndexWriteResult & { dropped: number }> {
  const payload = await fetchPhiSiteApi<unknown>({
    context: "putPhiSiteSearchIndexSet",
    apiBaseUrl: options.apiBaseUrl,
    internalToken: options.internalToken,
    siteKey: options.siteKey,
    path: "/api/v1/site/search/index",
    method: "PUT",
    body: {
      area: options.area,
      locale: options.locale,
      fingerprint: options.fingerprint,
      documents: options.documents,
    },
    failure: `Search index write failed (${options.area}, ${options.locale})`,
    userAgent: "phis-ui-search-index/1.0",
  });
  const state = isPhiRecord(payload) ? readState(payload.state) : null;
  if (!isPhiRecord(payload) || !state) {
    throw new Error("The search index write answered without its state.");
  }
  return {
    accepted: payload.accepted === true,
    state,
    dropped: typeof payload.dropped === "number" ? payload.dropped : 0,
  };
}
