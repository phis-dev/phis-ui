import "server-only";

import { isPhiRecord } from "../helpers/is-record";
import { readPhiLinkTarget } from "../types/references";
import type { PhiContentEntryKind } from "../constants/content-entry-kinds";
import type {
  PhiSiteContentEntry,
  PhiSiteContentEntryAuthor,
  PhiSiteContentEntryPage,
  PhiSiteContentEntryTerm,
} from "../types/content-entries";
import { definePhiRequestMemo } from "../server-helpers/request-memo";
import { fetchPhiSiteApi } from "./site-api-request";

type FetchPhiSiteContentEntryBase = {
  kind: PhiContentEntryKind;
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  /** The language the page is being drawn in; Core resolves each entry's text for it. */
  locale: string;
};

export type FetchPhiSiteContentEntriesOptions = FetchPhiSiteContentEntryBase & {
  /**
   * How many entries the caller will show, newest first. Core cuts the list there before it translates,
   * so a Site with years of entries does not pay for translating all of them to draw ten.
   */
  limit: number;
};

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readTerm(value: unknown): PhiSiteContentEntryTerm | null {
  if (!isPhiRecord(value)) return null;
  const slug = readString(value.slug).trim();
  const label = readString(value.label).trim();
  return slug && label ? { slug, label } : null;
}

function readAuthor(value: unknown): PhiSiteContentEntryAuthor | null {
  if (!isPhiRecord(value)) return null;
  const name = readString(value.name).trim();
  if (!name) return null;
  const url = isPhiRecord(value.avatar) ? readString(value.avatar.url).trim() : "";
  return { name, avatar: url ? { url } : null };
}

function readContentEntry(value: unknown): PhiSiteContentEntry | null {
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
    link: readPhiLinkTarget(value.link),
    category: readTerm(value.category),
    tags: Array.isArray(value.tags)
      ? value.tags.map(readTerm).filter((tag): tag is PhiSiteContentEntryTerm => tag !== null)
      : [],
    author: readAuthor(value.author),
    sourceLocale: readString(value.sourceLocale).trim() || null,
    // Absent means yes, which is the default everywhere this switch appears.
    translate: value.translate !== false,
  };
}

async function fetchEntries(options: FetchPhiSiteContentEntryBase, searchParams: Record<string, string>) {
  const payload = await fetchPhiSiteApi<unknown>({
    context: "fetchPhiSiteContentEntries",
    apiBaseUrl: options.apiBaseUrl,
    internalToken: options.internalToken,
    siteKey: options.siteKey,
    path: `/api/v1/entries/${options.kind}`,
    searchParams,
    locale: options.locale,
    failure: `Entries fetch failed (${options.kind})`,
    userAgent: "phis-ui-entries/1.0",
  });
  if (!isPhiRecord(payload) || !Array.isArray(payload.entries)) {
    throw new Error("Entries answered without a list.");
  }
  return payload.entries
    .map((entry) => readContentEntry(entry))
    .filter((entry): entry is PhiSiteContentEntry => entry !== null);
}

/**
 * One kind's published entries, read while the page is being rendered.
 *
 * A gateway read rather than a browser one, which the endpoint enforces anyway: it wants the internal
 * token, which a browser must never hold. It also means an entry that has expired is absent from the HTML
 * instead of appearing and then vanishing.
 *
 * `no-store` is right here despite the page being cached: on a Public page this fetch runs inside the
 * static render, which is itself kept and renewed at most once a minute
 * ([STATIC_RENDERING.md](../STATIC_RENDERING.md)). A second cache underneath it would only add a second
 * age to reason about.
 */
export async function fetchPhiSiteContentEntries(
  options: FetchPhiSiteContentEntriesOptions,
): Promise<PhiSiteContentEntry[]> {
  if (!Number.isInteger(options.limit) || options.limit <= 0) {
    throw new Error("fetchPhiSiteContentEntries needs a positive integer limit.");
  }
  return fetchEntries(options, { limit: String(options.limit) });
}

type FetchPhiSiteContentEntryPageOptions = FetchPhiSiteContentEntryBase & {
  slug: string;
  /** How many related entries to answer beside it; absent asks for none. Core allows 1 to 12. */
  relatedLimit?: number;
};

/**
 * One published entry by its address and, where asked, the entries closest to it -- everything a detail
 * Page shows, in one question; `null` where the kind has none answering there: never published, expired,
 * or a slug nobody wrote. The detail route answers 404 on `null`.
 *
 * Once per request for the same question (`definePhiRequestMemo`): the detail route's tree reads it for
 * the Page's title and status, and the header, the body and the related list read it again while the page
 * is drawn. All of them ask with the same options, so Core is asked once.
 */
export const fetchPhiSiteContentEntryPage = definePhiRequestMemo(async (
  options: FetchPhiSiteContentEntryPageOptions,
): Promise<PhiSiteContentEntryPage | null> => {
  const slug = options.slug.trim();
  if (!slug) return null;
  const payload = await fetchPhiSiteApi<unknown>({
    context: "fetchPhiSiteContentEntryPage",
    apiBaseUrl: options.apiBaseUrl,
    internalToken: options.internalToken,
    siteKey: options.siteKey,
    path: `/api/v1/entries/${options.kind}/${encodeURIComponent(slug)}`,
    searchParams: options.relatedLimit
      ? { include: "related", relatedLimit: String(options.relatedLimit) }
      : {},
    locale: options.locale,
    failure: `Entry fetch failed (${options.kind})`,
    userAgent: "phis-ui-entries/1.0",
    notFoundIsNull: true,
  });
  if (payload === null) return null;
  if (!isPhiRecord(payload)) {
    throw new Error("The entry answered without a body.");
  }
  const entry = readContentEntry(payload.entry);
  if (!entry) return null;
  return {
    entry,
    related: Array.isArray(payload.related)
      ? payload.related.map(readContentEntry).filter((item): item is PhiSiteContentEntry => item !== null)
      : null,
  };
});

/**
 * How many relatives a detail Page asks for. One number for the whole Page, because every part asks the
 * same question and a part asking for four while another asks for three would be two questions to Core.
 */
export const PHI_CONTENT_ENTRY_RELATED_LIMIT = 3;
