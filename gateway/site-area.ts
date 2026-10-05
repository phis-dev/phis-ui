import { isPhiRecord } from "../helpers/is-record";
import { cache } from "react";
import "server-only";

import type { PhiCmsReviewParams } from "../server-helpers/cms-review";
import type { PhiResolvedCmsAreaPresetPayload } from "../types/cms";
import { fetchPhiSiteApi } from "./site-api-request";
import type { PhiCmsPresetIdentity } from "../types/cms-module-descriptors";

export type GetExactSiteAreaOptions = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  area?: string;
  path: string;
  locale?: string;
  revision?: number | null;
  review?: PhiCmsReviewParams | null;
  cookieHeader?: string | null;
  sourcePreset: PhiCmsPresetIdentity;
};

export const getExactSiteArea = cache(async function getExactSiteArea({
  apiBaseUrl,
  internalToken,
  siteKey,
  path,
  locale,
  revision,
  review,
  cookieHeader,
  sourcePreset,
}: GetExactSiteAreaOptions): Promise<PhiResolvedCmsAreaPresetPayload | null> {
  const searchParams = new URLSearchParams({
    path,
    ownerModuleId: sourcePreset.ownerModuleId,
    presetKey: sourcePreset.presetKey,
  });
  if (Number.isInteger(revision) && (revision as number) > 0) {
    searchParams.set("revision", String(revision));
  }
  if (review?.kind === "area") {
    searchParams.set("reviewKind", review.kind);
    searchParams.set("reviewRevision", String(review.revisionId));
  }
  const payload = await fetchPhiSiteApi<PhiResolvedCmsAreaPresetPayload | null>({
    context: "getExactSiteArea",
    apiBaseUrl,
    internalToken,
    siteKey,
    path: "/api/v1/site/area",
    searchParams,
    locale,
    cookieHeader,
    failure: "Failed to fetch exact CMS area",
    notFoundIsNull: true,
  });
  if (payload === null) {
    return null;
  }
  if (!payload?.preset?.preset) {
    throw new Error("Missing CMS area payload.");
  }

  return payload;
});

export type PhiPublishedPublicPage = {
  path: string | null;
  ownerModuleId: string | null;
  presetKey: string | null;
  revisionId: number;
  publishedAt: string;
};

export type PhiPublicAreaWithPublishedPages = {
  /** Null while the Public Area has never been published; the code-owned preset answers then. */
  area: PhiResolvedCmsAreaPresetPayload | null;
  publishedPages: PhiPublishedPublicPage[];
};

function readPublishedPublicPage(entry: unknown): PhiPublishedPublicPage {
  if (!isPhiRecord(entry)) {
    throw new Error("Invalid published Public Page projection.");
  }
  const value = entry as Record<string, unknown>;
  const isNullableString = (field: unknown) => field === null || typeof field === "string";
  if (
    !isNullableString(value.path) ||
    !isNullableString(value.ownerModuleId) ||
    !isNullableString(value.presetKey) ||
    !Number.isSafeInteger(value.revisionId) ||
    typeof value.publishedAt !== "string"
  ) {
    throw new Error("Invalid published Public Page projection.");
  }
  return {
    path: value.path as string | null,
    ownerModuleId: value.ownerModuleId as string | null,
    presetKey: value.presetKey as string | null,
    revisionId: value.revisionId as number,
    publishedAt: value.publishedAt,
  };
}

/**
 * The published Public Area together with its published Pages, as the sitemap reads them.
 *
 * One request for both: the sitemap needs the Area's `index` and `sitemap` switches and the Pages it
 * may list, and the server adds the second to the first on `include=publishedPages`. The Pages are
 * candidates, not answers -- whether one is listed the caller finds out by resolving it. Live and
 * anonymous only, so no cookie is sent and no draft can be asked for.
 */
export async function getPublicSiteAreaWithPublishedPages({
  apiBaseUrl,
  internalToken,
  siteKey,
  locale,
  sourcePreset,
}: Pick<GetExactSiteAreaOptions, "apiBaseUrl" | "internalToken" | "siteKey" | "locale" | "sourcePreset">):
  Promise<PhiPublicAreaWithPublishedPages> {
  const payload = await fetchPhiSiteApi<
    Partial<PhiResolvedCmsAreaPresetPayload> & { preset?: unknown; publishedPages?: unknown }
  >({
    context: "getPublicSiteAreaWithPublishedPages",
    apiBaseUrl,
    internalToken,
    siteKey,
    path: "/api/v1/site/area",
    searchParams: {
      path: "/",
      ownerModuleId: sourcePreset.ownerModuleId,
      presetKey: sourcePreset.presetKey,
      include: "publishedPages",
    },
    locale,
    failure: "Failed to fetch the Public Area with its Pages",
    userAgent: "phis-ui-sitemap/1.0",
  });
  if (!payload || !Array.isArray(payload.publishedPages)) {
    throw new Error("Missing published Public Page projection.");
  }
  return {
    area: payload.preset ? (payload as PhiResolvedCmsAreaPresetPayload) : null,
    publishedPages: payload.publishedPages.map(readPublishedPublicPage),
  };
}

export const getCurrentSiteAreaDraft = cache(async function getCurrentSiteAreaDraft({
  apiBaseUrl,
  internalToken,
  siteKey,
  area,
  path,
  locale,
  cookieHeader,
  sourcePreset,
}: Omit<GetExactSiteAreaOptions, "revision">): Promise<PhiResolvedCmsAreaPresetPayload | null> {
  const payload = await fetchPhiSiteApi<PhiResolvedCmsAreaPresetPayload | null>({
    context: "getCurrentSiteAreaDraft",
    apiBaseUrl,
    internalToken,
    siteKey,
    path: "/api/site/cms/area/draft",
    searchParams: {
      area: area?.trim() ? area.trim() : path === "/" ? "public" : path.replace(/^\//, ""),
      ownerModuleId: sourcePreset.ownerModuleId,
      presetKey: sourcePreset.presetKey,
    },
    locale,
    cookieHeader,
    failure: "Failed to fetch current CMS area draft",
    notFoundIsNull: true,
  });
  if (payload === null) {
    return null;
  }
  if (!payload?.preset?.preset) {
    throw new Error("Missing CMS area draft payload.");
  }

  return payload;
});
