import { cache } from "react";
import "server-only";

import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";
import type { PhiCmsReviewParams } from "../server-helpers/cms-review";
import type { PhiResolvedCmsPagePayload } from "../types/cms";
import { throwPhiCmsGatewayError } from "./errors";
import type { PhiCmsPresetIdentity } from "../types/cms-module-descriptors";
import type { PhiPageReference } from "../types/references";

export type PhiSiteCmsPageCatalogEntry = {
  id: number;
  reference: PhiPageReference;
  path: string | null;
  ownerModuleId?: string | null;
  presetKey?: string | null;
  tombstoned: boolean;
  publishedRevisionId?: number | null;
  workingDraftRevisionId?: number | null;
};

export type GetResolvedCmsPageOptions = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  path: string;
  locale?: string;
  revision?: number | null;
  review?: PhiCmsReviewParams | null;
  cookieHeader?: string | null;
  sourcePreset?: PhiCmsPresetIdentity | null;
};

export const getResolvedCmsPage = cache(async function getResolvedCmsPage({
  apiBaseUrl,
  internalToken,
  siteKey,
  path,
  locale,
  revision,
  review,
  cookieHeader,
  sourcePreset,
}: GetResolvedCmsPageOptions): Promise<PhiResolvedCmsPagePayload | null> {
  if (!apiBaseUrl.trim()) {
    throw new Error("Missing apiBaseUrl for getResolvedCmsPage.");
  }
  if (!internalToken.trim()) {
    throw new Error("Missing internalToken for getResolvedCmsPage.");
  }
  if (!siteKey.trim()) {
    throw new Error("Missing siteKey for getResolvedCmsPage.");
  }

  const url = new URL(buildApiUrl(apiBaseUrl, "/api/v1/site/page"));
  url.searchParams.set("path", path);
  if (sourcePreset) {
    url.searchParams.set("ownerModuleId", sourcePreset.ownerModuleId);
    url.searchParams.set("presetKey", sourcePreset.presetKey);
  }
  if (Number.isInteger(revision) && (revision as number) > 0) {
    url.searchParams.set("revision", String(revision));
  }
  if (review?.kind === "page") {
    url.searchParams.set("reviewKind", review.kind);
    url.searchParams.set("reviewRevision", String(review.revisionId));
  }

  const response = await fetch(url.toString(), {
    headers: buildApiHeaders({
      token: internalToken,
      siteKey,
      locale,
      includeToken: true,
      includeSiteKey: true,
      includeLocale: true,
      extra: {
        Accept: "application/json",
        "User-Agent": "phis-ui/1.0",
        ...(cookieHeader?.trim() ? { Cookie: cookieHeader } : {}),
      },
    }),
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throwPhiCmsGatewayError(`Failed to fetch resolved CMS page (${response.status}).`, response.status);
  }

  const payload = (await response.json()) as PhiResolvedCmsPagePayload | null;
  if (!payload?.page?.page) {
    throw new Error("Missing CMS page payload.");
  }

  return payload;
});

export const getCurrentCmsPageDraft = cache(async function getCurrentCmsPageDraft({
  apiBaseUrl,
  internalToken,
  siteKey,
  area,
  path,
  locale,
  cookieHeader,
  sourcePreset,
}: Omit<GetResolvedCmsPageOptions, "revision"> & { area?: string }): Promise<PhiResolvedCmsPagePayload | null> {
  if (!apiBaseUrl.trim()) {
    throw new Error("Missing apiBaseUrl for getCurrentCmsPageDraft.");
  }
  if (!internalToken.trim()) {
    throw new Error("Missing internalToken for getCurrentCmsPageDraft.");
  }
  if (!siteKey.trim()) {
    throw new Error("Missing siteKey for getCurrentCmsPageDraft.");
  }

  const url = new URL(buildApiUrl(apiBaseUrl, "/api/site/cms/page/draft"));
  if (sourcePreset) {
    url.searchParams.set("ownerModuleId", sourcePreset.ownerModuleId);
    url.searchParams.set("presetKey", sourcePreset.presetKey);
  } else {
    url.searchParams.set("path", path);
  }
  if (area?.trim()) {
    url.searchParams.set("area", area.trim());
  }

  const response = await fetch(url.toString(), {
    headers: buildApiHeaders({
      token: internalToken,
      siteKey,
      locale,
      includeToken: true,
      includeSiteKey: true,
      includeLocale: true,
      extra: {
        Accept: "application/json",
        "User-Agent": "phis-ui/1.0",
        ...(cookieHeader?.trim() ? { Cookie: cookieHeader } : {}),
      },
    }),
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throwPhiCmsGatewayError(`Failed to fetch current CMS page draft (${response.status}).`, response.status);
  }

  const payload = (await response.json()) as PhiResolvedCmsPagePayload | null;
  if (!payload?.page?.page) {
    throw new Error("Missing CMS page draft payload.");
  }

  return payload;
});

export const getSiteCmsPageCatalog = cache(async function getSiteCmsPageCatalog({
  apiBaseUrl,
  internalToken,
  siteKey,
  area,
  locale,
  cookieHeader,
}: {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  area: string;
  locale?: string;
  cookieHeader?: string | null;
}): Promise<PhiSiteCmsPageCatalogEntry[]> {
  if (!apiBaseUrl.trim()) throw new Error("Missing apiBaseUrl for getSiteCmsPageCatalog.");
  if (!internalToken.trim()) throw new Error("Missing internalToken for getSiteCmsPageCatalog.");
  if (!siteKey.trim()) throw new Error("Missing siteKey for getSiteCmsPageCatalog.");
  if (!area.trim()) throw new Error("Missing area for getSiteCmsPageCatalog.");

  const url = new URL(buildApiUrl(apiBaseUrl, "/api/site/cms/pages"));
  url.searchParams.set("area", area);
  const response = await fetch(url.toString(), {
    headers: buildApiHeaders({
      token: internalToken,
      siteKey,
      locale,
      includeToken: true,
      includeSiteKey: true,
      includeLocale: true,
      extra: {
        Accept: "application/json",
        "User-Agent": "phis-ui/1.0",
        ...(cookieHeader?.trim() ? { Cookie: cookieHeader } : {}),
      },
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throwPhiCmsGatewayError(`Failed to fetch CMS Page catalog (${response.status}).`, response.status);
  }
  const payload = (await response.json().catch(() => null)) as { pages?: unknown } | null;
  if (!Array.isArray(payload?.pages)) return [];
  return payload.pages.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("CMS Page catalog contains an invalid entry.");
    }
    const page = entry as Record<string, unknown>;
    if (
      !Number.isSafeInteger(page.id) || (page.id as number) <= 0 ||
      typeof page.reference !== "string" ||
      (page.path !== null && typeof page.path !== "string") ||
      typeof page.tombstoned !== "boolean"
    ) {
      throw new Error("CMS Page catalog entry is missing stable Page identity metadata.");
    }
    return page as PhiSiteCmsPageCatalogEntry;
  });
});
