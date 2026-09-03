import "server-only";

import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";
import type { PhiCmsReviewParams } from "../server-helpers/cms-review";
import type { PhiCmsNavigationOverlay } from "../types/cms-module-descriptors";
import { getSiteNavigationCacheTag } from "./cache-tags";

export type FetchSiteNavOptions = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  navKey: string;
  locale?: string;
  revision?: number | null;
  review?: PhiCmsReviewParams | null;
};

export type PhiSiteNavigationScope = {
  key: string;
  label: string | null;
  hasPublishedRevision: boolean;
  hasWorkingDraftRevision: boolean;
};

export async function fetchSiteNavigationScopes({
  apiBaseUrl,
  internalToken,
  siteKey,
}: Pick<FetchSiteNavOptions, "apiBaseUrl" | "internalToken" | "siteKey">): Promise<PhiSiteNavigationScope[]> {
  const response = await fetch(
    buildApiUrl(apiBaseUrl, "/api/v1/site/nav/scopes"),
    {
      headers: buildApiHeaders({
        token: internalToken,
        siteKey,
        includeToken: true,
        includeSiteKey: true,
        extra: {
          Accept: "application/json",
          "User-Agent": "phis-ui/1.0",
        },
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch site navigation scopes (${response.status}).`);
  }
  const payload = (await response.json()) as { scopes?: unknown };
  if (!Array.isArray(payload.scopes)) {
    throw new Error("Missing site navigation scopes payload.");
  }
  return payload.scopes.flatMap((scope) => {
    if (!scope || typeof scope !== "object" || Array.isArray(scope)) {
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
}: FetchSiteNavOptions): Promise<PhiCmsNavigationOverlay | null> {
  if (!apiBaseUrl.trim()) {
    throw new Error("Missing apiBaseUrl for fetchSiteNavigationOverlay.");
  }
  if (!internalToken.trim()) {
    throw new Error("Missing internalToken for fetchSiteNavigationOverlay.");
  }
  if (!siteKey.trim()) {
    throw new Error("Missing siteKey for fetchSiteNavigationOverlay.");
  }
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

  const useDevNoStore = process.env.NODE_ENV === "development";
  const response = await fetch(
    buildApiUrl(apiBaseUrl, `/api/v1/site/nav?${search.toString()}`),
    {
      headers: buildApiHeaders({
        token: internalToken,
        siteKey,
        includeToken: true,
        includeSiteKey: true,
        extra: {
          Accept: "application/json",
          "User-Agent": "phis-ui/1.0",
        },
      }),
      cache: useDevNoStore ? "no-store" : "force-cache",
      ...(useDevNoStore
        ? {}
        : {
            next: {
              tags: [getSiteNavigationCacheTag(siteKey, locale)],
            },
          }),
    } as RequestInit & { next?: { tags: string[] } },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch site nav (${response.status}).`);
  }

  const payload = (await response.json()) as { overlay?: PhiCmsNavigationOverlay };
  if (!payload.overlay || typeof payload.overlay !== "object") {
    throw new Error("Missing site navigation overlay payload.");
  }
  return payload.overlay;
}
