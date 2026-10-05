import "server-only";

import { isPhiRecord } from "../helpers/is-record";
import type { PhiSiteNewsEntry } from "../types/news";
import { fetchPhiSiteApi } from "./site-api-request";

export type FetchPhiSiteNewsOptions = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  /** The language the page is being drawn in; Core resolves each entry's text for it. */
  locale: string;
  /**
   * How many entries the caller will show, newest first. Core cuts the list there before it translates,
   * so a Site with years of News does not pay for translating all of them to draw ten.
   */
  limit: number;
};

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readNewsEntry(value: unknown): PhiSiteNewsEntry | null {
  if (!isPhiRecord(value)) {
    return null;
  }

  const title = readString(value.title).trim();
  const created = readString(value.created).trim();
  // An entry without a title or a date has nothing to show and nothing to sort by. Dropped rather than
  // rendered as a gap, and dropped alone rather than taking the rest of the list with it.
  if (!title || !created) {
    return null;
  }

  return {
    id: readString(value.id) || readString(value.slug),
    slug: readString(value.slug),
    created,
    outdated: readString(value.outdated) || null,
    title,
    subtitle: readString(value.subtitle),
    content: readString(value.content),
    link: readString(value.link) || null,
    tags: Array.isArray(value.tags)
      ? value.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim() !== "")
      : [],
    sourceLocale: readString(value.sourceLocale).trim() || null,
    // Absent means yes, which is the default everywhere this switch appears.
    translate: value.translate !== false,
  };
}

/**
 * The Site's published News, read while the page is being rendered.
 *
 * A gateway read rather than a browser one, which `design/NEWS.md` §4 asks for and the endpoint enforces
 * anyway: it wants the internal token, which a browser must never hold. It also means an entry that has
 * expired is absent from the HTML instead of appearing and then vanishing.
 *
 * `no-store` is right here despite the page being cached: on a Public page this fetch runs inside the
 * static render, which is itself kept and renewed at most once a minute
 * ([STATIC_RENDERING.md](../STATIC_RENDERING.md)). A second cache underneath it would only add a second
 * age to reason about.
 */
export async function fetchPhiSiteNews(options: FetchPhiSiteNewsOptions): Promise<PhiSiteNewsEntry[]> {
  if (!Number.isInteger(options.limit) || options.limit <= 0) {
    throw new Error("fetchPhiSiteNews needs a positive integer limit.");
  }
  const payload = await fetchPhiSiteApi<unknown>({
    context: "fetchPhiSiteNews",
    apiBaseUrl: options.apiBaseUrl,
    internalToken: options.internalToken,
    siteKey: options.siteKey,
    path: "/api/v1/news",
    searchParams: { limit: String(options.limit) },
    locale: options.locale,
    failure: "News fetch failed",
    userAgent: "phis-ui-news/1.0",
  });
  if (!isPhiRecord(payload) || !Array.isArray(payload.news)) {
    throw new Error("News answered without a list.");
  }

  return payload.news
    .map((entry) => readNewsEntry(entry))
    .filter((entry): entry is PhiSiteNewsEntry => entry !== null);
}
