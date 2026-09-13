import { cache } from "react";
import "server-only";

import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";
import type { PhiCmsReviewParams } from "../server-helpers/cms-review";
import type { PhiResolvedCmsAreaPresetPayload } from "../types/cms";
import { throwPhiCmsGatewayError } from "./errors";
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
  if (!apiBaseUrl.trim()) {
    throw new Error("Missing apiBaseUrl for getExactSiteArea.");
  }
  if (!internalToken.trim()) {
    throw new Error("Missing internalToken for getExactSiteArea.");
  }
  if (!siteKey.trim()) {
    throw new Error("Missing siteKey for getExactSiteArea.");
  }

  const url = new URL(buildApiUrl(apiBaseUrl, "/api/v1/site/area"));
  url.searchParams.set("path", path);
  url.searchParams.set("ownerModuleId", sourcePreset.ownerModuleId);
  url.searchParams.set("presetKey", sourcePreset.presetKey);
  if (Number.isInteger(revision) && (revision as number) > 0) {
    url.searchParams.set("revision", String(revision));
  }
  if (review?.kind === "area") {
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
    throwPhiCmsGatewayError(`Failed to fetch exact CMS area (${response.status}).`, response.status);
  }

  const payload = (await response.json()) as PhiResolvedCmsAreaPresetPayload | null;
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
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
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
  const url = new URL(buildApiUrl(apiBaseUrl, "/api/v1/site/area"));
  url.searchParams.set("path", "/");
  url.searchParams.set("ownerModuleId", sourcePreset.ownerModuleId);
  url.searchParams.set("presetKey", sourcePreset.presetKey);
  url.searchParams.set("include", "publishedPages");

  const response = await fetch(url.toString(), {
    headers: buildApiHeaders({
      token: internalToken,
      siteKey,
      locale,
      includeToken: true,
      includeSiteKey: true,
      includeLocale: true,
      extra: { Accept: "application/json", "User-Agent": "phis-ui-sitemap/1.0" },
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throwPhiCmsGatewayError(`Failed to fetch the Public Area with its Pages (${response.status}).`, response.status);
  }

  const payload = (await response.json().catch(() => null)) as
    (Partial<PhiResolvedCmsAreaPresetPayload> & { preset?: unknown; publishedPages?: unknown }) | null;
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
  if (!apiBaseUrl.trim()) {
    throw new Error("Missing apiBaseUrl for getCurrentSiteAreaDraft.");
  }
  if (!internalToken.trim()) {
    throw new Error("Missing internalToken for getCurrentSiteAreaDraft.");
  }
  if (!siteKey.trim()) {
    throw new Error("Missing siteKey for getCurrentSiteAreaDraft.");
  }

  const url = new URL(buildApiUrl(apiBaseUrl, "/api/site/cms/area/draft"));
  url.searchParams.set("area", area?.trim() ? area.trim() : path === "/" ? "public" : path.replace(/^\//, ""));
  url.searchParams.set("ownerModuleId", sourcePreset.ownerModuleId);
  url.searchParams.set("presetKey", sourcePreset.presetKey);

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
    throwPhiCmsGatewayError(`Failed to fetch current CMS area draft (${response.status}).`, response.status);
  }

  const payload = (await response.json()) as PhiResolvedCmsAreaPresetPayload | null;
  if (!payload?.preset?.preset) {
    throw new Error("Missing CMS area draft payload.");
  }

  return payload;
});
