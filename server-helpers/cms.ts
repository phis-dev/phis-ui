import "server-only";

import { getExactSiteArea } from "../gateway/site-area";
import { getResolvedCmsPage } from "../gateway/site-page";
import { resolvePhiRuntimeConfig } from "../helpers/phis-runtime";
import type { PhiCmsReviewParams } from "./cms-review";
import type { PhiResolvedCmsAreaPresetPayload, PhiResolvedCmsPagePayload } from "../types/cms";
import { maybeGetPhiRequestRuntime } from "./request-runtime";
import type { PhiCmsPresetIdentity } from "../types/cms-module-descriptors";

export type GetPhiCmsPageOptions = {
  path: string;
  apiBaseUrl?: string;
  internalToken?: string;
  siteKey?: string;
  locale?: string;
  revision?: number | null;
  review?: PhiCmsReviewParams | null;
  cookieHeader?: string | null;
  sourcePreset?: PhiCmsPresetIdentity | null;
};

export async function getPhiCmsPage({
  path,
  apiBaseUrl,
  internalToken,
  siteKey,
  locale,
  revision,
  review,
  cookieHeader,
  sourcePreset,
}: GetPhiCmsPageOptions): Promise<PhiResolvedCmsPagePayload | null> {
  const runtime = maybeGetPhiRequestRuntime();
  const resolvedRuntime = resolvePhiRuntimeConfig(
    {
      apiBaseUrl: apiBaseUrl ?? runtime?.phis.apiBaseUrl,
      internalToken: internalToken ?? runtime?.phis.internalToken,
      siteKey: siteKey ?? runtime?.site.key,
    },
    { context: "getPhiCmsPage", requireSiteKey: true },
  );

  return getResolvedCmsPage({
    apiBaseUrl: resolvedRuntime.apiBaseUrl,
    internalToken: resolvedRuntime.internalToken,
    siteKey: resolvedRuntime.siteKey as string,
    path,
    locale: locale ?? runtime?.locale.current,
    revision,
    review,
    cookieHeader,
    sourcePreset,
  });
}

export type GetPhiCmsAreaOptions = GetPhiCmsPageOptions & {
  sourcePreset: PhiCmsPresetIdentity;
};

export async function getPhiExactSiteArea({
  path,
  apiBaseUrl,
  internalToken,
  siteKey,
  locale,
  revision,
  review,
  cookieHeader,
  sourcePreset,
}: GetPhiCmsAreaOptions): Promise<PhiResolvedCmsAreaPresetPayload | null> {
  const runtime = maybeGetPhiRequestRuntime();
  const resolvedRuntime = resolvePhiRuntimeConfig(
    {
      apiBaseUrl: apiBaseUrl ?? runtime?.phis.apiBaseUrl,
      internalToken: internalToken ?? runtime?.phis.internalToken,
      siteKey: siteKey ?? runtime?.site.key,
    },
    { context: "getPhiExactSiteArea", requireSiteKey: true },
  );

  return getExactSiteArea({
    apiBaseUrl: resolvedRuntime.apiBaseUrl,
    internalToken: resolvedRuntime.internalToken,
    siteKey: resolvedRuntime.siteKey as string,
    path,
    locale: locale ?? runtime?.locale.current,
    revision,
    review,
    cookieHeader,
    sourcePreset,
  });
}
