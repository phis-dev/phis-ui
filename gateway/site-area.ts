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
        "User-Agent": "phi-shared-ui/1.0",
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
        "User-Agent": "phi-shared-ui/1.0",
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
