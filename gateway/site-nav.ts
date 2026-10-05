import { isPhiRecord } from "../helpers/is-record";
import "server-only";

import { fetchPhiSiteApi } from "./site-api-request";
import type { PhiCmsReviewParams } from "../server-helpers/cms-review";
import type { PhiCmsNavigationOverlay } from "../types/cms-module-descriptors";
import { readPhiSiteReadCache } from "./site-read-cache";

export type FetchSiteNavOptions = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  navKey: string;
  locale?: string;
  revision?: number | null;
  review?: PhiCmsReviewParams | null;
  /** The visitor's cookies. Core serves a revision only to a session that may preview, so a draft read carries them. */
  cookieHeader?: string;
};

export type PhiSiteNavigationScope = {
  key: string;
  label: string | null;
  hasPublishedRevision: boolean;
  hasWorkingDraftRevision: boolean;
};

/**
 * Where a folder address of an Area leads on the live Site, as a Page reference, or null when it leads
 * nowhere. Asked only for a path no Page answers, and never cached: a publish must reach every Site
 * process at once, and a cache tag would reach only the one that saw it.
 */
export async function fetchSiteNavigationFolderTarget({
  apiBaseUrl,
  internalToken,
  siteKey,
  area,
  path,
}: Pick<FetchSiteNavOptions, "apiBaseUrl" | "internalToken" | "siteKey"> & {
  area: string;
  path: string;
}): Promise<string | null> {
  const payload = await fetchPhiSiteApi<{ reference?: unknown }>({
    context: "fetchSiteNavigationFolderTarget",
    apiBaseUrl,
    internalToken,
    siteKey,
    path: "/api/v1/site/nav/folder",
    searchParams: { area, path },
    failure: "Failed to resolve folder address",
    notFoundIsNull: true,
  });
  if (payload === null) {
    return null;
  }
  return typeof payload.reference === "string" ? payload.reference : null;
}

export async function fetchSiteNavigationScopes({
  apiBaseUrl,
  internalToken,
  siteKey,
}: Pick<FetchSiteNavOptions, "apiBaseUrl" | "internalToken" | "siteKey">): Promise<PhiSiteNavigationScope[]> {
  const payload = await fetchPhiSiteApi<{ scopes?: unknown }>({
    context: "fetchSiteNavigationScopes",
    apiBaseUrl,
    internalToken,
    siteKey,
    path: "/api/v1/site/nav/scopes",
    failure: "Failed to fetch site navigation scopes",
  });
  if (!Array.isArray(payload?.scopes)) {
    throw new Error("Missing site navigation scopes payload.");
  }
  return payload.scopes.flatMap((scope) => {
    if (!isPhiRecord(scope)) {
      return [];
    }
    const record = scope as Record<string, unknown>;
    if (typeof record.key !== "string") {
      return [];
    }
    return [{
      key: record.key,
      label: typeof record.label === "string" ? record.label : null,
      hasPublishedRevision: record.hasPublishedRevision === true,
      hasWorkingDraftRevision: record.hasWorkingDraftRevision === true,
    }];
  });
}

export async function fetchSiteNavigationOverlay({
  apiBaseUrl,
  internalToken,
  siteKey,
  navKey,
  locale,
  revision,
  review,
  cookieHeader,
}: FetchSiteNavOptions): Promise<PhiCmsNavigationOverlay | null> {
  if (!navKey.trim()) {
    throw new Error("Missing navKey for fetchSiteNavigationOverlay.");
  }

  const search = new URLSearchParams({ key: navKey });
  if (locale?.trim()) {
    search.set("locale", locale.trim().toLowerCase());
  }
  if (Number.isInteger(revision) && (revision as number) > 0) {
    search.set("revision", String(revision));
  }
  if (
    review?.kind === "navigation" &&
    (!review.navKey || review.navKey.toLowerCase() === navKey.trim().toLowerCase())
  ) {
    search.set("reviewKind", review.kind);
    search.set("reviewRevision", String(review.revisionId));
  }

  // A revision or a review asks for a draft the author is looking at, never what visitors get.
  const readsDraft = search.has("revision") || search.has("reviewKind");
  const load = () =>
    fetchNavigationOverlay(apiBaseUrl, internalToken, siteKey, search, readsDraft ? cookieHeader : undefined);
  if (process.env.NODE_ENV === "development" || readsDraft) {
    return load();
  }
  return readPhiSiteReadCache(`site-nav:${siteKey.trim().toLowerCase()}:${search.toString()}`, load);
}

async function fetchNavigationOverlay(
  apiBaseUrl: string,
  internalToken: string,
  siteKey: string,
  search: URLSearchParams,
  cookieHeader: string | undefined,
): Promise<PhiCmsNavigationOverlay | null> {
  const payload = await fetchPhiSiteApi<{ overlay?: PhiCmsNavigationOverlay }>({
    context: "fetchSiteNavigationOverlay",
    apiBaseUrl,
    internalToken,
    siteKey,
    path: "/api/v1/site/nav",
    searchParams: search,
    cookieHeader,
    failure: "Failed to fetch site nav",
    notFoundIsNull: true,
  });
  if (payload === null) {
    return null;
  }
  if (!payload.overlay || typeof payload.overlay !== "object") {
    throw new Error("Missing site navigation overlay payload.");
  }
  return payload.overlay;
}
