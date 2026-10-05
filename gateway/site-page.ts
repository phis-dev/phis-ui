import { isPhiRecord } from "../helpers/is-record";
import { cache } from "react";
import "server-only";

import type { PhiCmsReviewParams } from "../server-helpers/cms-review";
import type { PhiResolvedCmsPagePayload } from "../types/cms";
import { fetchPhiSiteApi } from "./site-api-request";
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
  const searchParams = new URLSearchParams({ path });
  if (sourcePreset) {
    searchParams.set("ownerModuleId", sourcePreset.ownerModuleId);
    searchParams.set("presetKey", sourcePreset.presetKey);
  }
  if (Number.isInteger(revision) && (revision as number) > 0) {
    searchParams.set("revision", String(revision));
  }
  if (review?.kind === "page") {
    searchParams.set("reviewKind", review.kind);
    searchParams.set("reviewRevision", String(review.revisionId));
  }
  const payload = await fetchPhiSiteApi<PhiResolvedCmsPagePayload | null>({
    context: "getResolvedCmsPage",
    apiBaseUrl,
    internalToken,
    siteKey,
    path: "/api/v1/site/page",
    searchParams,
    locale,
    cookieHeader,
    failure: "Failed to fetch resolved CMS page",
    notFoundIsNull: true,
  });
  if (payload === null) {
    return null;
  }
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
  const searchParams = new URLSearchParams();
  if (sourcePreset) {
    searchParams.set("ownerModuleId", sourcePreset.ownerModuleId);
    searchParams.set("presetKey", sourcePreset.presetKey);
  } else {
    searchParams.set("path", path);
  }
  if (area?.trim()) {
    searchParams.set("area", area.trim());
  }
  const payload = await fetchPhiSiteApi<PhiResolvedCmsPagePayload | null>({
    context: "getCurrentCmsPageDraft",
    apiBaseUrl,
    internalToken,
    siteKey,
    path: "/api/site/cms/page/draft",
    searchParams,
    locale,
    cookieHeader,
    failure: "Failed to fetch current CMS page draft",
    notFoundIsNull: true,
  });
  if (payload === null) {
    return null;
  }
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
  if (!area.trim()) throw new Error("Missing area for getSiteCmsPageCatalog.");

  const payload = await fetchPhiSiteApi<{ pages?: unknown } | null>({
    context: "getSiteCmsPageCatalog",
    apiBaseUrl,
    internalToken,
    siteKey,
    path: "/api/site/cms/pages",
    searchParams: { area },
    locale,
    cookieHeader,
    failure: "Failed to fetch CMS Page catalog",
  });
  if (!Array.isArray(payload?.pages)) return [];
  return payload.pages.map((entry) => {
    if (!isPhiRecord(entry)) {
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
